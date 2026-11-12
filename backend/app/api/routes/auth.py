
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.db.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse


router = APIRouter()


# ==========================================
# REGISTER
# ==========================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Registrasi akun masyarakat atau pengelola LKSA.

    Pembuatan akun pengelola TIDAK otomatis membuat
    data panti_asuhan.

    Setelah akun dibuat, pengelola harus mengajukan
    pendaftaran LKSA melalui proses pengajuan terpisah.
    """

    # 1. Normalisasi input
    clean_name = user_data.nama.strip()
    clean_email = str(user_data.email).strip().lower()
    clean_phone = (
        user_data.no_hp.strip()
        if user_data.no_hp
        else None
    )

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nama lengkap wajib diisi.",
        )

    # 2. Periksa email
    existing_user = (
        db.query(User)
        .filter(User.email == clean_email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar.",
        )

    # 3. Tentukan role
    requested_role = (
        user_data.peran
        or user_data.role
        or "masyarakat"
    )

    # Registrasi admin tidak diperbolehkan melalui publik
    if requested_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Registrasi Admin Dinsos tidak tersedia "
                "untuk publik. Hubungi administrator."
            ),
        )

    if requested_role not in (
        "masyarakat",
        "pengelola-panti",
    ):
        requested_role = "masyarakat"

    # 4. Buat akun pengguna
    new_user = User(
        nama=clean_name,
        email=clean_email,
        no_hp=clean_phone,
        password_hash=hash_password(user_data.password),
        peran=requested_role,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah digunakan oleh akun lain.",
        )

    except Exception:
        db.rollback()
        raise

    # 5. Tidak ada pembuatan PantiAsuhan otomatis.
    #
    # Pengelola akan membuat pengajuan LKSA melalui
    # endpoint pengajuan yang terpisah.

    return new_user


# ==========================================
# LOGIN
# ==========================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login menggunakan email dan password.

    Pada Swagger, kolom username diisi dengan email.
    """

    clean_email = form_data.username.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == clean_email)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.peran,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
