from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta
import uuid

class UserProfile(BaseModel):
    gender: str  # "male", "female", "other"
    age_range: str  # "18-25", "26-35", "36-45", "46+"
    group_type: str  # "solo", "couple", "friends"
    vibe: str  # "chill", "energetic", "romantic", "social"

class Location(BaseModel):
    lat: float
    lng: float

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cafe_id: str
    table_number: int
    user: Optional[UserProfile] = None
    location: Optional[Location] = None
    is_online: bool = True
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    token: Optional[str] = None
    socket_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=10))

class SessionCreate(BaseModel):
    cafe_id: str
    table_number: int
    location: Optional[Location] = None

class ProfileCreate(BaseModel):
    gender: str
    age_range: str
    group_type: str
    vibe: str
