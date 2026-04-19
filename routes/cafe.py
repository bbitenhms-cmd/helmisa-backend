from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from models.cafe import Cafe
from models.session import Session
from routes.auth import get_current_session
from base import db
from utils.helpers import is_within_range

router = APIRouter(prefix="/cafes", tags=["Cafes"])

@router.get("/{cafe_id}/info")
async def get_cafe_info(cafe_id: str):
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    return {"cafe": cafe}

@router.get("/{cafe_id}/tables")
async def get_tables(cafe_id: str, current_session: Session = Depends(get_current_session)):
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    sessions = await db.sessions.find({
        "cafe_id": cafe_id,
        "is_online": True,
        "user": {"$ne": None}
    }, {"_id": 0}).to_list(100)
    
    filtered_sessions = []
    for session in sessions:
        if session['id'] != current_session.id:
            # Clean sensitive data
            session.pop('token', None)
            session.pop('socket_id', None)
            filtered_sessions.append(session)
            
    return {
        "cafe": cafe,
        "tables": filtered_sessions,
        "total_count": len(filtered_sessions)
    }
