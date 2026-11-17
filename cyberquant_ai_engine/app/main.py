import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.routers import ai_chat, ai_explain, ai_analyze, ai_budget, detection
from app.services.gemini_service import gemini_service
from app.schemas.attack import AttackRequest, AttackExplainResponse
from app.routers.ai_explain import explain_attack_endpoint

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered Cybersecurity Decision-Support Assistant."
)

# CORS configuration to allow local frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular API Routers
app.include_router(ai_chat.router)
app.include_router(ai_explain.router)
app.include_router(ai_analyze.router)
app.include_router(ai_budget.router)
app.include_router(detection.router)

STATIC_HTML = Path(__file__).resolve().parent.parent.parent / "frontend" / "static_dashboard.html"

def get_chatbot_html() -> str:
    if STATIC_HTML.exists():
        return STATIC_HTML.read_text(encoding="utf-8")
    return "<h1>CyberQuant AI Chatbot</h1><p>Frontend file not found.</p>"

# Direct root route: Serves the Chatbot UI directly to browsers!
@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    # If a programmatic client explicitly asks for JSON, return JSON metadata
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return JSONResponse({
            "message": "Cybersecurity AI Assistant is running!",
            "version": settings.VERSION,
            "chatbot_ui": "/",
            "docs": "/docs"
        })
    # Otherwise, directly serve the full modern Chatbot UI!
    return HTMLResponse(content=get_chatbot_html())

# Alternate convenience routes
@app.get("/chat", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def serve_chatbot():
    return HTMLResponse(content=get_chatbot_html())

# Health Check Route
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "gemini_configured": gemini_service.is_configured(),
        "gemini_model": settings.GEMINI_MODEL
    }

# Preserved Legacy Route (Backward Compatibility with Existing Code)
@app.post("/explain")
def legacy_explain_attack(request: AttackRequest):
    return explain_attack_endpoint(request)
