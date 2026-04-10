from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
import uuid

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cafe_id: str
    session_ids: List[str]
    request_ids: List[str]  # Karşılıklı teklifler
    chat_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
