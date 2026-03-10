import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    db_url = os.getenv("TARGET_DB_URL")
    if not db_url:
        print("TARGET_DB_URL not found in .env")
        return
    
    # asyncpg expects postgres:// instead of postgresql+asyncpg://
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgres://")
        
    print(f"Attempting to connect to: {db_url.split('@')[1] if '@' in db_url else db_url}")
    try:
        conn = await asyncpg.connect(db_url)
        print("✅ Successfully connected to the database!")
        version = await conn.fetchval('SELECT version();')
        print(f"Database version: {version}")
        await conn.close()
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
