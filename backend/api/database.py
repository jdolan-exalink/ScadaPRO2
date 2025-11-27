from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import yaml

CONFIG_PATH = os.getenv("CONFIG_PATH", "/app/config")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.yml")

def get_db_url():
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
