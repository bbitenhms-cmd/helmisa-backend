from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import List
import logging

from models.request import Request, RequestCreate
from models.match import Match
from models.chat import Chat
from routes.auth import get_current_session
from server import db

router = APIRouter(prefix="/requests", tags=["Requests"])
logger = logging.getLogger(__name__)

@router.post("/send")
async def send_request(data: RequestCreate, current_session = Depends(get_current_session)):
    """
    Kahve teklifi gönder
    """
    # Hedef session'ı kontrol et
    target_session = await db.sessions.find_one({"id": data.to_session_id}, {"_id": 0})
    if not target_session:
        raise HTTPException(status_code=404, detail="Target session not found")
    
    # Kendi kendine teklif gönderemez
    if data.to_session_id == current_session.id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    # Aynı cafe'de mi kontrol et
    if target_session["cafe_id"] != current_session.cafe_id:
        raise HTTPException(status_code=400, detail="Target session is not in the same cafe")
    
    # Son 5 dakika içinde rejected edilmiş teklif var mı?
    from datetime import timezone
    five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    recent_rejected = await db.requests.find_one({
        "from_session_id": current_session.id,
        "to_session_id": data.to_session_id,
        "status": "rejected",
        "responded_at": {"$gte": five_minutes_ago.isoformat()}
    })
    
    if recent_rejected:
        raise HTTPException(
            status_code=429, 
            detail="Bu kullanıcı son 5 dakika içinde teklifinizi reddetti. Lütfen daha sonra tekrar deneyin."
        )
    
    # Zaten bekleyen teklif var mı?
    existing_request = await db.requests.find_one({
        "from_session_id": current_session.id,
        "to_session_id": data.to_session_id,
        "status": "pending"
    })
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Bu kullanıcı için zaten bekleyen bir isteğiniz var.")
    
    # Yeni teklif oluştur
    request = Request(
        cafe_id=current_session.cafe_id,
        from_session_id=current_session.id,
        to_session_id=data.to_session_id
    )
    
    # Kaydet
    request_dict = request.model_dump()
    request_dict['created_at'] = request_dict['created_at'].isoformat()
    request_dict['expires_at'] = request_dict['expires_at'].isoformat()
    
    await db.requests.insert_one(request_dict)
    
    # Karşı taraftan da teklif var mı kontrol et (MATCH)
    reverse_request = await db.requests.find_one({
        "from_session_id": data.to_session_id,
        "to_session_id": current_session.id,
        "status": "pending"
    })
    
    if reverse_request:
        # MATCH! Her iki teklifi de accepted yap
        await db.requests.update_one(
            {"id": request.id},
            {"$set": {"status": "accepted", "responded_at": datetime.utcnow().isoformat()}}
        )
        await db.requests.update_one(
            {"id": reverse_request["id"]},
            {"$set": {"status": "accepted", "responded_at": datetime.utcnow().isoformat()}}
        )
        
        # Chat oluştur
        chat = Chat(
            match_id=f"match_{request.id}_{reverse_request['id']}",
            cafe_id=current_session.cafe_id,
            participants=[current_session.id, data.to_session_id]
        )
        
        chat_dict = chat.model_dump()
        chat_dict['created_at'] = chat_dict['created_at'].isoformat()
        
        await db.chats.insert_one(chat_dict)
        
        # Match kaydı
        match = Match(
            cafe_id=current_session.cafe_id,
            session_ids=[current_session.id, data.to_session_id],
            request_ids=[request.id, reverse_request["id"]],
            chat_id=chat.id
        )
        
        match_dict = match.model_dump()
        match_dict['created_at'] = match_dict['created_at'].isoformat()
        
        await db.matches.insert_one(match_dict)
        
        logger.info(f"MATCH created: {match.id} between {current_session.id} and {data.to_session_id}")
        
        # Socket.io ile her iki tarafa da bildirim gönder
        from server import sio
        
        # Her iki session'ın socket_id'sini al
        from_socket = current_session.socket_id
        to_socket = target_session.get("socket_id")
        
        if from_socket:
            await sio.emit('match_created', {
                'match_id': match.id,
                'chat_id': chat.id,
                'message': "It's a match! 🎉",
                'other_table': target_session["table_number"]
            }, room=from_socket)
        
        if to_socket:
            await sio.emit('match_created', {
                'match_id': match.id,
                'chat_id': chat.id,
                'message': "It's a match! 🎉",
                'other_table': current_session.table_number
            }, room=to_socket)
        
        return {
            "request": request,
            "status": "matched",
            "match": match,
            "chat_id": chat.id,
            "message": "It's a match! 🎉"
        }
    
    # Karşı tarafa socket.io ile bildirim gönder
    from server import sio
    
    target_socket_id = target_session.get("socket_id")
    if target_socket_id:
        # Gönderen bilgilerini ekle
        await sio.emit('coffee_request', {
            'id': request.id,
            'from_session_id': current_session.id,
            'from_table': current_session.table_number,
            'from_user': current_session.user,
            'expires_at': request.expires_at.isoformat()
        }, room=target_socket_id)
        logger.info(f"☕ Coffee request sent to socket {target_socket_id} (session: {data.to_session_id})")
    else:
        logger.warning(f"⚠️ Target session {data.to_session_id} has no socket_id - notification not sent")
    
    return {
        "request": request,
        "status": "sent",
        "message": "Coffee request sent!"
    }

