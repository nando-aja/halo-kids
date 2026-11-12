from typing import Literal

from pydantic import BaseModel

from app.db.models.pengajuan_lksa import PengajuanLKSA
from app.db.models.dokumen_pengajuan_lksa import DokumenPengajuanLKSA

from app.schemas.pengajuan_lksa import (
    PengajuanLKSAResponse,
    DokumenPengajuanResponse,
)

from app.services.lksa_storage import create_lksa_signed_url
from datetime import date, datetime, time, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.db.models.adoption import PengajuanAdopsi
from app.db.models.donation import Donasi
from app.db.models.dana import LaporanDana
from app.db.models.gallery import GaleriPanti
from app.db.models.notification import Notifikasi
from app.db.models.panti import PantiAsuhan
from app.db.models.report import LaporanPengaduan
from app.db.models.user import User
from app.db.models.volunteer import Relawan
from app.db.models.wishlist import WishlistPanti
from app.schemas.adoption import AdoptionResponse, AdoptionStatus
from app.schemas.calendar import VisitEventCreate, VisitEventResponse, VisitEventUpdate
from app.schemas.donation import DonationResponse, DonationStatus
from app.schemas.notification import NotificationResponse
from app.schemas.panti import PantiCreate, PantiResponse, PantiUpdate
from app.schemas.report import ReportResponse, ReportStatus
from app.schemas.user import UserResponse, UserRoleUpdate
from app.schemas.volunteer import VolunteerResponse, VolunteerStatus, VolunteerUpdate
from app.services.ai_service import analyze_adoption_documents, analyze_transfer_proof
from app.services import visit_calendar
from app.db.models.report_audit import AuditLogPengaduan
from app.services.notification_service import (
    create_notification,
    mark_all_notifications_read,
    mark_notification_read,
)
from app.services.storage import get_storage_absolute_path, save_upload_file
from app.services.report_attachments import get_admin_signed_report_attachments

router = APIRouter()
# ==========================================
# SCHEMA VERIFIKASI LKSA
# ==========================================

class DokumenLKSAReview(BaseModel):
    status_verifikasi: Literal[
        "valid",
        "tidak_valid",
        "perlu_perbaikan",
    ]

    catatan_verifikasi: str | None = None


class PengajuanLKSAReview(BaseModel):
    status_pengajuan: Literal[
        "ditinjau",
        "menunggu_tinjauan_manual",
        "perlu_perbaikan",
        "disetujui",
        "ditolak",
    ]

    catatan_admin: str | None = None


def validate_manager(
    db: Session,
    user_id: int | None,
) -> None:
    if user_id is None:
        return

    user = db.query(User).filter(User.id == user_id).first()

    if user is None or user.peran != "pengelola-panti":
        raise HTTPException(
            422,
            "id_admin_pengelola harus mengarah ke user pengelola-panti",
        )


@router.get(
    "/users",
    response_model=list[UserResponse],
)
def get_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.id.desc()).all()


