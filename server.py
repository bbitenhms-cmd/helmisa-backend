from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import socketio
import logging
from base import sio, app as base_app

# Configure logging
logger = logging.getLogger(__name__)

# Create the main FastAPI app
app = FastAPI(title="helMisa API", version="1.3.0")

# Import routes and include them
from routes import auth, cafe, request, chat, admin

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(cafe.router)
api_router.include_router(request.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)

# Root & Health
@api_router.get("/")
async def root():
    return {"message": "helMisa API v1.3.0 is Online", "status": "success"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SOCKET.IO HANDLERS ---
@sio.event
async def connect(sid, environ):
    logger.info(f"🔌 Socket Connected: {sid}")

@sio.event
async def authenticate(sid, data):
    token = data.get('token')
    if not token: return
    try:
        from utils.auth import verify_token
        from base import db
        payload = verify_token(token)
        session_id = payload.get('session_id')
        
        # Join specific session room
        await sio.enter_room(sid, f"session_{session_id}")
        
        await db.sessions.update_one(
            {"id": session_id},
            {"$set": {"socket_id": sid, "is_online": True}}
        )
        
        logger.info(f"✅ Session {session_id} joined room")
        await sio.emit('authenticated', {'success': True}, room=sid)
    except Exception as e:
        logger.error(f"Auth error: {e}")

@sio.event
async def disconnect(sid):
    logger.info(f"📴 Socket Disconnected: {sid}")

# Combine into ASGI App
socket_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup_event():
    from base import db
    cid = "demo-cafe-001"
    if not await db.cafes.find_one({"id": cid}):
        await db.cafes.insert_one({
            "id": cid, "name": "helMisa Demo", "address": "Railway",
            "table_count": 20, "location": {"lat": 0, "lng": 0}, "is_active": True
        })
        logger.info("✅ Demo Cafe Initialized")
