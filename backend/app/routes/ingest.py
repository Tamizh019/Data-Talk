"""
POST /ingest — Upload a PDF and ingest it into the Qdrant vector store.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from app.core.ingestion import ingest_uploaded_file

router = APIRouter(prefix="/api", tags=["ingestion"])


@router.post("/ingest")
async def ingest_document(file: UploadFile = File(...)) -> JSONResponse:
    """
    Accepts a PDF upload, parses it, chunks it, embeds it with bge-large,
    and stores it in Qdrant.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    # Read file bytes
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=413, detail="File too large (max 50MB).")

    try:
        result = await ingest_uploaded_file(
            file_bytes=file_bytes,
            filename=file.filename,
        )
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Successfully ingested '{file.filename}'",
                "details": result,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {str(e)}",
        )
