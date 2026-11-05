from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.db.models.donation import Donasi
from app.db.models.user import User
from app.schemas.donation import DonationResponse


router = APIRouter()


@router.get(
    "/donasi",
    response_model=list[DonationResponse],
)
def get_admin_donations(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Mengambil seluruh transaksi donasi
    untuk Dashboard Admin Dinsos.
    """

    donations = (
        db.query(Donasi)
        .order_by(
            Donasi.tanggal_donasi.desc(),
            Donasi.id.desc(),
        )
        .all()
    )

    return donations