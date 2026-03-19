from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uvicorn
import time
import uuid
import traceback
from pathlib import Path
from neo4j_client import save_concepts_hierarchical, get_all_documents

# Import the logic you built earlier!
from pdf_librarian import extract_text
from pdf_thinker import extract_concepts_hierarchical

app = FastAPI()

# 1. Setup "CORS" (Cross-Origin Resource Sharing)
# This allows your React App (port 5174) to talk to this Python server (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ConceptWeaver AI Brain is Online!"}
@app.get("/documents")
def get_documents():
    try:
        documents = get_all_documents()
        return {"documents" : documents}
    except Exception as e:
        return {"error": str(e)}
@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    # 2. Save the uploaded file with a UNIQUE name to prevent Windows locking collisions
    session_id = str(uuid.uuid4())[:8]
    temp_filename = f"temp_{session_id}_{file.filename}"
    temp_path = Path(temp_filename)

    try:
        # Save the upload
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 3. RUN THE PIPELINE
        from pdf_librarian import extract_chapters
        chapter_data = extract_chapters(str(temp_path))
        
        concepts = extract_concepts_hierarchical(chapter_data)
        print(f"Extracted {len(concepts)} structural concepts")
        
        save_concepts_hierarchical(file.filename, concepts)
        
        return {
            "filename": file.filename,
            "concepts": concepts
        }
    except Exception as e:
        print(f"Backend Error: {e}")
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 4. Explicit Cleanup
        await file.close() # Release the UploadFile handle
        
        try:
            if temp_path.exists():
                # On Windows, we might need a tiny delay or multiple attempts 
                # but for now, we just suppress if it fails once.
                temp_path.unlink() 
                print(f"Cleaned up: {temp_filename}")
        except Exception as cleanup_err:
            print(f"Cleanup Deferred (File Locked): {cleanup_err}")

if __name__ == "__main__":
    # Run the server on Port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
