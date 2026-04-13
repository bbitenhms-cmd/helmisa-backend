from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta
import uuid

class Request(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cafe_id: str
    from_session_id: str
    to_session_id: str
    status: str = "pending"  # "pending", "accepted", "rejected", "expired"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=5))
    responded_at: Optional[datetime] = None

class RequestCreate(BaseModel):
    to_session_id: str
