from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# CRITICAL: Check for environment variables before starting
required_vars = ['MONGO_URL', 'DB_NAME']
missing_vars = [var for var in required_vars if not os.environ.get(var)]

if missing_vars:
    logger.error(f"❌ FATAL ERROR: Missing environment variables: {', '.join(missing_vars)}")
    logger.error("💡 PLEASE ADD THESE TO RAILWAY VARIABLES TAB!")
    # Don't exit immediately so logs can be read in some environments, but app won't work

# MongoDB connection setup with error handling
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'helmisa')

try:
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
    else:
        db = None
        logger.warning("⚠️ MongoDB client not initialized due to missing URL")
except Exception as e:
    logger.error(f"❌ MongoDB Connection Error: {e}")
    db = None

# Socket.IO Redis Manager
mgr = None
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    try:
        logger.info(f"🔄 Using Redis Manager at {redis_url}")
        mgr = socketio.AsyncRedisManager(redis_url)
    except Exception as e:
        logger.error(f"⚠️ Redis Error: {e}. Falling back to non-redis mode.")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=mgr,
    cors_allowed_origins=['https://helmisa.app', 'https://helmisa-frontend.vercel.app', 'http://localhost:3000'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Create the main FastAPI app
app = FastAPI(title="helMisa API", version="1.1.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes after db check to prevent crash on startup
try:
    from routes import auth, cafe, request, chat, admin
    api_router.include_router(auth.router)
    api_router.include_router(cafe.router)
    api_router.include_router(request.router)
    api_router.include_router(chat.router)
    api_router.include_router(admin.router)
except Exception as e:
    logger.error(f"❌ Error loading routes: {e}")

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
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to helMisa'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    if db is not None:
        try:
            result = await db.sessions.delete_one({"socket_id": sid})
            if result.deleted_count > 0:
                logger.info(f"✅ Session deleted for socket {sid}")
        except Exception as e:
            logger.error(f"Error deleting session on disconnect: {e}")

@sio.event
async def authenticate(sid, data):
    token = data.get('token')
    if not token or db is None:
        return
    
    try:
        from utils.auth import verify_token
        payload = verify_token(token)
        session_id = payload.get('session_id')
        
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"socket_id": sid}}
        )
        
        logger.info(f"✅ Socket {sid} authenticated for session {session_id}")
        await sio.emit('authenticated', {'success': True}, room=sid)
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        await sio.emit('authenticated', {'success': False, 'error': str(e)}, room=sid)

# Combine FastAPI and Socket.IO
socket_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 helMisa backend version 1.1.0 starting...")
    if db is not None:
        logger.info("✅ Database initialized")
    else:
        logger.error("❌ Database NOT initialized!")

@app.on_event("shutdown")
async def shutdown_db_client():
    if 'client' in globals() and client:
        client.close()
    logger.info("👋 helMisa backend shutting down...")
