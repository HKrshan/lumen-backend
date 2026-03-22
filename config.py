import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration (Infrastructure - required)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# OpenRouter Configuration (Base URL only - no key)
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "claude-sonnet-4-6"
FALLBACK_MODEL = "deepseek/deepseek-chat"
HTTP_REFERER = "https://openrouter.ai/api/v1"
X_TITLE = "LUMEN"

# Telegram Configuration (Optional feature)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
