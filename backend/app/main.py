from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.meetings import router as meetings_router
from app.config import settings
from app.models.schemas import HealthResponse


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Event reconciliation service that "
        "combines CRM and Calendar meeting data."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    meetings_router,
    prefix=settings.API_PREFIX,
)


@app.get(
    "/api/health",
    response_model=HealthResponse,
)
def health():

    return HealthResponse(
        status="UP",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@app.get("/")
def root():

    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }