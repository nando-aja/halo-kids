
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
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

from app.services.notification_service import notify_admins
from app.services.lksa_storage import (
    ALLOWED_LKSA_DOCUMENT_TYPES,
    MAX_FILES_PER_MULTIPLE_TYPE,
    MULTIPLE_DOCUMENT_TYPES,
    build_lksa_object_path,
    prepare_lksa_file,
    upload_prepared_lksa_file,
    delete_lksa_document,
    delete_lksa_document_quietly,
    create_lksa_signed_url,
)


router = APIRouter()


EDITABLE_STATUSES = {
    "draft",
    "perlu_perbaikan",
}

# Status setelah pengajuan dikirim. Jika /ajukan dipanggil lagi pada
# status ini (klik ganda / retry jaringan), hasilnya idempoten:
# data pengajuan dikembalikan apa adanya tanpa diubah.
ALREADY_SUBMITTED_STATUSES = {
    "diajukan",
    "ditinjau",
    "menunggu_tinjauan_manual",
    "disetujui",
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
    for_update: bool = False,
) -> PengajuanLKSA:
    """
    for_update=True mengunci baris pengajuan (SELECT ... FOR UPDATE)
    sampai transaksi selesai. Request lain untuk pengajuan yang sama
    (upload / hapus / ajukan) akan menunggu, sehingga klik ganda atau
    request paralel diproses satu per satu dan tidak membuat
    record ganda.
    """

    query = db.query(PengajuanLKSA).filter(
        PengajuanLKSA.id == application_id,
        PengajuanLKSA.id_pengelola == current_user.id,
    )

    if for_update:
        # populate_existing: pastikan status terbaru dari database
        # yang dipakai, bukan salinan lama di session.
        query = query.with_for_update().populate_existing()

    application = query.first()

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

    # Kunci baris pengguna agar dua request "buat draft" dari akun yang
    # sama tidak bisa berjalan bersamaan dan membuat dua draft.
    (
        db.query(User)
        .filter(User.id == current_user.id)
        .with_for_update()
        .populate_existing()
        .first()
    )

    existing = (
        db.query(PengajuanLKSA)
        .filter(
            PengajuanLKSA.id_pengelola == current_user.id,
            PengajuanLKSA.status_pengajuan.in_(ACTIVE_STATUSES),
        )
        .order_by(PengajuanLKSA.id.desc())
        .with_for_update()
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
    response: Response,
    jenis_dokumen: str = Form(...),
    file: UploadFile = File(...),
    label_dokumen: str | None = Form(default=None),
    current_user: User = Depends(require_pengelola_panti),
    db: Session = Depends(get_db),
):
    """
    Unggah dokumen pengajuan LKSA (anti-duplikasi).

    - Berkas yang SAMA (isi identik) untuk pengajuan + jenis dokumen
      yang sama tidak membuat record/objek baru. Dokumen yang sudah
      ada dikembalikan dengan status 200.
    - Jenis dokumen "tunggal": berkas baru MENGGANTIKAN berkas lama.
    - Jenis dokumen "multiple" (KTP pengurus, foto fasilitas): berkas
      berbeda ditambahkan, maksimal MAX_FILES_PER_MULTIPLE_TYPE.
    - Baris pengajuan dikunci selama proses sehingga request paralel
      diproses berurutan.
    """

    if jenis_dokumen not in ALLOWED_LKSA_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Jenis dokumen tidak didukung.",
        )

    application = get_owned_application(
        db,
        current_user,
        application_id,
        for_update=True,
    )

    ensure_editable(application)

    # Validasi + baca + hash berkas (belum menyentuh Supabase).
    prepared = prepare_lksa_file(file, jenis_dokumen)

    object_path = build_lksa_object_path(
        application.id,
        jenis_dokumen,
        prepared["sha256"],
        prepared["extension"],
    )

    # Locking read: selalu membaca data terbaru, termasuk dokumen yang
    # baru di-commit request lain saat kita menunggu kunci.
    same_type_documents = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == application.id,
            DokumenPengajuanLKSA.jenis_dokumen == jenis_dokumen,
        )
        .order_by(DokumenPengajuanLKSA.id.asc())
        .with_for_update()
        .all()
    )

    # 1. Berkas identik sudah ada -> idempoten, tidak upload ulang.
    duplicate = next(
        (
            item
            for item in same_type_documents
            if item.path_file == object_path
        ),
        None,
    )

    if duplicate is not None:
        response.status_code = 200
        return duplicate

    is_multiple = jenis_dokumen in MULTIPLE_DOCUMENT_TYPES

    # 2. Batas jumlah berkas untuk jenis "multiple".
    if (
        is_multiple
        and len(same_type_documents) >= MAX_FILES_PER_MULTIPLE_TYPE
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Jumlah berkas untuk jenis dokumen ini sudah mencapai "
                f"batas maksimal ({MAX_FILES_PER_MULTIPLE_TYPE})."
            ),
        )

    upload_result = upload_prepared_lksa_file(
        prepared,
        application.id,
        jenis_dokumen,
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

    # Jenis tunggal: dokumen lama digantikan. Objek lama baru dihapus
    # dari Supabase SETELAH baris baru berhasil di-commit, jadi
    # kegagalan di tengah jalan tidak membuat pengajuan kehilangan
    # dokumen.
    replaced_documents = [] if is_multiple else list(same_type_documents)
    replaced_objects = [
        (item.bucket_name, item.path_file)
        for item in replaced_documents
    ]

    try:
        db.add(document)

        for old_document in replaced_documents:
            db.delete(old_document)

        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        # Bersihkan file remote jika penyimpanan metadata gagal.
        delete_lksa_document_quietly(
            upload_result["bucket_name"],
            upload_result["path_file"],
        )

        raise

    for bucket_name, path_file in replaced_objects:
        delete_lksa_document_quietly(bucket_name, path_file)

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
        for_update=True,
    )

    ensure_editable(application)

    document = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id == document_id,
            DokumenPengajuanLKSA.id_pengajuan == application.id,
        )
        .with_for_update()
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
        for_update=True,
    )

    # Idempoten: pengajuan yang sudah terkirim (klik ganda, retry
    # jaringan) tidak diproses ulang dan tanggal_diajukan tidak
    # tertimpa. Data yang sama dikembalikan dengan status 200.
    if application.status_pengajuan in ALREADY_SUBMITTED_STATUSES:
        return build_application_response(db, application)

    ensure_editable(application)

    documents = (
        db.query(DokumenPengajuanLKSA)
        .filter(
            DokumenPengajuanLKSA.id_pengajuan == application.id
        )
        .with_for_update()
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

    was_resubmission = application.status_pengajuan == "perlu_perbaikan"

    application.status_pengajuan = "diajukan"
    application.tanggal_diajukan = datetime.utcnow()
    application.catatan_admin = None

    # Beritahu semua Super Admin (hanya mereka). Ikut satu transaksi
    # dengan perubahan status, dan tidak terkirim ganda karena
    # pengajuan yang sudah terkirim kembali lebih awal (idempoten).
    notify_admins(
        db,
        "Pengajuan LKSA Baru",
        (
            f"{application.nama_panti} "
            + (
                "mengirim ulang pengajuan LKSA setelah perbaikan "
                if was_resubmission
                else "mengajukan pendaftaran LKSA "
            )
            + "dan menunggu verifikasi."
        ),
    )

    db.commit()
    db.refresh(application)

    return build_application_response(db, application)
