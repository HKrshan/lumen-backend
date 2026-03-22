import asyncio
import json
import os
import httpx
from typing import Dict, List, TypedDict, Annotated, Any, Union, Tuple
from langgraph.graph import StateGraph, END
from skills.loader import loader
from config import (
    OPENROUTER_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL,
    HTTP_REFERER, X_TITLE
)

# Supabase client setup
try:
    from supabase import create_client, Client
    from config import SUPABASE_URL, SUPABASE_KEY
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    supabase = None

# State Definition
class AgentState(TypedDict):
    query: str
    sub_questions: List[str]
    skill_results: List[Dict[str, Any]]
    context: str
    report: str
    task_id: str
    status: str
    steps: List[str]
    model: str
    error_count: int
    sources: List[Dict[str, Any]]

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

async def get_active_model_and_key() -> Tuple[str, str | None, str]:
    """Get the active model and its API key from settings."""
    # Default values
    active_model = DEFAULT_MODEL
    provider_id = "openrouter"
    api_key = None
    
    if supabase:
        try:
            # Get active model from settings
            model_result = supabase.table("settings").select("value").eq("key", "active_model").execute()
            if model_result.data:
                active_model = model_result.data[0]["value"]
            
            # Determine provider from model id
            if "/" in active_model:
                provider_prefix = active_model.split("/")[0]
            else:
                provider_prefix = "openrouter"
            
            # Map provider prefixes to provider ids
            provider_map = {
                "anthropic": "anthropic",
                "google": "gemini",
                "openai": "openai",
                "groq": "groq",
                "mistralai": "mistral",
                "deepseek": "openrouter",
                "qwen": "openrouter",
                "nvidia": "nvidia",
                "minimax": "minimax",
                "meta-llama": "groq",
            }
            provider_id = provider_map.get(provider_prefix, "openrouter")
            
            # Fetch API key for provider
            api_key = await get_active_api_key(provider_id)
        except Exception:
            pass
    
    return active_model, api_key, provider_id

async def get_provider_api_key(provider_id: str) -> str | None:
    """Get API key for a specific provider."""
    return await get_active_api_key(provider_id)

# LLM Call Helper
async def call_llm(
    prompt: str,
    system_prompt: str,
    model: str,
    max_tokens: int = 400,
    api_key: str = None,
    provider_id: str = "openrouter"
) -> str:
    """Call the LLM via OpenRouter with dynamic API key loading."""
    async with httpx.AsyncClient() as client:
        # Fetch API key if not provided
        if not api_key:
            api_key = await get_active_api_key(provider_id)
        
        if not api_key:
            return f"ERROR: No API key configured for provider '{provider_id}'. Please add your API key in Settings → API Keys."

        # Build headers based on provider
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        # Add OpenRouter-specific headers
        if provider_id == "openrouter":
            headers["HTTP-Referer"] = HTTP_REFERER
            headers["X-Title"] = X_TITLE

        # Build request body
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens
        }

        # Determine endpoint based on provider
        if provider_id == "openrouter":
            url = f"{OPENROUTER_BASE_URL}/chat/completions"
        elif provider_id == "groq":
            url = "https://api.groq.com/openai/v1/chat/completions"
        elif provider_id == "openai":
            url = "https://api.openai.com/v1/chat/completions"
        elif provider_id == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            # Anthropic uses different format
            body = {
                "model": model,
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": prompt}]
            }
        elif provider_id == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            body = {
                "contents": [{
                    "parts": [{"text": f"{system_prompt}\n\n{prompt}"}]
                }],
                "generationConfig": {"maxOutputTokens": max_tokens}
            }
        else:
            # Default to OpenRouter-compatible endpoint
            url = f"{OPENROUTER_BASE_URL}/chat/completions"

        try:
            response = await client.post(url, headers=headers, json=body, timeout=120.0)
            response.raise_for_status()
            result = response.json()
            
            # Extract content based on provider response format
            if provider_id == "gemini":
                return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            elif provider_id == "anthropic":
                return result.get("content", [{}])[0].get("text", "")
            else:
                return result.get("choices", [{}])[0].get("message", {}).get("content", "")
        except httpx.HTTPStatusError as e:
            return f"ERROR: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"ERROR: {str(e)}"

