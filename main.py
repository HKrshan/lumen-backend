from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
import uuid
import re
from datetime import datetime, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from agent.loop import research_agent
from agent.scheduler import start_scheduler
from contextlib import asynccontextmanager
from agent.graph import call_llm, get_provider_api_key, get_active_model_and_key

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Supabase client setup
try:
    from supabase import create_client, Client
    from config import SUPABASE_URL, SUPABASE_KEY
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Supabase client initialized")
except Exception as e:
    print(f"⚠ Supabase not configured: {e}")
    supabase = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the heartbeat scheduler on startup
    start_scheduler()
    print("✓ LUMEN backend started — API keys loaded dynamically from Supabase")
    print("✓ Users must configure API keys in Settings → API Keys")
    yield

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS lockdown - update with production URL after deploy
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://your-lumen-dashboard.vercel.app",  # Update after deploy
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

tasks = {}


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input by stripping control characters and enforcing length limits."""
    if not text:
        raise ValueError("Input cannot be empty")
    # Strip control characters (except newlines and tabs)
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', text)
    # Trim whitespace
    text = text.strip()
    # Enforce max length
    if len(text) > max_length:
        raise HTTPException(400, f"Input too long (max {max_length} chars)")
    return text


# Available models per provider
AVAILABLE_MODELS = {
    "openrouter": [
        {"id": "anthropic/claude-sonnet-4-6", "label": "Claude Sonnet 4.6"},
        {"id": "google/gemini-2.5-flash", "label": "Gemini 2.5 Flash"},
        {"id": "google/gemini-2.5-pro", "label": "Gemini 2.5 Pro"},
        {"id": "deepseek/deepseek-chat-v3-0324", "label": "DeepSeek v3"},
        {"id": "qwen/qwen3-235b-a22b", "label": "Qwen3 235B"},
        {"id": "mistralai/mistral-large", "label": "Mistral Large"},
    ],
    "openai": [
        {"id": "gpt-4o", "label": "GPT-4o"},
        {"id": "gpt-4o-mini", "label": "GPT-4o Mini"},
        {"id": "o3-mini", "label": "o3 Mini"},
    ],
    "anthropic": [
        {"id": "claude-opus-4-6", "label": "Claude Opus 4.6"},
        {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6"},
        {"id": "claude-haiku-4-5", "label": "Claude Haiku 4.5"},
    ],
    "gemini": [
        {"id": "gemini-2.5-pro", "label": "Gemini 2.5 Pro"},
        {"id": "gemini-2.5-flash", "label": "Gemini 2.5 Flash"},
    ],
    "groq": [
        {"id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B"},
        {"id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B"},
        {"id": "mixtral-8x7b-32768", "label": "Mixtral 8x7B"},
    ],
    "mistral": [
        {"id": "mistral-large-latest", "label": "Mistral Large"},
        {"id": "mistral-medium-latest", "label": "Mistral Medium"},
        {"id": "codestral-latest", "label": "Codestral"},
    ],
    "minimax": [
        {"id": "abab6.5s-chat", "label": "MiniMax 6.5S"},
        {"id": "abab7-chat-preview", "label": "MiniMax 7"},
    ],
    "nvidia": [
        {"id": "nvidia/llama-3.1-nemotron-ultra-253b-v1", "label": "Nemotron Ultra 253B"},
        {"id": "nvidia/llama-3.3-nemotron-super-49b-v1", "label": "Nemotron Super 49B"},
    ],
}

class ResearchRequest(BaseModel):
    query: str
    model: Optional[str] = "claude-sonnet-4-6"
    depth: Literal['quick', 'deep'] = 'deep'

class TitleUpdateRequest(BaseModel):
    title: str

class ApiKeyRequest(BaseModel):
    provider: str
    api_key: str

async def generate_task_title(query: str) -> str:
    """Generate a short 4-6 word title for a research task using the LLM."""
    try:
        # Get active model and API key for title generation
        active_model, api_key, provider_id = await get_active_model_and_key()
        
        if not api_key:
            # Fallback to truncated query if no API key
            return query[:60]
        
        response = await call_llm(
            prompt=f"Research query: {query}",
            system_prompt="Generate a short 4-6 word title for a research task. Return ONLY the title, no quotes, no punctuation at the end.",
            model=active_model,
            max_tokens=30,
            api_key=api_key,
            provider_id=provider_id
        )
        return response.strip()[:60]
    except Exception as e:
        # Fallback to truncated query if LLM fails
        return query[:60]

async def get_active_api_key(provider: str) -> str | None:
    """Fetch API key from Supabase for a given provider."""
    if not supabase:
        return None
    try:
        result = supabase.table("api_keys").select("api_key").eq("provider", provider).execute()
        if result.data:
            return result.data[0]["api_key"]
    except Exception:
        pass
    return None

@app.post("/research")
@limiter.limit("10/minute")
async def start_research(request: Request, req: ResearchRequest, background_tasks: BackgroundTasks):
    # Sanitize input
    try:
        query = sanitize_input(req.query, max_length=1000)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    task_id = str(uuid.uuid4())

    # Validate API key is configured before starting
    try:
        active_model, api_key, provider_id = await get_active_model_and_key()
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "no_api_key",
                    "message": f"No API key configured for provider '{provider_id}'. Please add your API key in Settings → API Keys.",
                    "provider": provider_id
                }
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Continue anyway if we can't check

    # Generate initial title from query
    initial_title = await generate_task_title(query)

    tasks[task_id] = {
        "id": task_id,
        "query": query,
        "title": initial_title,
        "model": request.model,
        "depth": request.depth,
        "status": "queued",
        "steps": [],
        "sources": [],
        "result": None,
        "report": None,
        "step": None,
        "completed_steps": [],
        "timestamps": {},
        "logs": {},
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    background_tasks.add_task(research_agent, request.query, request.depth, task_id, tasks)
    return {"task_id": task_id, "id": task_id}

@app.get("/tasks")
async def list_tasks():
    return list(tasks.values())

@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.patch("/tasks/{task_id}/title")
async def update_task_title(task_id: str, body: TitleUpdateRequest):
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    title = body.title.strip()[:60]
    if not title:
        raise HTTPException(status_code=400, detail="Title required")

    task["title"] = title
    return {"task_id": task_id, "title": title}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    task = tasks.get(task_id)
    if not task:
        return {"status": "not_found", "steps": [], "result": None}
    return task

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# API Keys Management Endpoints
@app.get("/settings/api-keys")
async def get_api_keys():
    """Return configured API keys with masked values."""
    if not supabase:
        return {"keys": []}
    try:
        result = supabase.table("api_keys").select("provider,api_key,updated_at").execute()
        masked = []
        for row in result.data:
            key = row["api_key"]
            masked.append({
                "provider": row["provider"],
                "masked": f"{'*' * (len(key)-4)}{key[-4:]}" if len(key) > 4 else "****",
                "updated_at": row["updated_at"],
                "configured": True
            })
        return {"keys": masked}
    except Exception:
        return {"keys": []}

@app.post("/settings/api-keys")
@limiter.limit("20/minute")
async def save_api_key(request: Request, req: ApiKeyRequest):
    """Save or update an API key for a provider."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        supabase.table("api_keys").upsert({
            "provider": req.provider,
            "api_key": req.api_key,
            "updated_at": "now()"
        }, on_conflict="provider").execute()
        return {"success": True, "provider": req.provider}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/api-keys/{provider}")
async def delete_api_key(provider: str):
    """Delete an API key for a provider."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        supabase.table("api_keys").delete().eq("provider", provider).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings/models")
async def get_models():
    """Return available models per provider."""
    return {"models": AVAILABLE_MODELS}

@app.post("/settings/active-model")
async def set_active_model(body: dict):
    """Set the active model for research tasks."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    model = body.get("model")
    if not model:
        raise HTTPException(status_code=400, detail="Model required")
    try:
        supabase.table("settings").upsert({"key": "active_model", "value": model}).execute()
        return {"success": True, "model": model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings/active-model")
async def get_active_model():
    """Get the currently active model."""
    if not supabase:
        return {"model": "claude-sonnet-4-6"}
    try:
        result = supabase.table("settings").select("value").eq("key", "active_model").execute()
        if result.data:
            return {"model": result.data[0]["value"]}
        return {"model": "claude-sonnet-4-6"}
    except Exception:
        return {"model": "claude-sonnet-4-6"}
