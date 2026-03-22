import asyncio
import httpx
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# Supabase client setup for fetching bot token
try:
    from supabase import create_client, Client
    from config import SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    supabase = None
    from config import TELEGRAM_BOT_TOKEN

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

API_BASE_URL = "http://127.0.0.1:8000"

async def get_telegram_bot_token() -> str | None:
    """Fetch Telegram bot token from Supabase, fallback to env."""
    if supabase:
        try:
            result = supabase.table("api_keys").select("api_key").eq("provider", "telegram").execute()
            if result.data:
                return result.data[0]["api_key"]
        except Exception:
            pass
    return TELEGRAM_BOT_TOKEN

async def poll_status(task_id: str, chat_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Poll the status of a research task and send the result when done."""
    last_step_count = 0

    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/status/{task_id}")
                data = response.json()

                status = data.get("status")
                steps = data.get("steps", [])

                # Send progress updates
                if len(steps) > last_step_count:
                    for i in range(last_step_count, len(steps)):
                        await context.bot.send_message(chat_id=chat_id, text=f"🔄 {steps[i]}")
                    last_step_count = len(steps)

                if status == "done":
                    result = data.get("result", "No result found.")
                    # Telegram has a 4096 character limit for messages
                    if len(result) > 4000:
                        # Split report into chunks or send as a file
                        await context.bot.send_message(chat_id=chat_id, text="✅ Research complete! Sending full report...")
                        with open(f"memory/{task_id}.md", "rb") as f:
                            await context.bot.send_document(chat_id=chat_id, document=f, filename="research_report.md")
                    else:
                        await context.bot.send_message(chat_id=chat_id, text=f"✅ Research complete!\n\n{result}")
                    break

                elif status == "failed":
                    await context.bot.send_message(chat_id=chat_id, text=f"❌ Research failed: {data.get('result')}")
                    break

        except Exception as e:
            logging.error(f"Error polling status: {e}")

        await asyncio.sleep(5)

async def research_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /research command."""
    if not context.args:
        await update.message.reply_text("Please provide a research query. Usage: /research <query>")
        return

    query = " ".join(context.args)
    await update.message.reply_text(f"🚀 Starting research on: {query}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE_URL}/research",
                json={"query": query, "depth": "quick"}
            )
            task_id = response.json()["task_id"]

            # Start polling in the background
            asyncio.create_task(poll_status(task_id, update.effective_chat.id, context))

    except Exception as e:
        await update.message.reply_text(f"Error starting research: {e}")

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /start command."""
    await update.message.reply_text("Welcome to LUMEN — Your AI Research Agent. Use /research <query> to begin.")

if __name__ == "__main__":
    async def main():
        bot_token = await get_telegram_bot_token()
        if not bot_token:
            print("ERROR: TELEGRAM_BOT_TOKEN not set in .env or Supabase")
            return
        
        application = ApplicationBuilder().token(bot_token).build()

        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("research", research_command))

        print("LUMEN Telegram Bot is starting...")
        application.run_polling()
    
    asyncio.run(main())
