from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create Socket.IO server with production-ready settings
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1000000,
    allow_upgrades=True,
    http_compression=True,
    compression_threshold=1024
)

# Create the main FastAPI app
app = FastAPI(title="helMisa API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes
from routes import auth, cafe, request, chat, admin

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "helMisa API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Include routers
api_router.include_router(auth.router)
api_router.include_router(cafe.router)
api_router.include_router(request.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)

# Include the main router in the app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO event handlers
@sio.event
async def connect(sid):
    logging.info(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to helMisa'}, room=sid)

@sio.event
async def disconnect(sid):
    """
    Tarayıcı kapatıldığında veya bağlantı koptuğunda
    Session'ı otomatik sil (10 dakika sonra zaten expire olacak ama hemen sil)
    """
    logging.info(f"Client disconnected: {sid}")
    
    # socket_id'ye göre session bul ve sil
    try:
        result = await db.sessions.delete_one({"socket_id": sid})
        if result.deleted_count > 0:
            logging.info(f"✅ Session deleted for socket {sid}")
    except Exception as e:
        logging.error(f"Error deleting session on disconnect: {e}")

@sio.event
async def authenticate(sid, data):
    """
    Client sends JWT token to authenticate - socket_id'yi session'a kaydet
    """
    token = data.get('token')
    
    try:
        # Token'dan session_id al
        from utils.auth import verify_token
        payload = verify_token(token)
        session_id = payload.get('session_id')
        
        # Session'ı güncelle - socket_id ekle
        result = await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"socket_id": sid}}
        )
        
        if result.modified_count > 0:
            logging.info(f"✅ Socket {sid} authenticated for session {session_id[:8]}...")
        else:
            logging.warning(f"⚠️ Session {session_id[:8]}... not found or already had socket_id")
            
        await sio.emit('authenticated', {'success': True, 'session_id': session_id}, room=sid)
    except Exception as e:
        logging.error(f"❌ Authentication failed for socket {sid}: {e}")
        await sio.emit('authenticated', {'success': False, 'error': str(e)}, room=sid)

@sio.event
async def heartbeat(sid, data):
    """
    Client sends heartbeat every 30 seconds
    Update last_heartbeat but NOT expires_at (session must expire in 10 min)
    """
    from datetime import datetime, timezone
    try:
        await db.sessions.update_one(
            {"socket_id": sid},
            {"$set": {"last_heartbeat": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception as e:
        logging.error(f"Heartbeat update error: {e}")
    
    await sio.emit('heartbeat_ack', {'timestamp': data.get('timestamp')}, room=sid)

@sio.event
async def join_chat(sid, data):
    """
    Kullanıcı bir chat odasına katılır
    """
    chat_id = data.get('chat_id')
    await sio.enter_room(sid, f"chat_{chat_id}")
    logging.info(f"User {sid} joined chat room: chat_{chat_id}")

@sio.event
async def leave_chat(sid, data):
    """
    Kullanıcı chat odasından ayrılır
    """
    chat_id = data.get('chat_id')
    await sio.leave_room(sid, f"chat_{chat_id}")
    logging.info(f"User {sid} left chat room: chat_{chat_id}")

@sio.event
async def send_message(sid, data):
    """
    Mesaj gönder (WebSocket üzerinden)
    """
    chat_id = data.get('chat_id')
    message = data.get('message')
    
    # Odadaki herkese gönder
    await sio.emit('new_message', {
        'chat_id': chat_id,
        'message': message
    }, room=f"chat_{chat_id}", skip_sid=sid)
    
    logging.info(f"Message sent in chat {chat_id}")

@sio.event
async def typing_start(sid, data):
    """
    Kullanıcı yazmaya başladı
    """
    chat_id = data.get('chat_id')
    sender_id = data.get('sender_id')
    
    await sio.emit('user_typing', {
        'chat_id': chat_id,
        'sender_id': sender_id,
        'typing': True
    }, room=f"chat_{chat_id}", skip_sid=sid)

@sio.event
async def typing_stop(sid, data):
    """
    Kullanıcı yazmayı bıraktı
    """
    chat_id = data.get('chat_id')
    sender_id = data.get('sender_id')
    
    await sio.emit('user_typing', {
        'chat_id': chat_id,
        'sender_id': sender_id,
        'typing': False
    }, room=f"chat_{chat_id}", skip_sid=sid)

# Combine FastAPI and Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 helMisa backend starting...")
    logger.info(f"📊 Database: {os.environ['DB_NAME']}")
    logger.info(f"🌐 CORS Origins: {os.environ.get('CORS_ORIGINS', '*')}")
    
    # Initialize default cafe if not exists
    existing_cafe = await db.cafes.find_one({"name": "helMisa Demo"})
    if not existing_cafe:
        demo_cafe = {
            "id": "demo-cafe-001",
            "name": "helMisa Demo",
            "address": "Demo Location",
            "table_count": 20,
            "location": {"lat": 40.9887, "lng": 29.0258},
            "qr_base_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/qr/",
            "is_active": True
        }
        await db.cafes.insert_one(demo_cafe)
        logger.info("✅ Demo cafe created")
    
    # Background task: Otomatik expired session temizliği (her 1 dakika)
    import asyncio
    async def cleanup_expired_sessions():
        while True:
            try:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                # Expired session'ları sil
                result = await db.sessions.delete_many({
                    "expires_at": {"$lt": now.isoformat()}
                })
                
                if result.deleted_count > 0:
                    logger.info(f"🗑️ Cleaned up {result.deleted_count} expired sessions")
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
            
            # 60 saniye bekle
            await asyncio.sleep(60)
    
    # Background task başlat
    asyncio.create_task(cleanup_expired_sessions())
    logger.info("✅ Session cleanup task started (runs every 60 seconds)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 helMisa backend shutting down...")
