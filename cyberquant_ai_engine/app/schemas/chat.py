from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query or prompt")
    session_id: Optional[str] = Field(default=None, description="Session ID for context persistence")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation messages for context")
    simple_language: bool = Field(default=False, description="Whether to simplify technical jargon for beginner understanding")
    context_attack: Optional[str] = Field(default=None, description="Optional attack type currently in focus")

class GroundingSource(BaseModel):
    title: str
    reference: str
    verified: bool = True

class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's conversational response")
    session_id: str = Field(..., description="Active session ID")
    suggested_followups: List[str] = Field(default=[], description="Next recommended questions the user can ask")
    detected_attack_type: Optional[str] = Field(default=None, description="Identified attack category if mentioned")
    sources: List[GroundingSource] = Field(default=[], description="Verified incident citations or frameworks")
