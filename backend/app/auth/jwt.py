from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import pbkdf2_hmac
from os import urandom
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Officer

bearer_scheme = HTTPBearer(auto_error=False)
_HASH_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = urandom(16)
    derived = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _HASH_ITERATIONS)
    return f"{salt.hex()}${derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, derived_hex = stored.split("$", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    check = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _HASH_ITERATIONS)
    return check.hex() == derived_hex


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire, "role": "officer"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def bootstrap_officer(db: Session) -> None:
    settings = get_settings()
    username = settings.officer_bootstrap_username
    password = settings.officer_bootstrap_password
    if not username or not password:
        return
    existing = db.query(Officer).filter(Officer.username == username).one_or_none()
    if existing:
        return
    officer = Officer(
        officer_id=str(uuid4()),
        username=username,
        hashed_password=hash_password(password),
        role="officer",
    )
    db.add(officer)
    db.commit()


def get_current_officer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Officer:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Officer JWT required", "details": None}},
        )
    try:
        payload = decode_access_token(credentials.credentials)
        username = payload.get("sub")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Invalid or expired token", "details": None}},
        ) from exc
    officer = db.query(Officer).filter(Officer.username == username).one_or_none()
    if officer is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Unknown officer", "details": None}},
        )
    return officer
