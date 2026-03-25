from fastapi import APIRouter, File, UploadFile, HTTPException
import shutil
import os
import logging
from app.core.document_indexer import index_document_file

router = APIRouter()
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", tags=["upload"])
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".txt", ".csv", ".pdf", ".md", ".json")):
        raise HTTPException(status_code=400, detail="Only TXT, CSV, PDF, MD, and JSON files are supported.")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        # Save file to disk temporarily
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        success = await index_document_file(file_path)
        
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if success:
            return {"status": "success", "message": f"Successfully indexed {file.filename} into knowledge base."}
        else:
            raise HTTPException(status_code=500, detail="Failed to parse and index document text. File might be empty or unreadable.")
            
    except Exception as e:
        logger.error(f"Error handling file upload: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