@router.get("/incoming")
async def get_incoming_requests(current_session = Depends(get_current_session)):
    """
    Gelen kahve teklifleri
    """
    requests = await db.requests.find({
        "to_session_id": current_session.id,
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    # Sender bilgilerini ekle
    for req in requests:
        sender_session = await db.sessions.find_one({"id": req["from_session_id"]}, {"_id": 0, "token": 0, "socket_id": 0})
        req["sender"] = sender_session
    
    return {"requests": requests, "count": len(requests)}

@router.get("/outgoing")
async def get_outgoing_requests(current_session = Depends(get_current_session)):
    """
    Giden kahve teklifleri
    """
    requests = await db.requests.find({
        "from_session_id": current_session.id,
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    # Receiver bilgilerini ekle
    for req in requests:
        receiver_session = await db.sessions.find_one({"id": req["to_session_id"]}, {"_id": 0, "token": 0, "socket_id": 0})
        req["receiver"] = receiver_session
    
    return {"requests": requests, "count": len(requests)}

@router.post("/{request_id}/accept")
async def accept_request(request_id: str, current_session = Depends(get_current_session)):
    """
    Teklifi kabul et
    """
    # Request'i bul
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Bu kullanıcıya gelen teklif mi?
    if request["to_session_id"] != current_session.id:
        raise HTTPException(status_code=403, detail="This request is not for you")
    
    # Zaten yanıtlanmış mı?
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already responded")
    
    # Accept yap
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"status": "accepted", "responded_at": datetime.utcnow().isoformat()}}
    )
    
    # Chat oluştur
    chat = Chat(
        match_id=f"match_{request_id}",
        cafe_id=request["cafe_id"],
        participants=[request["from_session_id"], current_session.id]
    )
    
    chat_dict = chat.model_dump()
    chat_dict['created_at'] = chat_dict['created_at'].isoformat()
    
    await db.chats.insert_one(chat_dict)
    
    # Match kaydı
    match = Match(
        cafe_id=request["cafe_id"],
        session_ids=[request["from_session_id"], current_session.id],
        request_ids=[request_id],
        chat_id=chat.id
    )
    
    match_dict = match.model_dump()
    match_dict['created_at'] = match_dict['created_at'].isoformat()
    
    await db.matches.insert_one(match_dict)
    
    logger.info(f"Request accepted: {request_id}, Match: {match.id}, Chat: {chat.id}")
    
    return {
        "message": "Request accepted!",
        "match": match,
        "chat_id": chat.id
    }

@router.post("/{request_id}/reject")
async def reject_request(request_id: str, current_session = Depends(get_current_session)):
    """
    Teklifi reddet
    """
    # Request'i bul
    request = await db.requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Bu kullanıcıya gelen teklif mi?
    if request["to_session_id"] != current_session.id:
        raise HTTPException(status_code=403, detail="This request is not for you")
    
    # Zaten yanıtlanmış mı?
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already responded")
    
    # Reject yap - timezone-aware datetime kullan
    from datetime import timezone
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Request rejected: {request_id}")
    
    return {"message": "Request rejected"}
