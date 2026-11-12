
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_pengelola_panti
from app.db.models.user import User
from app.db.models.pengajuan_lksa import PengajuanLKSA
from app.db.models.dokumen_pengajuan_lksa import DokumenPengajuanLKSA

from app.schemas.pengajuan_lksa import (
    PengajuanLKSACreate,
    PengajuanLKSAUpdate,
    PengajuanLKSAResponse,
    DokumenPengajuanResponse,
)

from app.services.lksa_storage import (
    ALLOWED_LKSA_DOCUMENT_TYPES,
    upload_lksa_document,
    delete_lksa_document,
    create_lksa_signed_url,
)


router = APIRouter()


EDITABLE_STATUSES = {
    "draft",
    "perlu_perbaikan",
}

ACTIVE_STATUSES = {
    "draft",
    "diajukan",
    "ditinjau",
    "menunggu_tinjauan_manual",
    "perlu_perbaikan",
    "disetujui",
}


# ==========================================
# HELPER
# ==========================================

def get_owned_application(
    db: Session,
    current_user: User,
    application_id: int,
) -> PengajuanLKSA:

    application = (
        db.query(PengajuanLKSA)
        .filter(
            PengajuanLKSA.id == application_id,
            PengajuanLKSA.id_pengelola == current_user.id,
        )
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Pengajuan LKSA tidak ditemukan.",
        )

    return application


def ensure_editable(
    application: PengajuanLKSA,
) -> None:

    if application.status_pengajuan not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=(
                "Pengajuan tidak dapat diubah pada status "
                f"{application.status_pengajuan}."
            ),
        )


def build_application_response(
    db: Session,
    application: PengajuanLKSA,
) -> dict:

    documents = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == application.id
        )
        .order_by(DokumenPengajuanLKSA.id.asc())
        .all()
    )

    return {
        "id": application.id,
        "id_pengelola": application.id_pengelola,
        "id_panti": application.id_panti,
        "nama_panti": application.nama_panti,
        "bentuk_lembaga": application.bentuk_lembaga,
        "tahun_berdiri": application.tahun_berdiri,
        "alamat": application.alamat,
        "kontak": application.kontak,
        "email_lembaga": application.email_lembaga,
        "jumlah_anak_asuh": application.jumlah_anak_asuh,
        "deskripsi": application.deskripsi,
        "status_pengajuan": application.status_pengajuan,
        "catatan_admin": application.catatan_admin,
        "id_admin_verifikator": application.id_admin_verifikator,
        "tanggal_diajukan": application.tanggal_diajukan,
        "tanggal_verifikasi": application.tanggal_verifikasi,
        "tanggal_dibuat": application.tanggal_dibuat,
        "tanggal_diperbarui": application.tanggal_diperbarui,
        "dokumen": documents,
    }


# ==========================================
# CREATE DRAFT
# ==========================================

@router.post(
    "/",
    response_model=PengajuanLKSAResponse,
    status_code=201,
)
def create_lksa_application(
    data: PengajuanLKSACreate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    existing = (
        db.query(PengajuanLKSA)
        .filter(
            PengajuanLKSA.id_pengelola == current_user.id,
            PengajuanLKSA.status_pengajuan.in_(ACTIVE_STATUSES),
        )
        .order_by(PengajuanLKSA.id.desc())
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Kamu sudah memiliki pengajuan LKSA. "
                f"Gunakan pengajuan dengan ID {existing.id}."
            ),
        )

    application = PengajuanLKSA(
        id_pengelola=current_user.id,
        nama_panti=data.nama_panti,
        bentuk_lembaga=data.bentuk_lembaga,
        tahun_berdiri=data.tahun_berdiri,
        alamat=data.alamat,
        kontak=data.kontak or current_user.no_hp,
        email_lembaga= (
            str(data.email_lembaga) 
            if data.email_lembaga else None
        ),
        jumlah_anak_asuh=data.jumlah_anak_asuh,
        deskripsi=data.deskripsi,
        status_pengajuan="draft",
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)

    except Exception:
        db.rollback()
        raise

    return build_application_response(db, application)


# ==========================================
# GET MY APPLICATION
# ==========================================

