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

if not mongo_url:
    logger.error("❌ MONGO_URL is not set!")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Socket.IO Redis Manager
mgr = None
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    logger.info(f"🔄 Using Redis Manager at {redis_url}")
    mgr = socketio.AsyncRedisManager(redis_url)

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
app = FastAPI(title="helMisa API", version="1.1.1")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes
from routes import auth, cafe, request, chat, admin
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
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to helMisa'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    try:
        await db.sessions.delete_one({"socket_id": sid})
    except Exception as e:
        logger.error(f"Error deleting session: {e}")

@sio.event
async def authenticate(sid, data):
    token = data.get('token')
    if not token:
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
    logger.info("🚀 helMisa backend version 1.1.1 starting...")
    
    # ENSURE DEMO CAFE EXISTS (This fixes the 'Cafe not found' error)
    demo_cafe_id = "demo-cafe-001"
    existing_cafe = await db.cafes.find_one({"id": demo_cafe_id})
    
    if not existing_cafe:
        logger.info("💡 Creating demo cafe 'demo-cafe-001'...")
        demo_cafe = {
            "id": demo_cafe_id,
            "name": "helMisa Demo",
            "address": "Demo Location",
            "table_count": 20,
            "location": {"lat": 40.9887, "lng": 29.0258},
            "qr_base_url": "https://helmisa.app/qr/",
            "is_active": True
        }
        await db.cafes.insert_one(demo_cafe)
        logger.info("✅ Demo cafe successfully created")
    else:
        logger.info("✅ Demo cafe already exists")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 helMisa backend shutting down...")
