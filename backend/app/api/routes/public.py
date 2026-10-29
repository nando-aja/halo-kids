from uuid import uuid4
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.models.report_audit import AuditLogPengaduan
from app.api.deps import get_db, get_optional_current_user
from app.db.models.dana import LaporanDana
from app.db.models.gallery import GaleriPanti
from app.db.models.panti import PantiAsuhan
from app.db.models.user import User
from app.db.models.wishlist import WishlistPanti
from app.schemas.calendar import VisitEventResponse
from app.schemas.dana import DanaResponse
from app.schemas.gallery import GalleryResponse
from app.schemas.panti import PantiResponse
from app.schemas.report import PublicReportStatus, ReportCreate
from app.schemas.statistics import PublicStatisticsResponse
from app.schemas.wishlist import WishlistResponse
from app.services import visit_calendar
from app.services.notification_service import create_notification
from app.services.storage import list_folder_files, resolve_public_file
from app.services.public_statistics import get_public_statistics
from app.db.models.report import LaporanPengaduan
from app.db.models.report_attachment import LaporanPengaduanLampiran
from app.services.report_attachments import (
    delete_uploaded_report_attachments,
    upload_report_attachments,
)

router = APIRouter()


def get_panti_or_404(
    panti_id: int,
    db: Session,
) -> PantiAsuhan:
    panti = (
        db.query(PantiAsuhan)
        .filter(PantiAsuhan.id == panti_id)
        .first()
    )

    if panti is None:
        raise HTTPException(
            status_code=404,
            detail="Panti tidak ditemukan",
        )

    return panti


@router.get(
    "/statistics",
    response_model=PublicStatisticsResponse,
)
def get_public_statistics_endpoint(
    db: Session = Depends(get_db),
):
    return get_public_statistics(db)


