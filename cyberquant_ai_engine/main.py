import sys
import os
from pathlib import Path

# Add backend directory to sys.path so imports resolve cleanly
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Ensure working directory is strictly project root
os.chdir(str(CURRENT_DIR))

# If running on Python 3.11, prioritize the local 3.11 venv
if sys.version_info.major == 3 and sys.version_info.minor == 11:
    venv_site = CURRENT_DIR / "venv" / "Lib" / "site-packages"
    if venv_site.exists() and str(venv_site) not in sys.path:
        sys.path.insert(0, str(venv_site))

try:
    # Import the enriched, modular FastAPI application
    from app.main import app, AttackRequest
except ModuleNotFoundError as e:
    missing_mod = e.name
    print("\n" + "=" * 60)
    print(f" ERROR: Missing dependency '{missing_mod}' in this Python environment.")
    print("=" * 60)
    print(" You are running Python from:")
    print(f"   {sys.executable} (Python {sys.version.split()[0]})")
    print("\n HOW TO FIX:")
    print(" Option 1 (Easiest - One Click):")
    print("   Double-click or run: .\\run.bat   (or .\\run.ps1 in PowerShell)")
    print("\n Option 2 (Direct Python 3.13):")
    print('   & "C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python313\\python.exe" main.py')
    print("=" * 60 + "\n")
    sys.exit(1)

# Preserved original symbols for strict backward compatibility
__all__ = ["app", "AttackRequest"]

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    print(f"Starting {settings.PROJECT_NAME} on http://127.0.0.1:{settings.PORT} ...")
    # Note: reload=False prevents uvicorn from watching unwanted directories and keeps the server stable
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT, log_level="info")
