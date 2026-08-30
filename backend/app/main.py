from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.auth.jwt import bootstrap_officer
from app.config import get_settings
from app.database import Base, configure_engine, get_engine, get_session_factory


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_engine(settings.database_url)
    if settings.civic_create_tables:
        from app import models  # noqa: F401

        Base.metadata.create_all(get_engine())
    db = get_session_factory()()
    try:
        bootstrap_officer(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router, prefix="/api")

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.exception_handler(HTTPException)
    async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            content = exc.detail
        else:
            content = {
                "error": {
                    "code": "http_error",
                    "message": str(exc.detail),
                    "details": None,
                }
            }
        return JSONResponse(status_code=exc.status_code, content=content)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": jsonable_encoder(exc.errors()),
                }
            },
        )

    return application


app = create_app()
