from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_pengelola_panti
from app.db.models.anak_asuh import AnakAsuh
from app.db.models.dana import LaporanDana
from app.db.models.donation import Donasi
from app.db.models.gallery import GaleriPanti
from app.db.models.panti import PantiAsuhan
from app.db.models.pengajuan_lksa import PengajuanLKSA
from app.db.models.user import User
from app.db.models.volunteer import Relawan
from app.db.models.wishlist import WishlistPanti
from app.schemas.anak_asuh import AnakAsuhCreate, AnakAsuhResponse, AnakAsuhUpdate
from app.schemas.dana import DanaResponse
from app.schemas.donation import DonationResponse, DonationStatus
from app.schemas.gallery import GalleryResponse
from app.schemas.notification import NotificationResponse
from app.schemas.panti import PantiResponse, PantiUpdate
from app.schemas.volunteer import VolunteerResponse, VolunteerStatus
from app.schemas.wishlist import WishlistCreate, WishlistResponse, WishlistUpdate
from app.services.ai_service import analyze_transfer_proof
from app.services.notification_service import (
    create_notification,
    get_user_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)
from app.db.models.adoption import PengajuanAdopsi
from app.schemas.adoption import AdoptionResponse
from app.services.storage import delete_stored_file, get_storage_absolute_path, save_upload_file


router = APIRouter()


def get_managed_panti(
    db: Session,
    current_user: User,
) -> PantiAsuhan:
    # Cari panti yang benar-benar dimiliki akun pengelola.
    panti = (
        db.query(PantiAsuhan)
        .filter(
            PantiAsuhan.id_admin_pengelola == current_user.id
        )
        .first()
    )

    if panti is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Panti belum terhubung dengan akun ini. "
                "Lengkapi pengajuan pendaftaran LKSA terlebih dahulu."
            ),
        )

    # Ambil pengajuan terbaru untuk panti tersebut.
    pengajuan = (
        db.query(PengajuanLKSA)
        .filter(PengajuanLKSA.id_panti == panti.id)
        .order_by(PengajuanLKSA.id.desc())
        .first()
    )

    if (
        pengajuan is None
        or pengajuan.status_pengajuan != "disetujui"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Akses operasional panti belum tersedia. "
                "Pengajuan LKSA harus disetujui Admin Dinsos terlebih dahulu."
            ),
        )

    return panti


