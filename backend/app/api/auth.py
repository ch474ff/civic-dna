from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token, verify_password
from app.database import get_db
from app.models import Officer
from app.schemas import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    officer = db.query(Officer).filter(Officer.username == payload.username).one_or_none()
    if officer is None or not verify_password(payload.password, officer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Invalid credentials", "details": None}},
        )
    return TokenResponse(access_token=create_access_token(officer.username))
