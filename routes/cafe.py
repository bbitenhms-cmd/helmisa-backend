from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from models.cafe import Cafe
from models.session import Session
from routes.auth import get_current_session
from server import db
from utils.helpers import is_within_range

router = APIRouter(prefix="/cafes", tags=["Cafes"])

@router.get("/{cafe_id}/info")
async def get_cafe_info(cafe_id: str):
    """
    Cafe bilgilerini al
    """
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    return {"cafe": cafe}

@router.get("/{cafe_id}/tables")
async def get_tables(cafe_id: str, current_session: Session = Depends(get_current_session)):
    """
    Cafe'deki tüm masaları ve aktif kullanıcıları al
    """
    # Cafe bilgisini al
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    # Aktif sessionları al
    sessions_cursor = db.sessions.find({
        "cafe_id": cafe_id,
        "is_online": True,
        "user": {"$ne": None}  # Profil oluşturmuş kullanıcılar
    }, {"_id": 0})
    
    sessions = await sessions_cursor.to_list(length=100)
    
    # Datetime string'lerini dönüştür
    for session in sessions:
        if isinstance(session.get('created_at'), str):
            session['created_at'] = datetime.fromisoformat(session['created_at'])
        if isinstance(session.get('expires_at'), str):
            session['expires_at'] = datetime.fromisoformat(session['expires_at'])
        if isinstance(session.get('last_heartbeat'), str):
            session['last_heartbeat'] = datetime.fromisoformat(session['last_heartbeat'])
    
    # Mesafe kontrolü (60 metre)
    filtered_sessions = []
    if current_session.location:
        for session in sessions:
            if session.get('location') and session['id'] != current_session.id:
                if is_within_range(
                    current_session.location.lat,
                    current_session.location.lng,
                    session['location']['lat'],
                    session['location']['lng'],
                    max_distance=60
                ):
                    # Token ve hassas bilgileri kaldır
                    session.pop('token', None)
                    session.pop('socket_id', None)
                    filtered_sessions.append(session)
    else:
        # Konum yoksa herkesi göster (demo amaçlı)
        for session in sessions:
            if session['id'] != current_session.id:
                session.pop('token', None)
                session.pop('socket_id', None)
                filtered_sessions.append(session)
    
    return {
        "cafe": cafe,
        "tables": filtered_sessions,
        "total_count": len(filtered_sessions)
    }
