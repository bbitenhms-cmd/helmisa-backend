from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging

from models.request import Request, RequestCreate
from models.match import Match
from models.chat import Chat
from routes.auth import get_current_session
from base import db, sio

router = APIRouter(prefix="/requests", tags=["Requests"])
logger = logging.getLogger(__name__)

@router.post("/send")
async def send_request(data: RequestCreate, current_session = Depends(get_current_session)):
    # Duplicate check
    existing = await db.requests.find_one({
        "from_session_id": current_session.id,
        "to_session_id": data.to_session_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="A request is already pending")

    # Create Request
    request = Request(
        cafe_id=current_session.cafe_id,
        from_session_id=current_session.id,
        to_session_id=data.to_session_id
    )
    
    request_dict = request.model_dump()
    request_dict['created_at'] = request_dict['created_at'].isoformat()
    request_dict['expires_at'] = request_dict['expires_at'].isoformat()
    
    await db.requests.insert_one(request_dict)

    # Emit notification to session room
    await sio.emit('coffee_request', {
        'id': request.id,
        'from_session_id': current_session.id,
        'from_table': current_session.table_number,
        'from_user': current_session.user,
        'expires_at': request.expires_at.isoformat()
    }, room=f"session_{data.to_session_id}")

    logger.info(f"📧 Request sent to session_{data.to_session_id}")
    return {"request": request, "status": "sent"}

@router.post("/{request_id}/accept")
async def accept_request(request_id: str, current_session = Depends(get_current_session)):
    req = await db.requests.find_one({"id": request_id})
    if not req or req["to_session_id"] != current_session.id:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.requests.update_one({"id": request_id}, {"$set": {"status": "accepted", "responded_at": datetime.now(timezone.utc).isoformat()}})

    chat = Chat(match_id=f"match_{request_id}", cafe_id=req["cafe_id"], participants=[req["from_session_id"], current_session.id])
    await db.chats.insert_one(chat.model_dump())

    match = Match(cafe_id=req["cafe_id"], session_ids=[req["from_session_id"], current_session.id], request_ids=[request_id], chat_id=chat.id)
    await db.matches.insert_one(match.model_dump())

    # Notify both session rooms
    await sio.emit('match_created', {"chat_id": chat.id, "message": "Match!"}, room=f"session_{req['from_session_id']}")
    await sio.emit('match_created', {"chat_id": chat.id, "message": "Match!"}, room=f"session_{current_session.id}")

    return {"chat_id": chat.id}
