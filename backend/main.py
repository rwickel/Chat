# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.files import router as files_router
import uvicorn

app = FastAPI(title="Document Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(files_router, prefix="/api", tags=["files"])

@app.get("/")
def root():
    return {"message": "Server is running well"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