# Nodes
async def planner_node(state: AgentState) -> Dict[str, Any]:
    """Break down the query into sub-questions."""
    state["steps"].append("Planner: Creating research plan...")
    prompt = f"""Break down the following query into 3-6 specific, actionable sub-questions.
    Query: {state['query']}
    Return ONLY a JSON list of strings."""

    current_model = state["model"]
    error_count = state["error_count"]

    try:
        # Get API key for current model
        active_model, api_key, provider_id = await get_active_model_and_key()
        
        response = await call_llm(
            prompt,
            "You are an expert planner. Output ONLY a valid JSON list of strings.",
            current_model,
            api_key=api_key,
            provider_id=provider_id
        )
        
        if response.startswith("ERROR:"):
            raise Exception(response)
        
        start = response.find('[')
        end = response.rfind(']') + 1
        sub_questions = json.loads(response[start:end])
        return {"sub_questions": sub_questions, "steps": state["steps"]}
    except Exception as e:
        if error_count < 1 and FALLBACK_MODEL:
            state["steps"].append(f"Planner: Primary model failed, retrying with fallback...")
            try:
                active_model, api_key, provider_id = await get_active_model_and_key()
                response = await call_llm(
                    prompt,
                    "You are an expert planner. Output ONLY a valid JSON list of strings.",
                    FALLBACK_MODEL,
                    api_key=api_key,
                    provider_id=provider_id
                )
                if response.startswith("ERROR:"):
                    raise Exception(response)
                start = response.find('[')
                end = response.rfind(']') + 1
                sub_questions = json.loads(response[start:end])
                return {"sub_questions": sub_questions, "steps": state["steps"], "model": FALLBACK_MODEL, "error_count": error_count + 1}
            except Exception:
                pass

        state["steps"].append("Planner: Using fallback query as sub-question.")
        return {"sub_questions": [state["query"]], "steps": state["steps"]}

async def skill_router_node(state: AgentState) -> Dict[str, Any]:
    """Route each sub-question to the appropriate skill."""
    state["steps"].append(f"Router: Analyzing {len(state['sub_questions'])} sub-questions...")
    manifest = loader.get_skills_manifest()

    prompt = f"""For each of the following sub-questions, select the most appropriate skill from the list.
    Sub-questions: {json.dumps(state['sub_questions'])}
    {manifest}

    Return ONLY a JSON list of objects: [{{"question": "...", "skill": "...", "args": {{...}}}}]"""

    try:
        active_model, api_key, provider_id = await get_active_model_and_key()
        response = await call_llm(
            prompt,
            "You are a skill router. Output ONLY a valid JSON list.",
            state["model"],
            api_key=api_key,
            provider_id=provider_id
        )
        if response.startswith("ERROR:"):
            raise Exception(response)
        start = response.find('[')
        end = response.rfind(']') + 1
        routings = json.loads(response[start:end])
        return {"skill_results": routings, "steps": state["steps"]}
    except Exception:
        # Fallback: Route all to research_skill
        routings = [{"question": q, "skill": "research_skill", "args": {"query": q}} for q in state["sub_questions"]]
        return {"skill_results": routings, "steps": state["steps"]}

async def searcher_node(state: AgentState) -> Dict[str, Any]:
    """Execute search-related skills in parallel."""
    state["steps"].append("Searcher: Gathering information...")

    async def run_skill(routing: Dict[str, Any]):
        skill_name = routing.get("skill")
        args = routing.get("args", {})
        skill = loader.get_skill(skill_name)
        if skill:
            result = await skill.run(**args)
            return {"question": routing["question"], "result": result}
        return {"question": routing["question"], "result": f"Skill {skill_name} not found."}

    tasks_list = [run_skill(r) for r in state["skill_results"]]
    results = await asyncio.gather(*tasks_list)

    return {"skill_results": results, "steps": state["steps"]}

async def scraper_node(state: AgentState) -> Dict[str, Any]:
    """Refine and extract content and metadata."""
    state["steps"].append("Scraper: Refining source content...")
    context_parts = []
    all_sources = []

    for r in state["skill_results"]:
        q = r['question']
        res = r['result']
        if isinstance(res, dict) and "context" in res:
            context_parts.append(f"Q: {q}\nA: {res['context']}")
            all_sources.extend(res.get("sources", []))
        else:
            context_parts.append(f"Q: {q}\nA: {res}")

    context = "\n\n".join(context_parts)

    # Deduplicate sources by URL
    unique_sources = {}
    for s in all_sources:
        if s.get("url"):
            unique_sources[s["url"]] = s
    sources_list = list(unique_sources.values())

    return {"context": context, "sources": sources_list, "steps": state["steps"]}

