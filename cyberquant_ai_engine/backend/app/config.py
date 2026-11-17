import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "CyberQuant AI - Cybersecurity Decision Support Assistant"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Gemini API Key loading with graceful fallback
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # If not found in .env, check for legacy API_key.txt
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("your_"):
        api_txt_path = BASE_DIR / "API_key.txt"
        if api_txt_path.exists():
            try:
                content = api_txt_path.read_text(encoding="utf-8").strip()
                if "API =" in content:
                    GEMINI_API_KEY = content.split("API =")[1].strip()
                elif content:
                    GEMINI_API_KEY = content
            except Exception:
                pass

    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
