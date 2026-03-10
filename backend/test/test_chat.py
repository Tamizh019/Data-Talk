import asyncio
from app.routes.chat import stream_response, ChatRequest

async def main():
    print("Testing stream API directly...")
    req = ChatRequest(
        session_id="test-123",
        message="can i know about student details who are above cgpa 8.4 and below 7.4 ???",
        history=[]
    )
    try:
        async for event in stream_response(req):
            print("EVENT:", event.strip())
    except Exception as e:
        print("ERROR THROWN:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
