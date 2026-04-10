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

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main FastAPI app
app = FastAPI(title="helMisa API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes
from routes import auth, cafe, request

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
    logging.info(f"Client connected: {sid}")
    await sio.emit('connected', {'message': 'Connected to helMisa'}, room=sid)

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")
    # Handle user going offline
    # TODO: Update session status to offline

@sio.event
async def authenticate(sid, data):
    """
    Client sends JWT token to authenticate
    """
    token = data.get('token')
    # TODO: Verify token and link socket to session
    logging.info(f"Authentication request from {sid}")
    await sio.emit('authenticated', {'success': True}, room=sid)

@sio.event
async def heartbeat(sid, data):
    """
    Client sends heartbeat every 30 seconds
    """
    # TODO: Update last_heartbeat in session
    await sio.emit('heartbeat_ack', {'timestamp': data.get('timestamp')}, room=sid)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 helMisa backend shutting down...")