@router.get(
    "/me",
    response_model=PengajuanLKSAResponse,
)
def get_my_application(
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = (
        db.query(PengajuanLKSA)
        .filter(
            PengajuanLKSA.id_pengelola == current_user.id
        )
        .order_by(PengajuanLKSA.id.desc())
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Kamu belum memiliki pengajuan LKSA.",
        )

    return build_application_response(db, application)


# ==========================================
# UPDATE APPLICATION
# ==========================================

@router.put(
    "/{application_id}",
    response_model=PengajuanLKSAResponse,
)
def update_application(
    application_id: int,
    data: PengajuanLKSAUpdate,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
    )

    ensure_editable(application)

    changes = data.model_dump(exclude_unset=True)

    if "email_lembaga" in changes and changes["email_lembaga"]:
        changes["email_lembaga"] = str(changes["email_lembaga"])

    for key, value in changes.items():
        setattr(application, key, value)

    db.commit()
    db.refresh(application)

    return build_application_response(db, application)


# ==========================================
# UPLOAD DOCUMENT
# ==========================================

@router.post(
    "/{application_id}/dokumen",
    response_model=DokumenPengajuanResponse,
    status_code=201,
)
def upload_application_document(
    application_id: int,
    jenis_dokumen: str = Form(...),
    file: UploadFile = File(...),
    label_dokumen: str | None = Form(default=None),
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
    )

    ensure_editable(application)

    if jenis_dokumen not in ALLOWED_LKSA_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Jenis dokumen tidak didukung.",
        )

    upload_result = upload_lksa_document(
        file=file,
        id_pengajuan=application.id,
        jenis_dokumen=jenis_dokumen,
    )

    document = DokumenPengajuanLKSA(
        id_pengajuan=application.id,
        jenis_dokumen=jenis_dokumen,
        label_dokumen=label_dokumen,
        nama_file_asli=file.filename or "dokumen",
        bucket_name=upload_result["bucket_name"],
        path_file=upload_result["path_file"],
        mime_type=upload_result["mime_type"],
        ukuran_byte=upload_result["ukuran_byte"],
        status_verifikasi="menunggu",
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        # Bersihkan file remote jika penyimpanan metadata gagal.
        delete_lksa_document(
            upload_result["bucket_name"],
            upload_result["path_file"],
        )

        raise

    return document


# ==========================================
# GET DOCUMENTS
# ==========================================

@router.get(
    "/{application_id}/dokumen",
    response_model=list[DokumenPengajuanResponse],
)
def get_application_documents(
    application_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
    )

    return (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == application.id
        )
        .order_by(DokumenPengajuanLKSA.id.asc())
        .all()
    )


# ==========================================
# OPEN PRIVATE DOCUMENT
# ==========================================

@router.get(
    "/{application_id}/dokumen/{document_id}/url",
)
def get_document_url(
    application_id: int,
    document_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
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
# DELETE DOCUMENT
# ==========================================

@router.delete(
    "/{application_id}/dokumen/{document_id}",
)
def remove_application_document(
    application_id: int,
    document_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
    )

    ensure_editable(application)

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

    # Hapus objek Supabase dahulu.
    delete_lksa_document(
        document.bucket_name,
        document.path_file,
    )

    db.delete(document)
    db.commit()

    return {
        "message": "Dokumen berhasil dihapus."
    }


# ==========================================
# SUBMIT APPLICATION
# ==========================================

@router.post(
    "/{application_id}/ajukan",
    response_model=PengajuanLKSAResponse,
)
def submit_application(
    application_id: int,
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):

    application = get_owned_application(
        db,
        current_user,
        application_id,
    )

    ensure_editable(application)

    documents = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == application.id
        )
        .all()
    )

    uploaded_types = {
        document.jenis_dokumen
        for document in documents
    }

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

    missing_documents = sorted(
        required_types - uploaded_types
    )

    if missing_documents:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Dokumen wajib belum lengkap.",
                "dokumen_belum_diunggah": missing_documents,
            },
        )

    application.status_pengajuan = "diajukan"
    application.tanggal_diajukan = datetime.utcnow()
    application.catatan_admin = None

    db.commit()
    db.refresh(application)

    return build_application_response(db, application)
