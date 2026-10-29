from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.db.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse

router = APIRouter()


# ==========================================
# REGISTER
# ==========================================


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Mendaftarkan user baru.

    User yang mendaftar melalui endpoint publik
    otomatis memiliki role 'masyarakat'.
    """

    # Cek email sudah terdaftar atau belum
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email sudah terdaftar"
        )

    # Registrasi publik hanya untuk masyarakat dan pengelola panti
    requested_role = user_data.peran or user_data.role or "masyarakat"

    if requested_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Registrasi Admin Dinsos tidak tersedia untuk publik. "
                "Hubungi administrator untuk membuat akun petugas."
            ),
        )

    if requested_role not in ("masyarakat", "pengelola-panti"):
        requested_role = "masyarakat"

    # Buat user baru
    new_user = User(
        nama=user_data.nama,
        email=user_data.email,
        no_hp=user_data.no_hp,
        password_hash=hash_password(user_data.password),
        peran=requested_role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Jika pengelola-panti, pastikan ada panti asuhan yang terhubung
    if requested_role == "pengelola-panti":
        from app.db.models.panti import PantiAsuhan

        existing_panti = (
            db.query(PantiAsuhan)
            .filter(PantiAsuhan.id_admin_pengelola == new_user.id)
            .first()
        )
        if not existing_panti:
            new_panti = PantiAsuhan(
                nama_panti=f"LKSA {new_user.nama}",
                alamat="Kabupaten Bogor",
                kontak=new_user.no_hp or "0812-0000-0000",
                status_akreditasi="AKREDITASI B",
                jumlah_anak_asuh=20,
                id_admin_pengelola=new_user.id,
            )
            db.add(new_panti)
            db.commit()

    return new_user


# ==========================================
# LOGIN
# ==========================================


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Login menggunakan email dan password.

    Pada Swagger, kolom 'username' diisi dengan email.
    """

    user = db.query(User).filter(User.email == form_data.username).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.peran})

    return {"access_token": access_token, "token_type": "bearer"}
