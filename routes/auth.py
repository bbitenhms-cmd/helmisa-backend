from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timedelta
import os

from models.session import Session, SessionCreate, ProfileCreate, UserProfile
from utils.auth import create_access_token, verify_token
from utils.helpers import is_within_range

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Dependency to get database
from server import db

async def get_current_session(authorization: Optional[str] = Header(None)) -> Session:
    """
    JWT token'dan mevcut session'ı al
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    session_id = payload.get("session_id")
    session_doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Convert datetime strings back to datetime objects
    if isinstance(session_doc.get('created_at'), str):
        session_doc['created_at'] = datetime.fromisoformat(session_doc['created_at'])
    if isinstance(session_doc.get('expires_at'), str):
        session_doc['expires_at'] = datetime.fromisoformat(session_doc['expires_at'])
    if isinstance(session_doc.get('last_heartbeat'), str):
        session_doc['last_heartbeat'] = datetime.fromisoformat(session_doc['last_heartbeat'])
    
    return Session(**session_doc)

@router.post("/qr-login")
async def qr_login(data: SessionCreate):
    """
    QR kod ile giriş yap ve session oluştur
    """
    # Cafe'nin varlığını kontrol et
    cafe = await db.cafes.find_one({"id": data.cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    # Masa numarasını kontrol et
    if data.table_number < 1 or data.table_number > cafe["table_count"]:
        raise HTTPException(status_code=400, detail=f"Invalid table number. Must be between 1 and {cafe['table_count']}")
    
    # Bu masada zaten aktif session var mı?
    existing_session = await db.sessions.find_one({
        "cafe_id": data.cafe_id,
        "table_number": data.table_number,
        "is_online": True
    })
    
    if existing_session:
        raise HTTPException(status_code=400, detail="This table is already occupied")
    
    # Yeni session oluştur
    session = Session(
        cafe_id=data.cafe_id,
        table_number=data.table_number,
        location=data.location
    )
    
    # JWT token oluştur
    token = create_access_token({"session_id": session.id})
    session.token = token
    
    # Database'e kaydet
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['last_heartbeat'] = session_dict['last_heartbeat'].isoformat()
    
    await db.sessions.insert_one(session_dict)
    
    return {
        "session": session,
        "token": token,
        "message": f"Welcome to {cafe['name']}! You are at Table {data.table_number}"
    }

@router.post("/create-profile")
async def create_profile(profile: ProfileCreate, current_session: Session = Depends(get_current_session)):
    """
    Kullanıcı profili oluştur
    """
    if current_session.user:
        raise HTTPException(status_code=400, detail="Profile already created")
    
    # Profili güncelle
    user_profile = UserProfile(**profile.model_dump())
    
    await db.sessions.update_one(
        {"id": current_session.id},
        {"$set": {"user": user_profile.model_dump()}}
    )
    
    # Güncel session'ı al
    updated_session = await db.sessions.find_one({"id": current_session.id}, {"_id": 0})
    
    # Convert datetime strings
    if isinstance(updated_session.get('created_at'), str):
        updated_session['created_at'] = datetime.fromisoformat(updated_session['created_at'])
    if isinstance(updated_session.get('expires_at'), str):
        updated_session['expires_at'] = datetime.fromisoformat(updated_session['expires_at'])
    if isinstance(updated_session.get('last_heartbeat'), str):
        updated_session['last_heartbeat'] = datetime.fromisoformat(updated_session['last_heartbeat'])
    
    return {
        "session": Session(**updated_session),
        "message": "Profile created successfully"
    }

@router.get("/me")
async def get_me(current_session: Session = Depends(get_current_session)):
    """
    Mevcut kullanıcı bilgisini al
    """
    return {"session": current_session}

@router.post("/logout")
async def logout(current_session: Session = Depends(get_current_session)):
    """
    Oturumu kapat - Session'ı DB'den tamamen sil
    """
    # Session'ı tamamen sil (tekrar giriş yapabilmek için)
    result = await db.sessions.delete_one({"id": current_session.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Logged out successfully", "deleted": True}
