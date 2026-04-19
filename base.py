import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
from dotenv import load_dotenv
from pathlib import Path

# Load Env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database Init
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'helmisa')

if not mongo_url:
    logger.error("❌ MONGO_URL is missing!")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Socket Init with Redis support
mgr = None
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    try:
        mgr = socketio.AsyncRedisManager(redis_url)
        logger.info("🔄 Redis Manager connected")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

sio = socketio.AsyncServer(
    async_mode='asgi',
    client_manager=mgr,
    cors_allowed_origins=['*'],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)
