from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
from typing import List
import logging

from models.request import Request, RequestCreate
from models.match import Match
from models.chat import Chat
from routes.auth import get_current_session
from server import db, sio

router = APIRouter(prefix="/requests", tags=["Requests"])
logger = logging.getLogger(__name__)

@router.post("/send")
async def send_request(data: RequestCreate, current_session = Depends(get_current_session)):
    """
    SPEC: Same user -> same user duplicate check
    """
    target_session = await db.sessions.find_one({"id": data.to_session_id}, {"_id": 0})
    if not target_session:
        raise HTTPException(status_code=404, detail="Target session not found")
    
    if data.to_session_id == current_session.id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    # SPEC: Check for existing pending request (Idempotency)
    existing = await db.requests.find_one({
        "from_session_id": current_session.id,
        "to_session_id": data.to_session_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="A request is already pending for this user")

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

    # SPEC: Send notification to the target's SESSION ROOM (not socket_id)
    # This is the most reliable way as socket_id can change on refresh
    await sio.emit('coffee_request', {
        'id': request.id,
        'from_session_id': current_session.id,
        'from_table': current_session.table_number,
        'from_user': current_session.user,
        'expires_at': request.expires_at.isoformat()
    }, room=f"session_{data.to_session_id}")

    logger.info(f"📧 Coffee request sent to room: session_{data.to_session_id}")

    return {"request": request, "status": "sent"}

@router.get("/incoming")
async def get_incoming_requests(current_session = Depends(get_current_session)):
    requests = await db.requests.find({
        "to_session_id": current_session.id,
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    for req in requests:
        sender = await db.sessions.find_one({"id": req["from_session_id"]}, {"_id": 0, "token": 0, "socket_id": 0})
        req["sender"] = sender
    
    return {"requests": requests, "count": len(requests)}

@router.post("/{request_id}/accept")
async def accept_request(request_id: str, current_session = Depends(get_current_session)):
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request or request["to_session_id"] != current_session.id:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already responded")

    # Update status
    await db.requests.update_one({"id": request_id}, {"$set": {"status": "accepted", "responded_at": datetime.now(timezone.utc).isoformat()}})

    # Create Chat & Match (Logic remains same but ensures single Chat ID)
    chat = Chat(match_id=f"match_{request_id}", cafe_id=request["cafe_id"], participants=[request["from_session_id"], current_session.id])
    await db.chats.insert_one(chat.model_dump())

    match = Match(cafe_id=request["cafe_id"], session_ids=[request["from_session_id"], current_session.id], request_ids=[request_id], chat_id=chat.id)
    await db.matches.insert_one(match.model_dump())

    # SPEC: Notify both parties through their session rooms
    await sio.emit('match_created', {"chat_id": chat.id, "message": "It's a Match!"}, room=f"session_{request['from_session_id']}")
    await sio.emit('match_created', {"chat_id": chat.id, "message": "It's a Match!"}, room=f"session_{current_session.id}")

    return {"chat_id": chat.id, "match": match}

@router.post("/{request_id}/reject")
async def reject_request(request_id: str, current_session = Depends(get_current_session)):
    await db.requests.update_one({"id": request_id}, {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Request rejected"}
