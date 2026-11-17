import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.gemini_service import gemini_service
from app.services.incident_service import incident_service

router = APIRouter(prefix="/ai", tags=["AI Chatbot"])

# In-memory session store (can be swapped for Redis / SQLite in later RAG stages)
SESSIONS = {}

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Conversational AI Chatbot Endpoint:
    - Maintains conversational history.
    - Understands questions on cyberattacks, risks, defenses, and historical incidents.
    - Supports simple language explanations for beginners.
    - Recommends proactive follow-up questions.
    """
    session_id = request.session_id or str(uuid.uuid4())
    
    # Check if an attack was explicitly specified in context
    context_attack = request.context_attack

    try:
        result = gemini_service.generate_chat_response(
            user_message=request.message,
            history=request.history or [],
            simple_language=request.simple_language,
            context_attack=context_attack
        )

        detected_attack = result.get("attack_name")

        return ChatResponse(
            reply=result["reply"],
            session_id=session_id,
            suggested_followups=result.get("suggested_followups", []),
            detected_attack_type=detected_attack,
            sources=result.get("sources", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the chat request: {str(e)}"
        )
