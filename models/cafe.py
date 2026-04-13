from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class Location(BaseModel):
    lat: float
    lng: float

class Cafe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    table_count: int = 20
    location: Location
    qr_base_url: str  # "https://cekin2.com/qr/"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CafeCreate(BaseModel):
    name: str
    address: str
    table_count: int = 20
    location: Location
