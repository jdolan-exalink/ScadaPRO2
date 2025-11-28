from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import yaml

CONFIG_PATH = os.getenv("CONFIG_PATH", "/app/config")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.yml")

def get_db_url():
    # Use environment variables if available, otherwise fall back to settings.yml
    db_host = os.getenv("DB_HOST")
    if db_host:
        db_port = os.getenv("DB_PORT", "5432")
        db_user = os.getenv("DB_USER", "backend")
        db_password = os.getenv("DB_PASSWORD", "backend_password")
        db_name = os.getenv("DB_NAME", "industrial")
        db_driver = os.getenv("DB_DRIVER", "postgresql+asyncpg")
        return f"{db_driver}://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            config = yaml.safe_load(f)
            db_conf = config.get("database", {})
            return f"{db_conf.get('driver')}://{db_conf.get('user')}:{db_conf.get('password')}@{db_conf.get('host')}:{db_conf.get('port')}/{db_conf.get('name')}"
    return os.getenv("DB_URL", "postgresql+asyncpg://backend:backend_pass@localhost:5432/industrial")

DATABASE_URL = get_db_url()

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
