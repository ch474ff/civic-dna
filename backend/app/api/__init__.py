from fastapi import APIRouter

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.clusters import router as clusters_router
from app.api.complaints import router as complaints_router
from app.api.public import router as public_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(complaints_router, prefix="/complaints", tags=["complaints"])
api_router.include_router(clusters_router, prefix="/clusters", tags=["clusters"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(public_router, prefix="/public", tags=["public"])
