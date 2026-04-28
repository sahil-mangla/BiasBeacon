import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.routes.api import router
from backend.controllers.fairness_controller import initialize_data

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_data()
    yield

print("Starting Fairness Forecaster API...")
app = FastAPI(title="Fairness Forecaster API", lifespan=lifespan)
print("FastAPI app instance created.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-436542799320.us-central1.run.app",
        "http://localhost:3000",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