@router.get(
    "/panti",
    response_model=list[PantiResponse],
)
def get_panti_list(
    wilayah: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(PantiAsuhan)

    # Schema proposal tidak memiliki kolom kecamatan khusus.
    # Karena itu filter wilayah memakai teks pada kolom alamat.
    if wilayah:
        query = query.filter(
            PantiAsuhan.alamat.ilike(f"%{wilayah}%")
        )

    return (
        query
        .order_by(PantiAsuhan.id.desc())
        .all()
    )


@router.get(
    "/panti/{panti_id}",
    response_model=PantiResponse,
)
def get_panti_detail(
    panti_id: int,
    db: Session = Depends(get_db),
):
    return get_panti_or_404(panti_id, db)


@router.get(
    "/panti/{panti_id}/wishlist",
    response_model=list[WishlistResponse],
)
def get_public_wishlist(
    panti_id: int,
    db: Session = Depends(get_db),
):
    get_panti_or_404(panti_id, db)

    return (
        db.query(WishlistPanti)
        .filter(WishlistPanti.id_panti == panti_id)
        .order_by(WishlistPanti.id.desc())
        .all()
    )


@router.get(
    "/panti/{panti_id}/galeri",
    response_model=list[GalleryResponse],
)
def get_public_gallery(
    panti_id: int,
    db: Session = Depends(get_db),
):
    get_panti_or_404(panti_id, db)

    return (
        db.query(GaleriPanti)
        .filter(GaleriPanti.id_panti == panti_id)
        .order_by(GaleriPanti.id.desc())
        .all()
    )


@router.get(
    "/panti/{panti_id}/laporan-dana",
    response_model=list[DanaResponse],
)
def get_public_dana_reports(
    panti_id: int,
    db: Session = Depends(get_db),
):
    get_panti_or_404(panti_id, db)

    return (
        db.query(LaporanDana)
        .filter(LaporanDana.id_panti == panti_id)
        .order_by(LaporanDana.id.desc())
        .all()
    )


@router.post(
    "/pengaduan/dengan-lampiran",
    response_model=PublicReportStatus,
    status_code=201,
)
def create_public_report_with_attachments(
    isi_laporan: str = Form(..., min_length=10),
    jenis_laporan: str = Form(...),
    submission_key: str = Form(..., min_length=16, max_length=80),
    files: list[UploadFile] = File(...),
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Simpan laporan, lampiran privat, dan audit trail."""

    try:
        data = ReportCreate(
            isi_laporan=isi_laporan,
            jenis_laporan=jenis_laporan,
            submission_key=submission_key,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Data laporan tidak valid.",
        ) from exc

    # Idempotensi: request yang sama tidak membuat laporan baru.
    existing_report = (
        db.query(LaporanPengaduan)
        .filter(
            LaporanPengaduan.submission_key == data.submission_key
        )
        .first()
    )

    if existing_report is not None:
        attachment_count = (
            db.query(LaporanPengaduanLampiran)
            .filter(
                LaporanPengaduanLampiran.id_laporan
                == existing_report.id
            )
            .count()
        )

        return {
            "kode_tiket": existing_report.kode_tiket,
            "status": existing_report.status,
            "tanggal_lapor": existing_report.tanggal_lapor,
            "lampiran_tersimpan": attachment_count,
        }

    ticket_code = (
        f"HK-{date.today():%Y%m%d}-"
        f"{uuid4().hex[:8].upper()}"
    )

    report = LaporanPengaduan(
        id_user=current_user.id if current_user else None,
        kode_tiket=ticket_code,
        isi_laporan=data.isi_laporan,
        jenis_laporan=data.jenis_laporan,
        status="baru",
        submission_key=data.submission_key,
    )

    uploaded_metadata: list[dict] = []

    try:
        # Simpan laporan sementara agar ID tersedia untuk lampiran.
        db.add(report)
        db.flush()

        # Upload file ke bucket privat Supabase.
        uploaded_metadata = upload_report_attachments(
            ticket_code,
            files,
        )

        # Simpan metadata lampiran ke MySQL.
        for item in uploaded_metadata:
            db.add(
                LaporanPengaduanLampiran(
                    id_laporan=report.id,
                    **item,
                )
            )

        # Notifikasi admin tetap berada dalam transaksi yang sama.
        admins = (
            db.query(User)
            .filter(User.peran == "admin")
            .all()
        )

        for admin in admins:
            create_notification(
                db,
                admin.id,
                "Laporan Baru",
                f"Laporan {report.kode_tiket} masuk dan menunggu diproses.",
            )

        # Identitas pelaku dicatat tanpa menyimpan data sensitif tambahan.
        actor_name = (
            getattr(current_user, "nama", None)
            if current_user
            else None
        ) or "Pelapor anonim"

        actor_role = (
            getattr(current_user, "peran", None)
            if current_user
            else None
        ) or "anonim"

        db.add(
            AuditLogPengaduan(
                id_laporan=report.id,
                id_aktor=current_user.id if current_user else None,
                nama_aktor=str(actor_name),
                peran_aktor=str(
                    getattr(actor_role, "value", actor_role)
                ),
                aksi="laporan_dibuat",
                status_sesudah=str(report.status),
            )
        )

        # Laporan, metadata lampiran, notifikasi, dan audit commit bersama.
        db.commit()
        db.refresh(report)

    except HTTPException:
        db.rollback()
        delete_uploaded_report_attachments(uploaded_metadata)
        raise

    except IntegrityError as exc:
        db.rollback()
        delete_uploaded_report_attachments(uploaded_metadata)

        # Tangani request identik yang masuk bersamaan.
        existing_report = (
            db.query(LaporanPengaduan)
            .filter(
                LaporanPengaduan.submission_key == data.submission_key
            )
            .first()
        )

        if existing_report is not None:
            attachment_count = (
                db.query(LaporanPengaduanLampiran)
                .filter(
                    LaporanPengaduanLampiran.id_laporan
                    == existing_report.id
                )
                .count()
            )

            return {
                "kode_tiket": existing_report.kode_tiket,
                "status": existing_report.status,
                "tanggal_lapor": existing_report.tanggal_lapor,
                "lampiran_tersimpan": attachment_count,
            }

        raise HTTPException(
            status_code=409,
            detail="Pengiriman laporan bentrok dengan permintaan lain. Coba ulangi.",
        ) from exc

    except Exception as exc:
        db.rollback()
        delete_uploaded_report_attachments(uploaded_metadata)

        raise HTTPException(
            status_code=500,
            detail=(
                "Laporan beserta lampirannya belum berhasil disimpan. "
                "Periksa backend dan Supabase, lalu coba kembali."
            ),
        ) from exc

    return {
        "kode_tiket": report.kode_tiket,
        "status": report.status,
        "tanggal_lapor": report.tanggal_lapor,
        "lampiran_tersimpan": len(uploaded_metadata),
    }

@router.get(
    "/pengaduan/{kode_tiket}",
    response_model=PublicReportStatus,
)
def track_report(
    kode_tiket: str,
    db: Session = Depends(get_db),
):
    report = (
        db.query(LaporanPengaduan)
        .filter(LaporanPengaduan.kode_tiket == kode_tiket)
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Kode tiket tidak ditemukan",
        )

    return report


@router.get(
    "/panti/{panti_id}/laporan-pengawasan",
)
def get_public_supervision_reports(
    panti_id: int,
    db: Session = Depends(get_db),
):
    """Laporan pengawasan berkala yang diunggah admin Dinsos untuk panti ini."""
    get_panti_or_404(panti_id, db)

    return list_folder_files(
        "laporan_pengawasan",
        prefix=f"panti{panti_id}_",
    )


@router.get(
    "/kalender-kunjungan",
    response_model=list[VisitEventResponse],
)
def get_public_visit_calendar(
    panti_id: int | None = None,
    hanya_mendatang: bool = False,
):
    """Kalender kunjungan/open house panti (dikelola admin)."""
    return visit_calendar.list_events(
        panti_id=panti_id,
        upcoming_only=hanya_mendatang,
    )


@router.get("/files/{folder}/{filename}")
def get_public_file(
    folder: str,
    filename: str,
):
    """
    Mengunduh file publik: foto galeri, laporan dana, laporan pengawasan.
    Folder privat (KTP, KK, bukti transfer, dst.) tidak dapat diakses lewat sini.
    """
    return FileResponse(resolve_public_file(folder, filename))
