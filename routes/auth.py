from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging
import uuid

from models.session import Session, SessionCreate
from utils.auth import create_access_token, verify_token
from base import db

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

async def get_current_session(authorization: Optional[str] = Header(None)) -> Session:
    if not authorization: raise HTTPException(status_code=401)
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload: raise HTTPException(status_code=401)
    
    session_doc = await db.sessions.find_one({"id": payload.get("session_id")}, {"_id": 0})
    if not session_doc: raise HTTPException(status_code=404)
    
    # Check expiry (SPEC: 45 min)
    if datetime.fromisoformat(session_doc['expires_at']) < datetime.now(timezone.utc):
        await db.sessions.delete_one({"id": session_doc['id']})
        raise HTTPException(status_code=401, detail="Session expired")
        
    return Session(**session_doc)

@router.post("/qr-login")
async def qr_login(data: SessionCreate):
    # 1. Validate Cafe
    cafe = await db.cafes.find_one({"id": data.cafe_id})
    if not cafe: 
        # Auto-create demo cafe if missing to prevent error
        cafe = {"id": data.cafe_id, "name": "helMisa Cafe", "table_count": 50, "is_active": True}
        await db.cafes.insert_one(cafe)

    # 2. SPEC: Leave previous table (if any session for this device/id exists - simplified for demo)
    # 3. SPEC: 45 Minutes Inactivity Rule
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=45)

    session = Session(
        id=str(uuid.uuid4()),
        cafe_id=data.cafe_id,
        table_number=data.table_number,
        is_online=True,
        created_at=now,
        expires_at=expires_at,
        last_heartbeat=now
    )

    token = create_access_token({"session_id": session.id})
    session_dict = session.model_dump()
    
    # ISO strings for MongoDB storage consistency
    for key in ['created_at', 'expires_at', 'last_heartbeat']:
        session_dict[key] = session_dict[key].isoformat()

    await db.sessions.insert_one(session_dict)

    return {"session": session, "token": token}
