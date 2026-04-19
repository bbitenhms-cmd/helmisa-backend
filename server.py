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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'helmisa')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

mgr = None
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    mgr = socketio.AsyncRedisManager(redis_url)

sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=mgr,
    cors_allowed_origins=['*'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

app = FastAPI(title="helMisa API", version="1.2.0")
api_router = APIRouter(prefix="/api")

from routes import auth, cafe, request, chat, admin
api_router.include_router(auth.router)
api_router.include_router(cafe.router)
api_router.include_router(request.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SOCKET.IO LOGIC BASED ON SPEC ---
@sio.event
async def connect(sid, environ):
    logger.info(f"🔌 Client connected: {sid}")

@sio.event
async def authenticate(sid, data):
    token = data.get('token')
    if not token: return
    try:
        from utils.auth import verify_token
        payload = verify_token(token)
        session_id = payload.get('session_id')
        
        # SPEC: Ensure stable sync by joining a room named after session_id
        # This ensures notifications reach the user even if socket_id changes
        await sio.enter_room(sid, f"session_{session_id}")
        
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"socket_id": sid, "is_online": True}}
        )
        
        logger.info(f"✅ User authenticated. Joined room: session_{session_id}")
        await sio.emit('authenticated', {'success': True}, room=sid)
    except Exception as e:
        logger.error(f"Socket auth error: {e}")

@sio.event
async def disconnect(sid):
    logger.info(f"📴 Client disconnected: {sid}")
    # Optionally handle offline state here based on spec

socket_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup_event():
    # Ensure Demo Cafe
    cid = "demo-cafe-001"
    if not await db.cafes.find_one({"id": cid}):
        await db.cafes.insert_one({
            "id": cid, "name": "helMisa Demo", "address": "Railway",
            "table_count": 20, "location": {"lat": 0, "lng": 0}, "is_active": True
        })
