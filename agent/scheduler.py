import os
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from agent.graph import run_agent
from datetime import datetime

scheduler = AsyncIOScheduler()

async def check_pending_tasks():
    """
    Cron job: every 30 min, check /memory for pending tasks and re-run.
    Pending tasks are identified by files starting with 'PENDING_'.
    """
    print(f"[{datetime.now()}] Heartbeat: Checking for pending tasks...")
    memory_dir = "memory"
    if not os.path.exists(memory_dir):
        return

    for filename in os.listdir(memory_dir):
        if filename.startswith("PENDING_") and filename.endswith(".md"):
            file_path = os.path.join(memory_dir, filename)
            task_id = filename.replace("PENDING_", "").replace(".md", "")
            
            # Read the query from the file (assumed to be on the first line)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    query = f.readline().strip().replace("Query: ", "")
                
                print(f"Heartbeat: Re-running pending task {task_id} with query: {query}")
                
                # Re-run the agent
                await run_agent(query, task_id)
                
                # Remove the pending file after successful run
                os.remove(file_path)
                print(f"Heartbeat: Task {task_id} completed and PENDING file removed.")
            
            except Exception as e:
                print(f"Heartbeat: Error processing pending task {task_id}: {str(e)}")

def start_scheduler():
    """Starts the heartbeat scheduler."""
    scheduler.add_job(check_pending_tasks, 'cron', minute='0,30')
    scheduler.start()
    print("Heartbeat scheduler started (every 30 mins).")