@router.get(
    "/me",
    response_model=PantiResponse,
)
def get_my_panti(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    return get_managed_panti(db, current_user)


@router.put(
    "/me",
    response_model=PantiResponse,
)
def update_my_panti(
    data: PantiUpdate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    item = get_managed_panti(db, current_user)

    changes = data.model_dump(
        exclude_unset=True,
        exclude={"id_admin_pengelola", "status_akreditasi"},
    )

    for key, value in changes.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/wishlist",
    response_model=list[WishlistResponse],
)
def get_wishlist(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(WishlistPanti)
        .filter(WishlistPanti.id_panti == panti.id)
        .order_by(WishlistPanti.id.desc())
        .all()
    )


@router.post(
    "/wishlist",
    response_model=WishlistResponse,
    status_code=201,
)
def create_wishlist(
    data: WishlistCreate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)

    item = WishlistPanti(
        id_panti=panti.id,
        nama_barang=data.nama_barang,
        jumlah_kebutuhan=data.jumlah_kebutuhan,
        jumlah_terpenuhi=0,
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/wishlist/{wishlist_id}",
    response_model=WishlistResponse,
)
def update_wishlist(
    wishlist_id: int,
    data: WishlistUpdate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(WishlistPanti)
        .filter(
            WishlistPanti.id == wishlist_id,
            WishlistPanti.id_panti == panti.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Wishlist tidak ditemukan")

    changes = data.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(item, key, value)

    if item.jumlah_terpenuhi > item.jumlah_kebutuhan:
        raise HTTPException(
            422,
            "Jumlah terpenuhi tidak boleh melebihi jumlah kebutuhan",
        )

    db.commit()
    db.refresh(item)
    return item


@router.delete("/wishlist/{wishlist_id}")
def delete_wishlist(
    wishlist_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(WishlistPanti)
        .filter(
            WishlistPanti.id == wishlist_id,
            WishlistPanti.id_panti == panti.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Wishlist tidak ditemukan")

    db.delete(item)
    db.commit()
    return {"message": "Wishlist berhasil dihapus"}


@router.get(
    "/donasi",
    response_model=list[DonationResponse],
)
def get_panti_donations(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(Donasi)
        .filter(Donasi.id_panti == panti.id)
        .order_by(Donasi.id.desc())
        .all()
    )


@router.patch(
    "/donasi/{donation_id}/status",
    response_model=DonationResponse,
)
def update_donation_status(
    donation_id: int,
    new_status: DonationStatus,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(Donasi)
        .filter(
            Donasi.id == donation_id,
            Donasi.id_panti == panti.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Donasi tidak ditemukan")

    previous_status = item.status_verifikasi

    if previous_status == "terverifikasi" and new_status != "terverifikasi":
        raise HTTPException(409, "Donasi yang sudah terverifikasi tidak dapat dibatalkan dari dashboard panti")

    if previous_status == "ditolak" and new_status == "terverifikasi":
        raise HTTPException(409, "Donasi yang sudah ditolak tidak dapat diverifikasi ulang; minta donatur membuat pengajuan baru")

    item.status_verifikasi = new_status

    if (
        new_status == "terverifikasi"
        and previous_status != "terverifikasi"
        and item.jenis_donasi == "barang"
        and item.id_wishlist is not None
        and item.jumlah_barang
    ):
        wishlist = (
            db.query(WishlistPanti)
            .filter(WishlistPanti.id == item.id_wishlist)
            .first()
        )
        if wishlist is not None:
            wishlist.jumlah_terpenuhi = min(
                wishlist.jumlah_kebutuhan,
                wishlist.jumlah_terpenuhi + item.jumlah_barang,
            )

    create_notification(
        db,
        item.id_user,
        "Status Donasi",
        f"Status donasi #{item.id} berubah menjadi {new_status}.",
    )

    db.commit()
    db.refresh(item)
    return item


@router.post(
    "/laporan-dana",
    response_model=DanaResponse,
    status_code=201,
)
def upload_laporan_dana(
    file: UploadFile = File(...),
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)

    item = LaporanDana(
        id_panti=panti.id,
        file_laporan=save_upload_file(
            file,
            "laporan_dana",
        ),
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/laporan-dana",
    response_model=list[DanaResponse],
)
def get_laporan_dana(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(LaporanDana)
        .filter(LaporanDana.id_panti == panti.id)
        .order_by(LaporanDana.id.desc())
        .all()
    )


@router.delete("/laporan-dana/{laporan_id}")
def delete_laporan_dana(
    laporan_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(LaporanDana)
        .filter(LaporanDana.id == laporan_id, LaporanDana.id_panti == panti.id)
        .first()
    )
    if item is None:
        raise HTTPException(404, "Laporan dana tidak ditemukan")

    # Jangan menghapus baris jika file remote gagal dihapus.
    delete_stored_file(item.file_laporan)
    db.delete(item)
    db.commit()
    return {"message": "Laporan dana berhasil dihapus"}


@router.post(
    "/galeri",
    response_model=GalleryResponse,
    status_code=201,
)
def upload_gallery_photo(
    file: UploadFile = File(...),
    deskripsi: str | None = None,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)

    item = GaleriPanti(
        id_panti=panti.id,
        foto=save_upload_file(
            file,
            "galeri_panti",
        ),
        deskripsi=deskripsi,
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/galeri",
    response_model=list[GalleryResponse],
)
def get_gallery(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(GaleriPanti)
        .filter(GaleriPanti.id_panti == panti.id)
        .order_by(GaleriPanti.id.desc())
        .all()
    )


@router.delete("/galeri/{gallery_id}")
def delete_gallery(
    gallery_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(GaleriPanti)
        .filter(
            GaleriPanti.id == gallery_id,
            GaleriPanti.id_panti == panti.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Galeri tidak ditemukan")

    db.delete(item)
    db.commit()
    return {"message": "Foto galeri berhasil dihapus"}


def _get_own_donation(
    db: Session,
    current_user: User,
    donation_id: int,
) -> Donasi:
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(Donasi)
        .filter(
            Donasi.id == donation_id,
            Donasi.id_panti == panti.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Donasi tidak ditemukan")

    return item


@router.get("/donasi/{donation_id}/bukti")
def download_donation_proof(
    donation_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    """Pengelola membuka bukti transfer donasi untuk pantinya sendiri."""
    item = _get_own_donation(db, current_user, donation_id)

    # Hanya folder bukti_transfer yang boleh dibuka lewat endpoint ini.
    if not item.bukti_transfer or not item.bukti_transfer.startswith(
        "storage/bukti_transfer/"
    ):
        raise HTTPException(404, "Bukti transfer tidak tersedia")

    absolute_path = get_storage_absolute_path(item.bukti_transfer)

    if not absolute_path.is_file():
        raise HTTPException(404, "File bukti transfer tidak ditemukan")

    return FileResponse(absolute_path)


@router.post("/donasi/{donation_id}/analisis-bukti-ai")
def analyze_donation_proof(
    donation_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    """Analisis OCR bukti transfer + pencocokan nominal, sebagai alat bantu verifikasi."""
    item = _get_own_donation(db, current_user, donation_id)

    if not item.bukti_transfer:
        raise HTTPException(
            422,
            "Donasi ini tidak memiliki bukti transfer",
        )

    return analyze_transfer_proof(
        item.bukti_transfer,
        expected_amount=(
            item.jumlah_nominal if item.jenis_donasi == "uang" else None
        ),
    )


@router.get(
    "/notifikasi",
    response_model=list[NotificationResponse],
)
def get_panti_notifications(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    return get_user_notifications(db, current_user.id, limit)


@router.patch("/notifikasi/read-all")
def read_all_panti_notifications(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    return {
        "diperbarui": mark_all_notifications_read(db, current_user.id),
    }


@router.patch(
    "/notifikasi/{notification_id}/read",
    response_model=NotificationResponse,
)
def read_panti_notification(
    notification_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    item = mark_notification_read(db, current_user.id, notification_id)

    if item is None:
        raise HTTPException(404, "Notifikasi tidak ditemukan")

    return item


@router.get(
    "/pengajuan-adopsi",
    response_model=list[AdoptionResponse],
)
def get_panti_adoptions(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    # Hanya pengajuan yang ditujukan ke panti ini. Pengajuan panti lain
    # dan rekomendasi terbuka Dinsos (id_panti NULL) tidak ikut terlihat.
    panti = get_managed_panti(db, current_user)
    return (
        db.query(PengajuanAdopsi)
        .filter(PengajuanAdopsi.id_panti == panti.id)
        .order_by(PengajuanAdopsi.id.desc())
        .all()
    )


@router.patch(
    "/pengajuan-adopsi/{adoption_id}/rekomendasi",
    response_model=AdoptionResponse,
)
def update_panti_adoption_recommendation(
    adoption_id: int,
    action: str = "rekomendasikan",
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = (
        db.query(PengajuanAdopsi)
        .filter(
            PengajuanAdopsi.id == adoption_id,
            PengajuanAdopsi.id_panti == panti.id,
        )
        .first()
    )
    if item is None:
        raise HTTPException(404, "Pengajuan adopsi tidak ditemukan")
    if action in ["rekomendasikan", "terima", "diverifikasi"]:
        item.status = "diverifikasi"
    elif action in ["tolak", "ditolak"]:
        item.status = "ditolak"
    db.commit()
    db.refresh(item)
    return item


# ==========================================
# RELAWAN PANTI (hanya yang mendaftar ke panti ini)
# ==========================================

@router.get(
    "/relawan",
    response_model=list[VolunteerResponse],
)
def get_panti_volunteers(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(Relawan)
        .filter(Relawan.id_panti == panti.id)
        .order_by(Relawan.id.desc())
        .all()
    )


@router.patch(
    "/relawan/{volunteer_id}/status",
    response_model=VolunteerResponse,
)
def update_panti_volunteer_status(
    volunteer_id: int,
    new_status: VolunteerStatus,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    if new_status == "menunggu":
        raise HTTPException(422, "Keputusan harus disetujui atau ditolak")

    panti = get_managed_panti(db, current_user)
    item = (
        db.query(Relawan)
        .filter(
            Relawan.id == volunteer_id,
            Relawan.id_panti == panti.id,
        )
        .first()
    )
    if item is None:
        raise HTTPException(404, "Data relawan tidak ditemukan")

    item.status = new_status

    create_notification(
        db,
        item.id_user,
        "Status Relawan",
        f"Pendaftaran relawan #{item.id} di {panti.nama_panti} "
        f"berubah menjadi {new_status}.",
    )

    db.commit()
    db.refresh(item)
    return item


# ==========================================
# ANAK ASUH (milik panti yang sedang login saja)
# ==========================================

def _get_own_child(db: Session, panti: PantiAsuhan, child_id: int) -> AnakAsuh:
    item = (
        db.query(AnakAsuh)
        .filter(
            AnakAsuh.id == child_id,
            AnakAsuh.id_panti == panti.id,
        )
        .first()
    )
    if item is None:
        raise HTTPException(404, "Data anak asuh tidak ditemukan")
    return item


@router.get(
    "/anak-asuh",
    response_model=list[AnakAsuhResponse],
)
def get_children(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    return (
        db.query(AnakAsuh)
        .filter(AnakAsuh.id_panti == panti.id)
        .order_by(AnakAsuh.id.desc())
        .all()
    )


@router.post(
    "/anak-asuh",
    response_model=AnakAsuhResponse,
    status_code=201,
)
def create_child(
    data: AnakAsuhCreate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = AnakAsuh(id_panti=panti.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/anak-asuh/{child_id}",
    response_model=AnakAsuhResponse,
)
def update_child(
    child_id: int,
    data: AnakAsuhUpdate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = _get_own_child(db, panti, child_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/anak-asuh/{child_id}")
def delete_child(
    child_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    panti = get_managed_panti(db, current_user)
    item = _get_own_child(db, panti, child_id)
    db.delete(item)
    db.commit()
    return {"message": "Data anak asuh berhasil dihapus"}
