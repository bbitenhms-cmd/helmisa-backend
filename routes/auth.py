from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from datetime import datetime, timezone
import logging

from models.session import Session, SessionCreate, ProfileCreate, UserProfile
from utils.auth import create_access_token, verify_token
from base import db

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

async def get_current_session(authorization: Optional[str] = Header(None)) -> Session:
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
    
    return Session(**session_doc)

@router.post("/qr-login")
async def qr_login(data: SessionCreate):
    # SPEC: Ensure cafe existence
    cafe = await db.cafes.find_one({"id": data.cafe_id}, {"_id": 0})
    if not cafe:
        # Fallback to demo cafe if not found
        cafe = await db.cafes.find_one({"id": "demo-cafe-001"}, {"_id": 0})
        if not cafe:
            raise HTTPException(status_code=404, detail="Cafe not found")
        data.cafe_id = "demo-cafe-001"
    
    if data.table_number < 1 or data.table_number > cafe["table_count"]:
        raise HTTPException(status_code=400, detail=f"Invalid table number")
    
    now = datetime.now(timezone.utc)
    
    # Clear expired
    await db.sessions.delete_many({
        "cafe_id": data.cafe_id,
        "table_number": data.table_number,
        "expires_at": {"$lt": now.isoformat()}
    })
    
    session = Session(
        cafe_id=data.cafe_id,
        table_number=data.table_number,
        location=data.location
    )
    
    token = create_access_token({"session_id": session.id})
    session.token = token
    
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['last_heartbeat'] = session_dict['last_heartbeat'].isoformat()
    
    await db.sessions.insert_one(session_dict)
    
    return {
        "session": session,
        "token": token,
        "message": f"Welcome to {cafe['name']}!"
    }

@router.post("/create-profile")
async def create_profile(profile: ProfileCreate, current_session: Session = Depends(get_current_session)):
    user_profile = UserProfile(**profile.model_dump())
    await db.sessions.update_one(
        {"id": current_session.id},
        {"$set": {"user": user_profile.model_dump()}}
    )
    
    updated_session = await db.sessions.find_one({"id": current_session.id}, {"_id": 0})
    return {"session": updated_session, "message": "Profile created"}

@router.get("/me")
async def get_me(current_session: Session = Depends(get_current_session)):
    return {"session": current_session}

@router.post("/logout")
async def logout(current_session: Session = Depends(get_current_session)):
    await db.sessions.delete_one({"id": current_session.id})
    return {"message": "Logged out"}
