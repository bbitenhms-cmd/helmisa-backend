from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List

from models.chat import Chat, Message, MessageCreate
from routes.auth import get_current_session
from base import db

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.get("/my-chats")
async def get_my_chats(current_session = Depends(get_current_session)):
    chats = await db.chats.find({
        "participants": current_session.id,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    for chat in chats:
        other_session_id = [p for p in chat["participants"] if p != current_session.id][0]
        other_session = await db.sessions.find_one({"id": other_session_id}, {"_id": 0, "token": 0, "socket_id": 0})
        chat["other_user"] = other_session
        
        last_msg = await db.messages.find_one({"chat_id": chat["id"]}, {"_id": 0}, sort=[("created_at", -1)])
        chat["last_message"] = last_msg
        
    return {"chats": chats, "count": len(chats)}

@router.get("/{chat_id}")
async def get_chat(chat_id: str, current_session = Depends(get_current_session)):
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat or current_session.id not in chat["participants"]:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    other_session_id = [p for p in chat["participants"] if p != current_session.id][0]
    other_session = await db.sessions.find_one({"id": other_session_id}, {"_id": 0, "token": 0, "socket_id": 0})
    chat["other_user"] = other_session
    
    return {"chat": chat}

@router.get("/{chat_id}/messages")
async def get_messages(chat_id: str, limit: int = 50, current_session = Depends(get_current_session)):
    chat = await db.chats.find_one({"id": chat_id})
    if not chat or current_session.id not in chat["participants"]:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    msgs = await db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    msgs.reverse()
    return {"messages": msgs, "count": len(msgs)}

@router.post("/{chat_id}/messages")
async def send_message(chat_id: str, data: MessageCreate, current_session = Depends(get_current_session)):
    chat = await db.chats.find_one({"id": chat_id})
    if not chat or current_session.id not in chat["participants"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    msg = Message(
        chat_id=chat_id,
        sender_session_id=current_session.id,
        type=data.type,
        content=data.content,
        metadata=data.metadata
    )
    
    msg_dict = msg.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    await db.messages.insert_one(msg_dict)
    
    return {"message": msg, "status": "sent"}