async def synthesiser_node(state: AgentState) -> Dict[str, Any]:
    """Synthesise the gathered information into a report."""
    state["steps"].append("Synthesiser: Writing final report...")

    # Use a larger context snippet for more comprehensive synthesis
    context_snippet = state['context'][:30000]

    prompt = f"""
    RESEARCH QUERY: {state['query']}

    RESEARCH CONTEXT:
    {context_snippet}

    TASK:
    Write a comprehensive, deep-dive research report in Markdown.
    1. Organize with clear H1, H2, and H3 headers.
    2. Use bullet points for key findings.
    3. Include a 'Sources' section at the end with citations.
    4. ENSURE COMPLETENESS: Do not summarize briefly; cover all unique data points from the context.
    5. Length should be at least 1500 words if the context allows.
    """

    current_model = state["model"]
    error_count = state["error_count"]

    system_prompt = """You are a lead research scientist at LUMEN.
    Your goal is to produce the most thorough and professional research report possible.
    Write a complete, thorough, well-structured research report. Do not truncate. Cover all findings exhaustively with headings, subheadings, and citations.
    NEVER truncate your output. ALWAYS aim for maximum detail and exhaustive coverage of the provided context.
    Structure your report with: Executive Summary, Detailed Findings (by topic), Analysis, and Conclusion."""

    try:
        active_model, api_key, provider_id = await get_active_model_and_key()
        
        # Check if API key is available
        if not api_key:
            return {
                "report": f"## Error: No API Key Configured\n\nNo API key is configured for the selected model provider. Please go to **Settings → API Keys** to add your API key.",
                "steps": state["steps"],
                "error": "no_api_key"
            }
        
        # Final report synthesis with high token limit to avoid truncation
        report = await call_llm(
            prompt,
            system_prompt,
            current_model,
            max_tokens=8192,
            api_key=api_key,
            provider_id=provider_id
        )
        
        if report.startswith("ERROR:"):
            raise Exception(report)
        
        return {"report": report, "steps": state["steps"]}
    except Exception as e:
        if error_count < 1 and FALLBACK_MODEL:
            state["steps"].append(f"Synthesiser: Primary model failed, retrying with fallback...")
            try:
                active_model, api_key, provider_id = await get_active_model_and_key()
                report = await call_llm(
                    prompt,
                    system_prompt,
                    FALLBACK_MODEL,
                    max_tokens=8192,
                    api_key=api_key,
                    provider_id=provider_id
                )
                if report.startswith("ERROR:"):
                    raise Exception(report)
                return {"report": report, "steps": state["steps"], "model": FALLBACK_MODEL, "error_count": error_count + 1}
            except Exception:
                pass
        return {"report": f"## Error\n\nFailed to synthesise report: {str(e)}", "steps": state["steps"], "error": str(e)}

async def memory_writer_node(state: AgentState) -> Dict[str, Any]:
    """Save the report to the memory directory."""
    state["steps"].append("Memory: Archiving report...")
    os.makedirs("memory", exist_ok=True)
    file_path = f"memory/{state['task_id']}.md"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(state["report"])
    return {"status": "done", "steps": state["steps"]}

# Build Graph
workflow = StateGraph(AgentState)

workflow.add_node("planner", planner_node)
workflow.add_node("skill_router", skill_router_node)
workflow.add_node("searcher", searcher_node)
workflow.add_node("scraper", scraper_node)
workflow.add_node("synthesiser", synthesiser_node)
workflow.add_node("memory_writer", memory_writer_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "skill_router")
workflow.add_edge("skill_router", "searcher")
workflow.add_edge("searcher", "scraper")
workflow.add_edge("scraper", "synthesiser")
workflow.add_edge("synthesiser", "memory_writer")
workflow.add_edge("memory_writer", END)

# Compile
graph = workflow.compile()

async def run_agent(query: str, task_id: str):
    """Entry point for the LangGraph agent."""
    active_model, api_key, provider_id = await get_active_model_and_key()
    
    initial_state = {
        "query": query,
        "sub_questions": [],
        "skill_results": [],
        "context": "",
        "report": "",
        "task_id": task_id,
        "status": "in_progress",
        "steps": [],
        "model": active_model,
        "error_count": 0,
        "sources": []
    }

    final_state = initial_state
    async for output in graph.astream(initial_state):
        for key, value in output.items():
            final_state.update(value)

    return final_state
