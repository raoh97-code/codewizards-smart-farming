"""
Auth routes — Insert User (Signup) & Login User.
Aligned to the `users` table.
"""

from fastapi import APIRouter, HTTPException, status
from database import supabase
from auth import hash_password, verify_password, create_access_token
from models import SignupRequest, LoginRequest, TokenResponse, UserOut

router = APIRouter()


# ------------------------------------------------------------------ #
#  POST /api/auth/signup — Insert user into `users` table            #
# ------------------------------------------------------------------ #
@router.post(
    "/signup",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def signup(body: SignupRequest):
    """
    Insert a new row into the **users** table.

    - Rejects duplicate emails (409)
    - Stores a bcrypt password hash — the plain password is never saved
    """
    # 1. Duplicate-email check
    existing = (
        supabase.table("users")
        .select("id")
        .eq("email", body.email)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # 2. Insert — columns: name, email, password_hash
    result = (
        supabase.table("users")
        .insert({
            "name":          body.name,
            "email":         body.email,
            "password_hash": hash_password(body.password),
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user.",
        )

    row = result.data[0]
    return UserOut(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        created_at=row["created_at"],
    )


# ------------------------------------------------------------------ #
#  POST /api/auth/login — Lookup user, verify password, return JWT   #
# ------------------------------------------------------------------ #
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
)
def login(body: LoginRequest):
    """
    Fetch user from **users** table by email, verify bcrypt password,
    and return a signed JWT.
    """
    result = (
        supabase.table("users")
        .select("id, name, email, password_hash")
        .eq("email", body.email)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user = result.data

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({
        "sub":   user["id"],
        "email": user["email"],
        "name":  user["name"],
    })
    return TokenResponse(access_token=token)
