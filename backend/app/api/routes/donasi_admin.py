from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.db.models.donation import Donasi
from app.db.models.panti import PantiAsuhan
from app.db.models.user import User
from app.db.models.wishlist import WishlistPanti
from app.schemas.donation import AdminDonationResponse


router = APIRouter()


@router.get(
    "/donasi",
    response_model=list[AdminDonationResponse],
)
def get_admin_donations(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Mengambil seluruh transaksi donasi untuk Dashboard Admin Dinsos,
    lengkap dengan nama donatur dan nama panti dari database.
    """

    rows = (
        db.query(Donasi, User.nama, PantiAsuhan.nama_panti)
        .outerjoin(User, User.id == Donasi.id_user)
        .outerjoin(PantiAsuhan, PantiAsuhan.id == Donasi.id_panti)
        .order_by(
            Donasi.tanggal_donasi.desc(),
            Donasi.id.desc(),
        )
        .all()
    )

    result = []
    for donation, nama_donatur, nama_panti in rows:
        item = AdminDonationResponse.model_validate(donation)
        item.nama_donatur = nama_donatur
        item.nama_panti = nama_panti
        result.append(item)

    return result


def _urgency_from_wishlist(items: list[WishlistPanti]) -> tuple[str, list[str]]:
    """Turunkan tingkat urgensi dari kekurangan wishlist panti.

    Rasio kekurangan = (dibutuhkan - terpenuhi) / dibutuhkan, diambil yang
    tertinggi di antara seluruh barang. >=75% Kritis, >=50% Tinggi,
    >0% Sedang. Tanpa data wishlist dikembalikan "Belum ada data".
    """
    if not items:
        return "Belum ada data", []

    shortages = []
    for item in items:
        needed = int(item.jumlah_kebutuhan or 0)
        done = int(item.jumlah_terpenuhi or 0)
        if needed <= 0 or done >= needed:
            continue
        shortages.append(((needed - done) / needed, needed - done, item))

    if not shortages:
        return "Terpenuhi", []

    shortages.sort(key=lambda row: (row[0], row[1]), reverse=True)
    top_ratio = shortages[0][0]
    if top_ratio >= 0.75:
        level = "Kritis"
    elif top_ratio >= 0.5:
        level = "Tinggi"
    else:
        level = "Sedang"

    names = [
        f"{row[2].nama_barang} (kurang {row[1]})"
        for row in shortages[:3]
    ]
    return level, names


@router.get("/donasi-rekap-panti")
def get_donation_recap_per_panti(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Rekap donasi & kebutuhan seluruh panti untuk Audit Donasi Dinsos."""

    panti_list = db.query(PantiAsuhan).order_by(PantiAsuhan.nama_panti).all()

    money_rows = (
        db.query(
            Donasi.id_panti,
            func.coalesce(func.sum(Donasi.jumlah_nominal), 0),
            func.count(Donasi.id),
        )
        .filter(
            Donasi.jenis_donasi == "uang",
            Donasi.status_verifikasi == "terverifikasi",
        )
        .group_by(Donasi.id_panti)
        .all()
    )
    money = {r[0]: (Decimal(str(r[1])), int(r[2])) for r in money_rows}

    goods_rows = (
        db.query(
            Donasi.id_panti,
            func.coalesce(func.sum(Donasi.jumlah_barang), 0),
            func.count(Donasi.id),
        )
        .filter(
            Donasi.jenis_donasi == "barang",
            Donasi.status_verifikasi == "terverifikasi",
        )
        .group_by(Donasi.id_panti)
        .all()
    )
    goods = {r[0]: (int(r[1]), int(r[2])) for r in goods_rows}

    pending_rows = (
        db.query(Donasi.id_panti, func.count(Donasi.id))
        .filter(Donasi.status_verifikasi == "menunggu")
        .group_by(Donasi.id_panti)
        .all()
    )
    pending = {r[0]: int(r[1]) for r in pending_rows}

    wishlist_by_panti: dict[int, list[WishlistPanti]] = {}
    for item in db.query(WishlistPanti).all():
        wishlist_by_panti.setdefault(item.id_panti, []).append(item)

    result = []
    for panti in panti_list:
        total_money, money_count = money.get(panti.id, (Decimal("0"), 0))
        total_goods, goods_count = goods.get(panti.id, (0, 0))
        urgency, needs = _urgency_from_wishlist(
            wishlist_by_panti.get(panti.id, [])
        )
        result.append(
            {
                "id_panti": panti.id,
                "nama_panti": panti.nama_panti,
                "alamat": panti.alamat,
                "uang_terverifikasi": str(total_money),
                "jumlah_donasi_uang": money_count,
                "total_barang_diterima": total_goods,
                "jumlah_donasi_barang": goods_count,
                "donasi_menunggu": pending.get(panti.id, 0),
                "tingkat_urgensi": urgency,
                "kebutuhan_mendesak": needs,
            }
        )

    return result
