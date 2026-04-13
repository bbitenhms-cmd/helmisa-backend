from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class Chat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    cafe_id: str
    participants: List[str]  # session_ids
    is_active: bool = True
    coffee_choice_sent: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    sender_session_id: str
    type: str = "text"  # "text", "coffee_menu", "coffee_choice", "system"
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    content: str
    type: str = "text"
    metadata: Optional[Dict[str, Any]] = None