@router.patch(
    "/users/{user_id}/role",
    response_model=UserResponse,
)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(404, "User tidak ditemukan")

    if user.id == current_user.id and data.peran != "admin":
        raise HTTPException(
            400,
            "Role admin akun yang sedang dipakai tidak boleh diturunkan",
        )

    user.peran = data.peran
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/panti",
    response_model=list[PantiResponse],
)
def get_admin_panti(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(PantiAsuhan).order_by(PantiAsuhan.id.desc()).all()


@router.post(
    "/panti",
    response_model=PantiResponse,
    status_code=201,
)
def create_panti(
    data: PantiCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    validate_manager(db, data.id_admin_pengelola)
    item = PantiAsuhan(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/panti/{panti_id}",
    response_model=PantiResponse,
)
def get_admin_panti_detail(
    panti_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PantiAsuhan).filter(PantiAsuhan.id == panti_id).first()

    if item is None:
        raise HTTPException(404, "Panti tidak ditemukan")

    return item


@router.put(
    "/panti/{panti_id}",
    response_model=PantiResponse,
)
def update_panti(
    panti_id: int,
    data: PantiUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PantiAsuhan).filter(PantiAsuhan.id == panti_id).first()

    if item is None:
        raise HTTPException(404, "Panti tidak ditemukan")

    validate_manager(db, data.id_admin_pengelola)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/panti/{panti_id}")
def delete_panti(
    panti_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PantiAsuhan).filter(PantiAsuhan.id == panti_id).first()

    if item is None:
        raise HTTPException(404, "Panti tidak ditemukan")

    db.delete(item)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "Panti tidak dapat dihapus karena masih memiliki data yang berelasi",
        )

    return {"message": "Panti berhasil dihapus"}


@router.get(
    "/pengajuan-adopsi",
    response_model=list[AdoptionResponse],
)
def get_all_adoptions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(PengajuanAdopsi).order_by(PengajuanAdopsi.id.desc()).all()


@router.get(
    "/pengajuan-adopsi/{adoption_id}",
    response_model=AdoptionResponse,
)
def get_adoption_detail(
    adoption_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PengajuanAdopsi).filter(PengajuanAdopsi.id == adoption_id).first()

    if item is None:
        raise HTTPException(
            404,
            "Pengajuan adopsi tidak ditemukan",
        )

    return item


@router.post("/pengajuan-adopsi/{adoption_id}/analisis-ai")
def reanalyze_adoption(
    adoption_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PengajuanAdopsi).filter(PengajuanAdopsi.id == adoption_id).first()

    if item is None:
        raise HTTPException(
            404,
            "Pengajuan adopsi tidak ditemukan",
        )

    documents: dict[str, str] = {"ktp": item.dokumen_ktp, "kk": item.dokumen_kk}
    supporting = item.dokumen_pendukung or {}
    if isinstance(supporting, dict):
        documents.update(supporting)
    elif isinstance(supporting, list):
        # Data lama menyimpan daftar path tanpa nama jenis dokumen.
        for index, path in enumerate(supporting, start=1):
            documents[f"dokumen_pendukung_{index}"] = path
    documents = {
        key: value
        for key, value in documents.items()
        if isinstance(value, str) and value.strip()
    }

    if not documents:
        raise HTTPException(
            400,
            "Pengajuan ini belum memiliki path dokumen yang dapat dianalisis",
        )

    result = analyze_adoption_documents(
        document_paths=documents,
        db=db,
        adoption=item,
    )

    item.hasil_ekstraksi_ai = result

    # Jangan menimpa keputusan admin (diverifikasi/ditolak/dll.) saat analisis ulang.
    if result["requires_manual_review"] and item.status == "diajukan":
        item.status = "menunggu_tinjauan_manual"

    db.commit()
    db.refresh(item)

    return {
        "id_pengajuan": item.id,
        "status": item.status,
        "hasil_ekstraksi_ai": result,
    }


@router.patch(
    "/pengajuan-adopsi/{adoption_id}/status",
    response_model=AdoptionResponse,
)
def update_adoption_status(
    adoption_id: int,
    new_status: AdoptionStatus,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(PengajuanAdopsi).filter(PengajuanAdopsi.id == adoption_id).first()

    if item is None:
        raise HTTPException(
            404,
            "Pengajuan adopsi tidak ditemukan",
        )

    item.status = new_status

    create_notification(
        db,
        item.id_user,
        "Status Pengajuan Adopsi",
        f"Status pengajuan adopsi #{item.id} berubah menjadi {new_status}.",
    )

    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/pengaduan",
    response_model=list[ReportResponse],
)
def get_reports(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(LaporanPengaduan).order_by(LaporanPengaduan.id.desc()).all()


@router.get("/pengaduan/{report_id}/lampiran")
def get_report_attachments_for_admin(
    report_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return 5-minute signed URLs only to an authenticated Admin Dinsos."""
    report = db.query(LaporanPengaduan).filter(LaporanPengaduan.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")

    return {
        "kode_tiket": report.kode_tiket,
        "lampiran": get_admin_signed_report_attachments(db, report),
    }


@router.patch(
    "/pengaduan/{report_id}/status",
    response_model=ReportResponse,
)
def update_report_status(
    report_id: int,
    new_status: ReportStatus,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = (
        db.query(LaporanPengaduan)
        .filter(LaporanPengaduan.id == report_id)
        .first()
    )

    if item is None:
        raise HTTPException(404, "Laporan tidak ditemukan")

    # Simpan status sebelum perubahan.
    previous_status = getattr(item.status, "value", item.status)
    next_status = getattr(new_status, "value", new_status)

    # Perbarui status laporan.
    item.status = new_status

    # Catat audit hanya apabila status benar-benar berubah.
    if str(previous_status) != str(next_status):
        actor_name = (
            getattr(current_user, "nama", None)
            or getattr(current_user, "full_name", None)
            or f"User #{current_user.id}"
        )
        actor_role = (
            getattr(current_user, "peran", None)
            or getattr(current_user, "role", None)
            or "admin"
        )

        db.add(
            AuditLogPengaduan(
                id_laporan=item.id,
                id_aktor=current_user.id,
                nama_aktor=str(actor_name),
                peran_aktor=str(
                    getattr(actor_role, "value", actor_role)
                ),
                aksi="status_diubah",
                status_sebelum=str(previous_status),
                status_sesudah=str(next_status),
            )
        )

    # Pertahankan mekanisme notifikasi yang sudah ada.
    if item.id_user:
        create_notification(
            db,
            item.id_user,
            "Status Laporan",
            f"Status laporan {item.kode_tiket} berubah menjadi {next_status}.",
        )

    db.commit()
    db.refresh(item)
    return item


@router.patch(
    "/donasi/{donation_id}/status",
    response_model=DonationResponse,
)
def update_donation_status(
    donation_id: int,
    new_status: DonationStatus,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    item = (
        db.query(Donasi)
        .filter(Donasi.id == donation_id)
        .first()
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Donasi tidak ditemukan",
        )


    previous_status = item.status_verifikasi


    # ==========================================
    # VALIDASI STATUS LAMA
    # ==========================================

    if (
        previous_status == "terverifikasi"
        and new_status != "terverifikasi"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Donasi yang telah diverifikasi "
                "tidak dapat dibatalkan"
            ),
        )

    if (
        previous_status == "ditolak"
        and new_status == "terverifikasi"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Donasi yang telah ditolak "
                "tidak dapat diverifikasi ulang"
            ),
        )


    # ==========================================
    # VALIDASI BUKTI DONASI UANG
    # ==========================================

    if (
        new_status == "terverifikasi"
        and item.jenis_donasi == "uang"
        and not item.bukti_transfer
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Donasi uang belum memiliki "
                "bukti transfer"
            ),
        )


    # ==========================================
    # UPDATE STATUS
    # ==========================================

    item.status_verifikasi = new_status


    # ==========================================
    # UPDATE WISHLIST DONASI BARANG
    # ==========================================

    if (
        new_status == "terverifikasi"
        and previous_status != "terverifikasi"
        and item.jenis_donasi == "barang"
        and item.id_wishlist is not None
        and item.jumlah_barang
    ):

        wishlist = (
            db.query(WishlistPanti)
            .filter(
                WishlistPanti.id == item.id_wishlist
            )
            .first()
        )

        if wishlist is not None:

            wishlist.jumlah_terpenuhi = min(
                wishlist.jumlah_kebutuhan,
                wishlist.jumlah_terpenuhi
                + item.jumlah_barang,
            )


    # ==========================================
    # NOTIFIKASI WARGA
    # ==========================================

    create_notification(
        db,
        item.id_user,
        "Status Donasi",
        (
            f"Donasi #{item.id} telah berubah "
            f"menjadi {new_status}."
        ),
    )


    # ==========================================
    # SIMPAN
    # ==========================================

    db.commit()

    db.refresh(item)

    return item

@router.post(
    "/donasi/{donation_id}/analisis-bukti-ai"
)
def analyze_donation_proof(
    donation_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    # ==========================================
    # 1. CARI TRANSAKSI
    # ==========================================

    item = (
        db.query(Donasi)
        .filter(Donasi.id == donation_id)
        .first()
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Donasi tidak ditemukan",
        )


    # ==========================================
    # 2. VALIDASI JENIS DONASI
    # ==========================================

    if item.jenis_donasi != "uang":
        raise HTTPException(
            status_code=422,
            detail=(
                "Analisis bukti transfer hanya "
                "berlaku untuk donasi uang"
            ),
        )


    if not item.bukti_transfer:
        raise HTTPException(
            status_code=422,
            detail="Donasi tidak mempunyai bukti transfer",
        )


    if not item.bukti_transfer.startswith(
        "storage/bukti_transfer/"
    ):
        raise HTTPException(
            status_code=422,
            detail="Lokasi bukti transfer tidak valid",
        )


    # ==========================================
    # 3. JALANKAN OCR DAN AI
    # ==========================================

    try:

        result = analyze_transfer_proof(
            item.bukti_transfer,
            expected_amount=item.jumlah_nominal,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=422,
            detail=(
                "Analisis bukti transfer gagal. "
                "Periksa file dan konfigurasi OCR."
            ),
        ) from exc


    # ==========================================
    # 4. TENTUKAN REKOMENDASI AI
    # ==========================================

    nominal_match = (
        result.get("nominal_donasi_cocok") is True
    )

    requires_manual_review = bool(
        result.get("requires_manual_review", True)
    )

    if nominal_match and not requires_manual_review:

        recommendation = (
            "direkomendasikan_untuk_disetujui"
        )

    else:

        recommendation = (
            "perlu_pemeriksaan_manual"
        )


    result["rekomendasi_ai"] = recommendation

    # AI tidak pernah mengambil keputusan final
    result["keputusan_final"] = (
        "menunggu_persetujuan_dinsos"
    )


    # ==========================================
    # 5. SIMPAN HASIL AI KE DATABASE
    # ==========================================

    item.hasil_analisis_ai = result

    db.commit()

    db.refresh(item)


    # ==========================================
    # 6. KEMBALIKAN HASIL ANALISIS
    # ==========================================

    return {
        "message": "Analisis bukti transfer selesai",
        "id_donasi": item.id,
        "nominal_donasi": str(item.jumlah_nominal),
        "nominal_donasi_cocok": nominal_match,
        "rekomendasi_ai": recommendation,
        "keputusan_final": "menunggu_persetujuan_dinsos",
        "hasil_analisis_ai": result,
    }

@router.get(
    "/relawan",
    response_model=list[VolunteerResponse],
)
def get_volunteers(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Relawan).order_by(Relawan.id.desc()).all()


@router.patch(
    "/relawan/{volunteer_id}/status",
    response_model=VolunteerResponse,
)
def update_volunteer_status(
    volunteer_id: int,
    new_status: VolunteerStatus,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Relawan).filter(Relawan.id == volunteer_id).first()

    if item is None:
        raise HTTPException(
            404,
            "Data relawan tidak ditemukan",
        )

    item.status = new_status

    create_notification(
        db,
        item.id_user,
        "Status Relawan",
        f"Status pendaftaran relawan #{item.id} berubah menjadi {new_status}.",
    )

    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/relawan/{volunteer_id}",
    response_model=VolunteerResponse,
)
def update_volunteer(
    volunteer_id: int,
    data: VolunteerUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Relawan).filter(Relawan.id == volunteer_id).first()
    if item is None:
        raise HTTPException(404, "Data relawan tidak ditemukan")
    updates = data.model_dump(exclude_unset=True)
    if updates.get("id_panti") is not None:
        panti = (
            db.query(PantiAsuhan).filter(PantiAsuhan.id == updates["id_panti"]).first()
        )
        if panti is None:
            raise HTTPException(404, "Panti tujuan tidak ditemukan")
        updates.setdefault("panti_tujuan", panti.nama_panti)
    for key, value in updates.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/relawan/{volunteer_id}")
def delete_volunteer(
    volunteer_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Relawan).filter(Relawan.id == volunteer_id).first()
    if item is None:
        raise HTTPException(404, "Data relawan tidak ditemukan")
    db.delete(item)
    db.commit()
    return {"message": "Data relawan berhasil dihapus", "id": volunteer_id}


@router.get("/dashboard/stats")
def get_dashboard_stats(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    start_dt = datetime.combine(start_date, time.min) if start_date else None

    end_exclusive = (
        datetime.combine(end_date + timedelta(days=1), time.min) if end_date else None
    )

    def apply_range(query, column):
        if start_dt:
            query = query.filter(column >= start_dt)
        if end_exclusive:
            query = query.filter(column < end_exclusive)
        return query

    adoption_query = apply_range(
        db.query(PengajuanAdopsi),
        PengajuanAdopsi.tanggal_pengajuan,
    )
    report_query = apply_range(
        db.query(LaporanPengaduan),
        LaporanPengaduan.tanggal_lapor,
    )
    donation_query = apply_range(
        db.query(Donasi),
        Donasi.tanggal_donasi,
    )

    return {
        "periode": {
            "mulai": start_date,
            "selesai": end_date,
        },
        "jumlah_user": db.query(func.count(User.id)).scalar() or 0,
        "jumlah_panti": db.query(func.count(PantiAsuhan.id)).scalar() or 0,
        "jumlah_pengajuan_adopsi": adoption_query.count(),
        "jumlah_pengaduan": report_query.count(),
        "jumlah_donasi": donation_query.count(),
        "jumlah_relawan": db.query(func.count(Relawan.id)).scalar() or 0,
        "jumlah_panti_terkelola": db.query(func.count(PantiAsuhan.id))
        .filter(PantiAsuhan.id_admin_pengelola.isnot(None))
        .scalar()
        or 0,
    }


@router.post("/panti/{panti_id}/laporan-pengawasan")
def upload_laporan_pengawasan(
    panti_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    panti = db.query(PantiAsuhan).filter(PantiAsuhan.id == panti_id).first()

    if panti is None:
        raise HTTPException(404, "Panti tidak ditemukan")

    # Prefix panti{id}_ membuat file dapat dikelompokkan per panti tanpa
    # menambah tabel baru (daftar publik: GET /api/public/panti/{id}/laporan-pengawasan).
    path = save_upload_file(
        file,
        "laporan_pengawasan",
        prefix=f"panti{panti_id}_",
    )

    return {
        "message": "Laporan pengawasan berhasil diupload",
        "id_panti": panti_id,
        "file_laporan": path,
        "catatan": "File disimpan di Supabase Storage dan dikelompokkan per panti lewat prefix nama file.",
    }


@router.get(
    "/notifikasi",
    response_model=list[NotificationResponse],
)
def get_admin_notifications(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notifikasi)
        .filter(Notifikasi.id_user == current_user.id)
        .order_by(Notifikasi.id.desc())
        .all()
    )


@router.patch(
    "/notifikasi/read-all",
)
def read_all_admin_notifications(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "diperbarui": mark_all_notifications_read(db, current_user.id),
    }


@router.patch(
    "/notifikasi/{notification_id}/read",
    response_model=NotificationResponse,
)
def read_admin_notification(
    notification_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = mark_notification_read(db, current_user.id, notification_id)

    if item is None:
        raise HTTPException(404, "Notifikasi tidak ditemukan")

    return item


def _admin_file_is_referenced(db: Session, relative_path: str) -> bool:
    """Pastikan admin hanya membuka file yang memang direferensikan aplikasi."""
    normalized = relative_path.replace("\\", "/")

    # Laporan pengawasan tidak memiliki kolom DB khusus; prefix panti adalah
    # satu-satunya indeks yang dipakai sesuai desain 10 tabel.
    if normalized.startswith("storage/laporan_pengawasan/"):
        return Path(normalized).name.startswith("panti")

    if db.query(Donasi.id).filter(Donasi.bukti_transfer == normalized).first():
        return True

    if db.query(Relawan.id).filter(Relawan.dokumen_identitas == normalized).first():
        return True

    if db.query(LaporanDana.id).filter(LaporanDana.file_laporan == normalized).first():
        return True

    if db.query(GaleriPanti.id).filter(GaleriPanti.foto == normalized).first():
        return True

    adoptions = db.query(
        PengajuanAdopsi.dokumen_ktp,
        PengajuanAdopsi.dokumen_kk,
        PengajuanAdopsi.dokumen_pendukung,
    ).all()
    for ktp, kk, supporting in adoptions:
        if ktp == normalized or kk == normalized:
            return True
        if isinstance(supporting, dict) and normalized in supporting.values():
            return True

    return False


@router.get("/pengajuan-adopsi/{adoption_id}/dokumen/{dokumen_key}")
def download_adoption_document(
    adoption_id: int,
    dokumen_key: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin membuka dokumen COTA tertentu setelah authorization terhadap record."""
    item = db.query(PengajuanAdopsi).filter(PengajuanAdopsi.id == adoption_id).first()
    if item is None:
        raise HTTPException(404, "Pengajuan adopsi tidak ditemukan")

    allowed = {"ktp": item.dokumen_ktp, "kk": item.dokumen_kk}
    supporting = item.dokumen_pendukung or {}
    if isinstance(supporting, dict):
        if dokumen_key in supporting:
            allowed[dokumen_key] = supporting.get(dokumen_key)
    elif isinstance(supporting, list):
        # Kunci sama dengan yang dipakai frontend: dokumen_pendukung_1, _2, ...
        for index, path in enumerate(supporting, start=1):
            allowed[f"dokumen_pendukung_{index}"] = path

    relative_path = allowed.get(dokumen_key)
    if not relative_path:
        raise HTTPException(404, "Dokumen tidak ditemukan")

    absolute_path = get_storage_absolute_path(relative_path)
    if not absolute_path.is_file():
        raise HTTPException(404, "File dokumen tidak ditemukan")

    return FileResponse(absolute_path)


@router.get("/files")
def download_stored_file(
    path: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin membuka dokumen unggahan (KTP, KK, SKCK, bukti transfer, dst.)
    untuk verifikasi manual. Path berasal dari kolom dokumen_* / bukti_transfer
    dan dibatasi hanya di dalam folder storage.
    """
    absolute_path = get_storage_absolute_path(path)

    if not _admin_file_is_referenced(db, path):
        raise HTTPException(404, "File tidak ditemukan")

    if not absolute_path.is_file():
        raise HTTPException(404, "File tidak ditemukan")

    return FileResponse(absolute_path)


def _ensure_panti_exists(db: Session, panti_id: int | None) -> None:
    if panti_id is None:
        return

    exists = db.query(PantiAsuhan.id).filter(PantiAsuhan.id == panti_id).first()

    if exists is None:
        raise HTTPException(404, "Panti tidak ditemukan")


@router.get(
    "/kalender-kunjungan",
    response_model=list[VisitEventResponse],
)
def get_visit_calendar(
    current_user: User = Depends(require_admin),
):
    return visit_calendar.list_events()


@router.post(
    "/kalender-kunjungan",
    response_model=VisitEventResponse,
    status_code=201,
)
def create_visit_event(
    data: VisitEventCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _ensure_panti_exists(db, data.id_panti)
    return visit_calendar.create_event(data.model_dump())


@router.put(
    "/kalender-kunjungan/{event_id}",
    response_model=VisitEventResponse,
)
def update_visit_event(
    event_id: int,
    data: VisitEventUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    changes = data.model_dump(exclude_unset=True)
    _ensure_panti_exists(db, changes.get("id_panti"))

    item = visit_calendar.update_event(event_id, changes)

    if item is None:
        raise HTTPException(404, "Jadwal kunjungan tidak ditemukan")

    return item


@router.delete("/kalender-kunjungan/{event_id}")
def delete_visit_event(
    event_id: int,
    current_user: User = Depends(require_admin),
):
    if not visit_calendar.delete_event(event_id):
        raise HTTPException(404, "Jadwal kunjungan tidak ditemukan")

    return {"message": "Jadwal kunjungan dihapus"}

# ==========================================
# VERIFIKASI PENDAFTARAN LKSA
# ==========================================

def _get_lksa_application_or_404(
    db: Session,
    application_id: int,
) -> PengajuanLKSA:

    item = (
        db.query(PengajuanLKSA)
        .filter(PengajuanLKSA.id == application_id)
        .first()
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Pengajuan LKSA tidak ditemukan.",
        )

    return item


def _build_lksa_admin_response(
    db: Session,
    item: PengajuanLKSA,
) -> dict:

    documents = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == item.id
        )
        .order_by(DokumenPengajuanLKSA.id.asc())
        .all()
    )

    return {
        "id": item.id,
        "id_pengelola": item.id_pengelola,
        "id_panti": item.id_panti,
        "nama_panti": item.nama_panti,
        "bentuk_lembaga": item.bentuk_lembaga,
        "tahun_berdiri": item.tahun_berdiri,
        "alamat": item.alamat,
        "kontak": item.kontak,
        "email_lembaga": item.email_lembaga,
        "jumlah_anak_asuh": item.jumlah_anak_asuh,
        "deskripsi": item.deskripsi,
        "status_pengajuan": item.status_pengajuan,
        "catatan_admin": item.catatan_admin,
        "id_admin_verifikator": item.id_admin_verifikator,
        "tanggal_diajukan": item.tanggal_diajukan,
        "tanggal_verifikasi": item.tanggal_verifikasi,
        "tanggal_dibuat": item.tanggal_dibuat,
        "tanggal_diperbarui": item.tanggal_diperbarui,
        "dokumen": documents,
    }


# ==========================================
# DAFTAR PENGAJUAN LKSA
# ==========================================

@router.get(
    "/pengajuan-lksa",
    response_model=list[PengajuanLKSAResponse],
)
def get_lksa_applications(
    status_pengajuan: str | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    query = db.query(PengajuanLKSA)

    if status_pengajuan:
        allowed_statuses = {
            "draft",
            "diajukan",
            "ditinjau",
            "menunggu_tinjauan_manual",
            "perlu_perbaikan",
            "disetujui",
            "ditolak",
        }

        if status_pengajuan not in allowed_statuses:
            raise HTTPException(
                status_code=422,
                detail="Filter status pengajuan tidak valid.",
            )

        query = query.filter(
            PengajuanLKSA.status_pengajuan == status_pengajuan
        )

    applications = (
        query
        .order_by(PengajuanLKSA.id.desc())
        .all()
    )

    return [
        _build_lksa_admin_response(db, item)
        for item in applications
    ]


# ==========================================
# DETAIL PENGAJUAN LKSA
# ==========================================

@router.get(
    "/pengajuan-lksa/{application_id}",
    response_model=PengajuanLKSAResponse,
)
def get_lksa_application_detail(
    application_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    item = _get_lksa_application_or_404(
        db,
        application_id,
    )

    return _build_lksa_admin_response(db, item)


# ==========================================
# SIGNED URL DOKUMEN LKSA
# ==========================================

@router.get(
    "/pengajuan-lksa/{application_id}/dokumen/{document_id}/url",
)
def get_lksa_document_url_for_admin(
    application_id: int,
    document_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    item = _get_lksa_application_or_404(
        db,
        application_id,
    )

    document = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id == document_id,
            DokumenPengajuanLKSA.id_pengajuan == item.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Dokumen LKSA tidak ditemukan.",
        )

    signed_url = create_lksa_signed_url(
        document.bucket_name,
        document.path_file,
        expires_in=300,
    )

    return {
        "signed_url": signed_url,
        "expires_in": 300,
    }


# ==========================================
# VERIFIKASI DOKUMEN LKSA
# ==========================================

@router.patch(
    "/pengajuan-lksa/{application_id}/dokumen/{document_id}/status",
    response_model=DokumenPengajuanResponse,
)
def review_lksa_document(
    application_id: int,
    document_id: int,
    data: DokumenLKSAReview,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    application = _get_lksa_application_or_404(
        db,
        application_id,
    )

    if application.status_pengajuan in {
        "disetujui",
        "ditolak",
    }:
        raise HTTPException(
            status_code=409,
            detail="Pengajuan sudah memiliki keputusan final.",
        )

    document = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id == document_id,
            DokumenPengajuanLKSA.id_pengajuan == application.id,
        )
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Dokumen tidak ditemukan.",
        )

    document.status_verifikasi = data.status_verifikasi
    document.catatan_verifikasi = data.catatan_verifikasi
    document.id_admin_verifikator = current_user.id
    document.tanggal_verifikasi = datetime.utcnow()

    # Jika ada dokumen perlu perbaikan, pengajuan menunggu pengelola.
    if data.status_verifikasi in {
        "tidak_valid",
        "perlu_perbaikan",
    }:
        application.status_pengajuan = "perlu_perbaikan"

    db.commit()
    db.refresh(document)

    return document


# ==========================================
# KEPUTUSAN ADMIN TERHADAP PENGAJUAN LKSA
# ==========================================

@router.patch(
    "/pengajuan-lksa/{application_id}/status",
    response_model=PengajuanLKSAResponse,
)
def update_lksa_application_status(
    application_id: int,
    data: PengajuanLKSAReview,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    application = _get_lksa_application_or_404(
        db,
        application_id,
    )

    if application.status_pengajuan in {
        "disetujui",
        "ditolak",
    }:
        raise HTTPException(
            status_code=409,
            detail="Pengajuan sudah memiliki keputusan final.",
        )

    manager = (
        db.query(User)
        .filter(
            User.id == application.id_pengelola,
            User.peran == "pengelola-panti",
        )
        .first()
    )

    if manager is None:
        raise HTTPException(
            status_code=404,
            detail="Akun pengelola LKSA tidak ditemukan.",
        )

    if data.status_pengajuan in {
        "perlu_perbaikan",
        "ditolak",
    } and not (data.catatan_admin or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Catatan admin wajib diisi untuk keputusan ini.",
        )

    # ======================================
    # VALIDASI DOKUMEN SEBELUM MENYETUJUI
    # ======================================

    if data.status_pengajuan == "disetujui":

        documents = (
            db.query(DokumenPengajuanLKSA)
            .filter(
                DokumenPengajuanLKSA.id_pengajuan == application.id
            )
            .all()
        )

        required_types = {
            "ad_art",
            "domisili",
            "npwp_lembaga",
            "struktur_organisasi",
            "ktp_pengurus",
            "skck_pengurus",
            "surat_pernyataan",
            "proposal_lksa",
        }

        if application.bentuk_lembaga == "berbadan_hukum":
            required_types.update({
                "akta_pendirian",
                "sk_pengesahan_badan_hukum",
            })
        else:
            required_types.add(
                "surat_keterangan_terdaftar_kemendagri"
            )

        valid_types = {
            doc.jenis_dokumen
            for doc in documents
            if doc.status_verifikasi == "valid"
        }

        missing_types = sorted(
            required_types - valid_types
        )

        if missing_types:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        "Pengajuan belum dapat disetujui. "
                        "Pastikan semua dokumen wajib sudah valid."
                    ),
                    "dokumen_belum_valid": missing_types,
                },
            )

        # ==================================
        # BUAT / HUBUNGKAN DATA PANTI
        # ==================================

        panti = None

        if application.id_panti is not None:
            panti = (
                db.query(PantiAsuhan)
                .filter(
                    PantiAsuhan.id == application.id_panti
                )
                .first()
            )

        # Untuk akun lama yang sudah memiliki panti bawaan,
        # gunakan record lama agar relasi donasi dan wishlist
        # tidak terputus.
        if panti is None:
            panti = (
                db.query(PantiAsuhan)
                .filter(
                    PantiAsuhan.id_admin_pengelola == manager.id
                )
                .first()
            )

        try:
            if panti is None:
                panti = PantiAsuhan(
                    nama_panti=application.nama_panti,
                    alamat=application.alamat,
                    kontak=application.kontak,
                    status_akreditasi=None,
                    jumlah_anak_asuh=application.jumlah_anak_asuh,
                    id_admin_pengelola=manager.id,
                )

                db.add(panti)
                db.flush()

            else:
                if panti.id_admin_pengelola not in {
                    None,
                    manager.id,
                }:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Data panti sudah terhubung "
                            "dengan pengelola lain."
                        ),
                    )

                # Deteksi data placeholder dari registrasi lama.
                is_old_placeholder = (
                    panti.nama_panti == f"LKSA {manager.nama}"
                    and panti.alamat == "Kabupaten Bogor"
                    and panti.jumlah_anak_asuh == 20
                    and panti.status_akreditasi == "AKREDITASI B"
                )

                panti.nama_panti = application.nama_panti
                panti.alamat = application.alamat
                panti.kontak = application.kontak
                panti.jumlah_anak_asuh = application.jumlah_anak_asuh
                panti.id_admin_pengelola = manager.id

                if is_old_placeholder:
                    panti.status_akreditasi = None

            application.id_panti = panti.id

        except HTTPException:
            db.rollback()
            raise

        except Exception:
            db.rollback()
            raise

    # ======================================
    # SIMPAN KEPUTUSAN
    # ======================================

    application.status_pengajuan = data.status_pengajuan
    application.catatan_admin = data.catatan_admin
    application.id_admin_verifikator = current_user.id
    application.tanggal_verifikasi = datetime.utcnow()

    try:
        create_notification(
            db,
            manager.id,
            "Status Pengajuan LKSA",
            (
                f"Pengajuan LKSA {application.nama_panti} "
                f"berubah menjadi {data.status_pengajuan}. "
                f"{data.catatan_admin or ''}"
            ),
        )

        db.commit()
        db.refresh(application)

    except Exception:
        db.rollback()
        raise

    return _build_lksa_admin_response(
        db,
        application,
    )
