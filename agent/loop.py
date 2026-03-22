import asyncio
from typing import Dict
from agent.graph import run_agent as run_graph_agent

async def research_agent(query: str, depth: str, task_id: str, tasks: Dict):
    """
    Wrapper for the new LangGraph-based research agent.
    Maintains compatibility with the existing FastAPI interface.
    """
    from datetime import datetime, timezone

    tasks[task_id]["status"] = "running"
    tasks[task_id]["step"] = "planning"
    tasks[task_id]["steps"] = []
    tasks[task_id]["completed_steps"] = []
    tasks[task_id]["timestamps"] = {"planning": datetime.now(timezone.utc).isoformat()}
    
    try:
        # Run the LangGraph agent
        final_state = await run_graph_agent(query, task_id)
        
        # Map status: ensure we use dashboard-compatible names
        raw_status = final_state.get("status", "done")
        status_map = {"in_progress": "running", "pending": "queued"}
        tasks[task_id]["status"] = status_map.get(raw_status, raw_status)
        
        tasks[task_id]["steps"] = final_state.get("steps", [])
        tasks[task_id]["sources"] = final_state.get("sources", [])
        tasks[task_id]["result"] = final_state.get("report", "No report generated.")
        tasks[task_id]["report"] = final_state.get("report", "No report generated.")
        tasks[task_id]["step"] = "done"
        tasks[task_id]["completed_steps"] = ["planning", "searching", "scraping", "synthesising", "done"]
        tasks[task_id]["timestamps"]["done"] = datetime.now(timezone.utc).isoformat()
        
    except Exception as e:
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["result"] = f"Error during research: {str(e)}"
        tasks[task_id]["report"] = f"## Error\n\n{str(e)}"
        tasks[task_id]["steps"].append(f"Error: {str(e)}")
