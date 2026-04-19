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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection setup
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'helmisa')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Socket.IO Redis Manager
mgr = None
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    try:
        logger.info(f"🔄 Using Redis Manager at {redis_url}")
        mgr = socketio.AsyncRedisManager(redis_url)
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=mgr,
    cors_allowed_origins=['*'],  # Allow all during testing to rule out CORS issues
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Create the main FastAPI app
app = FastAPI(title="helMisa API", version="1.1.2")

# Import routes and include them
from routes import auth, cafe, request, chat, admin

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(cafe.router)
api_router.include_router(request.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)

app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"🔌 Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to helMisa'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"📴 Client disconnected: {sid}")
    try:
        await db.sessions.delete_one({"socket_id": sid})
    except Exception as e:
        logger.error(f"Error cleaning up session: {e}")

@sio.event
async def authenticate(sid, data):
    token = data.get('token')
    if not token: return
    
    try:
        from utils.auth import verify_token
        payload = verify_token(token)
        session_id = payload.get('session_id')
        
        # Force update socket_id for the session
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"socket_id": sid, "is_online": True}}
        )
        
        logger.info(f"✅ Socket {sid} verified for session {session_id}")
        await sio.emit('authenticated', {'success': True}, room=sid)
    except Exception as e:
        logger.error(f"Socket auth error: {e}")

@sio.event
async def heartbeat(sid, data):
    from datetime import datetime, timezone
    try:
        await db.sessions.update_one(
            {"socket_id": sid},
            {"$set": {"last_heartbeat": datetime.now(timezone.utc).isoformat(), "is_online": True}}
        )
    except: pass

# Combine FastAPI and Socket.IO
socket_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 helMisa backend version 1.1.2 starting...")
    
    # FIXED: Create multiple variations of the demo cafe ID to ensure frontend matches
    cafe_ids = ["demo-cafe-001", "demo_cafe_001", "demo-cafe"]
    for cid in cafe_ids:
        existing = await db.cafes.find_one({"id": cid})
        if not existing:
            await db.cafes.insert_one({
                "id": cid,
                "name": "helMisa Demo Cafe",
                "address": "Railway Production",
                "table_count": 20,
                "location": {"lat": 40.9, "lng": 29.0},
                "qr_base_url": "https://helmisa.app/qr/",
                "is_active": True
            })
            logger.info(f"✅ Created missing cafe ID: {cid}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 helMisa backend shutting down...")
