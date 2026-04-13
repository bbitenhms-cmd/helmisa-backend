from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List

from models.chat import Chat, Message, MessageCreate
from routes.auth import get_current_session
from server import db

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.get("/my-chats")
async def get_my_chats(current_session = Depends(get_current_session)):
    """
    Kullanıcının tüm chat'lerini getir
    """
    chats = await db.chats.find({
        "participants": current_session.id,
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    # Her chat için karşı tarafın bilgilerini ve son mesajı ekle
    for chat in chats:
        # Karşı tarafı bul
        other_session_id = [p for p in chat["participants"] if p != current_session.id][0]
        other_session = await db.sessions.find_one(
            {"id": other_session_id}, 
            {"_id": 0, "token": 0, "socket_id": 0}
        )
        chat["other_user"] = other_session
        
        # Son mesajı bul
        last_message = await db.messages.find_one(
            {"chat_id": chat["id"]},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        chat["last_message"] = last_message
    
    return {"chats": chats, "count": len(chats)}

@router.get("/{chat_id}")
async def get_chat(chat_id: str, current_session = Depends(get_current_session)):
    """
    Chat detaylarını getir
    """
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Bu kullanıcı bu chat'in parçası mı?
    if current_session.id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="You are not part of this chat")
    
    # Karşı tarafın bilgilerini ekle
    other_session_id = [p for p in chat["participants"] if p != current_session.id][0]
    other_session = await db.sessions.find_one(
        {"id": other_session_id}, 
        {"_id": 0, "token": 0, "socket_id": 0}
    )
    chat["other_user"] = other_session
    
    return {"chat": chat}

@router.get("/{chat_id}/messages")
async def get_messages(chat_id: str, limit: int = 50, current_session = Depends(get_current_session)):
    """
    Chat'in mesajlarını getir
    """
    # Chat kontrolü
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if current_session.id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="You are not part of this chat")
    
    # Mesajları getir (en yeni en üstte)
    messages = await db.messages.find(
        {"chat_id": chat_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Ters çevir (en eski en üstte)
    messages.reverse()
    
    return {"messages": messages, "count": len(messages)}

@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str, 
    message_data: MessageCreate,
    current_session = Depends(get_current_session)
):
    """
    Mesaj gönder
    """
    # Chat kontrolü
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if current_session.id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="You are not part of this chat")
    
    if not chat["is_active"]:
        raise HTTPException(status_code=400, detail="Chat is closed")
    
    # Mesaj oluştur
    message = Message(
        chat_id=chat_id,
        sender_session_id=current_session.id,
        type=message_data.type,
        content=message_data.content,
        metadata=message_data.metadata
    )
    
    # Kaydet
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    
    await db.messages.insert_one(message_dict)
    
    # Coffee choice ilk mesajsa, işaretle
    if message_data.type == "coffee_menu" and not chat.get("coffee_choice_sent"):
        await db.chats.update_one(
            {"id": chat_id},
            {"$set": {"coffee_choice_sent": True}}
        )
    
    return {
        "message": message,
        "status": "sent"
    }

@router.post("/{chat_id}/close")
async def close_chat(chat_id: str, current_session = Depends(get_current_session)):
    """
    Chat'i kapat
    """
    # Chat kontrolü
    chat = await db.chats.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if current_session.id not in chat["participants"]:
        raise HTTPException(status_code=403, detail="You are not part of this chat")
    
    # Kapat
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {
            "is_active": False,
            "closed_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {"message": "Chat closed successfully"}
