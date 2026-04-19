from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models.session import Session
from routes.auth import get_current_session
from base import db

router = APIRouter(prefix="/cafes", tags=["Cafes"])

@router.get("/{cafe_id}/tables")
async def get_tables(cafe_id: str, current_session: Session = Depends(get_current_session)):
    """
    SPEC: Only users who joined a table can interact with others.
    User sees other active users AT THAT TABLE.
    """
    # Get sessions matching cafe AND table_number
    sessions = await db.sessions.find({
        "cafe_id": cafe_id,
        "table_number": current_session.table_number,
        "is_online": True,
        "user": {"$ne": None}
    }, {"_id": 0}).to_list(100)

    # Filter out current user
    others = [s for s in sessions if s['id'] != current_session.id]
    
    # Clean sensitive data before returning
    for s in others:
        s.pop('token', None)
        s.pop('socket_id', None)

    return {
        "table_number": current_session.table_number,
        "tables": others,
        "total_count": len(others)
    }
