from app.config import get_settings
from sqlalchemy.ext.asyncio import create_async_engine
import asyncio
from app.core import sql_executor

async def main():
    settings = get_settings()
    settings.target_db_url = "mysql+aiomysql://root:Tamizh@1234@localhost:3306/chill_space_db"
    
    # simulate what main.py does!
    engine = sql_executor.get_db_engine()
    print("Engine:", engine.url)
    
    try:
        async with engine.connect() as conn:
            print("Connected!")
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    asyncio.run(main())
