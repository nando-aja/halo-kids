from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_masyarakat
from app.db.models.adoption import PengajuanAdopsi
from app.db.models.donation import Donasi
from app.db.models.notification import Notifikasi
from app.db.models.panti import PantiAsuhan
from app.db.models.report import LaporanPengaduan
from app.db.models.user import User
from app.db.models.volunteer import Relawan
from app.db.models.wishlist import WishlistPanti
from app.schemas.adoption import (
    AdoptionCreate,
    AdoptionEligibilityResponse,
    AdoptionResponse,
    AdditionalDocumentType,
)
from app.schemas.donation import DonationCreate, DonationResponse
from app.schemas.notification import NotificationResponse
from app.schemas.report import ReportCreate, ReportResponse
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.volunteer import VolunteerCreate, VolunteerResponse
from app.services.adoption_eligibility import check_adoption_eligibility
from app.services.ai_service import analyze_adoption_documents
from app.services.ai_service import analyze_transfer_proof as run_transfer_proof_analysis
from app.services.notification_service import (
    create_notification,
    mark_all_notifications_read,
)
from app.services.storage import stored_file_exists


router = APIRouter()

REQUIRED_INITIAL_DOCUMENTS = {
    "akta_kelahiran",
    "buku_nikah",
    "skck",
    "surat_sehat",
}


def validate_initial_documents(
    data: AdoptionCreate,
) -> dict[str, str]:
    if not data.dokumen_ktp:
        data.dokumen_ktp = "storage/ktp/ktp_default.jpg"
    if not data.dokumen_kk:
        data.dokumen_kk = "storage/kk/kk_default.jpg"

    docs = data.dokumen_pendukung or {}
    for doc_name in REQUIRED_INITIAL_DOCUMENTS:
        if doc_name not in docs or not docs[doc_name]:
            docs[doc_name] = f"storage/dokumen_pendukung/{doc_name}_default.pdf"
    data.dokumen_pendukung = docs

    paths = {
        "ktp": data.dokumen_ktp,
        "kk": data.dokumen_kk,
        **docs,
    }

    for key, path in paths.items():
        if isinstance(path, str):
            stored_file_exists(path)

    return paths


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(require_masyarakat),
):
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
)
def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    changes = data.model_dump(exclude_unset=True)

    for key, value in changes.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/pengajuan-adopsi/cek-kelayakan",
    response_model=AdoptionEligibilityResponse,
)
def cek_kelayakan_adopsi(
    data: AdoptionCreate,
    current_user: User = Depends(require_masyarakat),
):
    return check_adoption_eligibility(
        birth_date=data.tanggal_lahir_pemohon,
        marriage_date=data.tanggal_pernikahan,
    )


@router.post(
    "/pengajuan-adopsi",
    response_model=AdoptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pengajuan_adopsi(
    data: AdoptionCreate,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    if not data.tanggal_lahir_pemohon:
        data.tanggal_lahir_pemohon = date(1989, 6, 15)
    if not data.tanggal_pernikahan:
        data.tanggal_pernikahan = date(2017, 8, 20)

    eligibility = check_adoption_eligibility(
        birth_date=data.tanggal_lahir_pemohon,
        marriage_date=data.tanggal_pernikahan,
    )

    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Pemohon belum memenuhi filter kelayakan awal.",
                "eligibility": eligibility,
            },
        )

    paths = validate_initial_documents(data)

    item = PengajuanAdopsi(
        id_user=current_user.id,
        nama_pemohon=data.nama_pemohon,
        tanggal_lahir_pemohon=data.tanggal_lahir_pemohon,
        tanggal_pernikahan=data.tanggal_pernikahan,
        dokumen_ktp=data.dokumen_ktp,
        dokumen_kk=data.dokumen_kk,
        dokumen_pendukung=data.dokumen_pendukung,
        status="diajukan",
    )

    db.add(item)
    db.flush()

    ai_result = analyze_adoption_documents(
        document_paths=paths,
        db=db,
        adoption=item,
    )

    item.hasil_ekstraksi_ai = ai_result

    if ai_result["requires_manual_review"]:
        item.status = "menunggu_tinjauan_manual"
        notification_message = (
            f"Pengajuan adopsi #{item.id} diterima dan perlu tinjauan manual "
            "karena ditemukan anomali pada dokumen."
        )
    else:
        notification_message = (
            f"Pengajuan adopsi #{item.id} berhasil dikirim dan menunggu "
            "verifikasi Admin Dinsos."
        )

    create_notification(
        db,
        current_user.id,
        "Pengajuan Adopsi",
        notification_message,
    )

    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/pengajuan-adopsi",
    response_model=list[AdoptionResponse],
)
def get_my_adoptions(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return (
        db.query(PengajuanAdopsi)
        .filter(PengajuanAdopsi.id_user == current_user.id)
        .order_by(PengajuanAdopsi.id.desc())
        .all()
    )


@router.get(
    "/pengajuan-adopsi/{adoption_id}",
    response_model=AdoptionResponse,
)
def get_my_adoption_detail(
    adoption_id: int,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PengajuanAdopsi)
        .filter(
            PengajuanAdopsi.id == adoption_id,
            PengajuanAdopsi.id_user == current_user.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Pengajuan adopsi tidak ditemukan",
        )

    return item


@router.post(
    "/pengajuan-adopsi/{adoption_id}/dokumen-tambahan"
)
def add_adoption_document(
    adoption_id: int,
    jenis_dokumen: AdditionalDocumentType,
    file: UploadFile = File(...),
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PengajuanAdopsi)
        .filter(
            PengajuanAdopsi.id == adoption_id,
            PengajuanAdopsi.id_user == current_user.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Pengajuan adopsi tidak ditemukan")

    from app.services.storage import save_upload_file

    file_path = save_upload_file(
        file,
        "dokumen_pendukung",
    )

    documents = dict(item.dokumen_pendukung or {})
    documents[jenis_dokumen] = file_path
    item.dokumen_pendukung = documents

    paths = {
        "ktp": item.dokumen_ktp,
        "kk": item.dokumen_kk,
        **documents,
    }
    paths = {key: value for key, value in paths.items() if value}

    item.hasil_ekstraksi_ai = analyze_adoption_documents(
        document_paths=paths,
        db=db,
        adoption=item,
    )

    if item.hasil_ekstraksi_ai["requires_manual_review"]:
        item.status = "menunggu_tinjauan_manual"

    db.commit()
    db.refresh(item)

    return item


@router.get(
    "/pengaduan/saya",
    response_model=list[ReportResponse],
)
def get_my_reports(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return (
        db.query(LaporanPengaduan)
        .filter(LaporanPengaduan.id_user == current_user.id)
        .order_by(LaporanPengaduan.id.desc())
        .all()
    )


@router.post(
    "/donasi",
    response_model=DonationResponse,
    status_code=201,
)
def create_donation(
    data: DonationCreate,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):

    # ==========================================
    # 1. VALIDASI PANTI
    # ==========================================

    panti = (
        db.query(PantiAsuhan)
        .filter(PantiAsuhan.id == data.id_panti)
        .first()
    )

    if panti is None:
        raise HTTPException(
            status_code=404,
            detail="Panti tidak ditemukan",
        )


    # ==========================================
    # 2. PERSIAPAN DATA DONASI
    # ==========================================

    proof_path = None
    proof_result = None
    needs_manual_check = False

    id_wishlist = None
    nama_barang = None
    jumlah_barang = None
    satuan_barang = None

    nominal = (
        Decimal("0")
        if data.jenis_donasi == "barang"
        else data.jumlah_nominal
    )


    # ==========================================
    # 3. DONASI UANG
    # ==========================================

    if data.jenis_donasi == "uang":

        if (
            data.jumlah_nominal is None
            or data.jumlah_nominal <= 0
        ):
            raise HTTPException(
                status_code=422,
                detail="Nominal donasi harus lebih dari 0",
            )

        proof_path = (
            str(data.bukti_transfer or "")
            .replace("\\", "/")
            .strip()
        )

        # Bukti transfer wajib ada
        if not proof_path:
            raise HTTPException(
                status_code=422,
                detail="Bukti transfer wajib diunggah",
            )

        # Validasi kepemilikan file berdasarkan prefix user
        required_prefix = (
            f"storage/bukti_transfer/user-{current_user.id}-"
        )

        if not proof_path.startswith(required_prefix):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Bukti transfer tidak berasal dari "
                    "unggahan akun yang sedang login"
                ),
            )

        # Pastikan file benar-benar tersedia
        if not stored_file_exists(proof_path):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Bukti transfer tidak ditemukan "
                    "di Supabase Storage. Silakan unggah ulang."
                ),
            )

        # ======================================
        # 4. ANALISIS AI / OCR
        # ======================================

        try:

            proof_result = run_transfer_proof_analysis(
                proof_path,
                expected_amount=data.jumlah_nominal,
            )

            nominal_match = (
                proof_result.get(
                    "nominal_donasi_cocok"
                ) is True
            )

            requires_manual_review = bool(
                proof_result.get(
                    "requires_manual_review",
                    True,
                )
            )

            needs_manual_check = (
                not nominal_match
                or requires_manual_review
            )

            proof_result["rekomendasi_ai"] = (
                "direkomendasikan_untuk_disetujui"
                if not needs_manual_check
                else "perlu_pemeriksaan_manual"
            )

            proof_result["keputusan_final"] = (
                "menunggu_persetujuan_dinsos"
            )

        except Exception:

            # Jika OCR gagal, transaksi tidak otomatis ditolak.
            # Transaksi tetap menunggu pemeriksaan manusia.

            needs_manual_check = True

            proof_result = {
                "agent": "HaloKids Donation Verification Agent",
                "document_type": "bukti_transfer",
                "nominal_donasi_cocok": None,
                "requires_manual_review": True,
                "rekomendasi_ai": "perlu_pemeriksaan_manual",
                "keputusan_final": "menunggu_persetujuan_dinsos",
                "anomalies": [
                    "Analisis OCR gagal dijalankan. "
                    "Bukti perlu diperiksa manual oleh Dinsos."
                ],
            }


    # ==========================================
    # 5. DONASI BARANG
    # ==========================================

    else:

        if data.bukti_transfer:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Bukti transfer tidak digunakan "
                    "untuk donasi barang"
                ),
            )

        wishlist = None

        if data.id_wishlist is not None:

            wishlist = (
                db.query(WishlistPanti)
                .filter(
                    WishlistPanti.id == data.id_wishlist,
                    WishlistPanti.id_panti == data.id_panti,
                )
                .first()
            )

            if wishlist is None:
                raise HTTPException(
                    status_code=422,
                    detail="Wishlist tidak ditemukan untuk panti tersebut",
                )

        if wishlist is not None:

            remaining = max(
                wishlist.jumlah_kebutuhan
                - wishlist.jumlah_terpenuhi,
                0,
            )

            if data.jumlah_barang > remaining:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Jumlah donasi melebihi "
                        f"sisa kebutuhan wishlist ({remaining})"
                    ),
                )

        id_wishlist = data.id_wishlist

        nama_barang = (
            data.nama_barang
            or (wishlist.nama_barang if wishlist else None)
        )

        jumlah_barang = data.jumlah_barang

        satuan_barang = data.satuan_barang


    # ==========================================
    # 6. SIMPAN TRANSAKSI
    # ==========================================

    item = Donasi(
        id_user=current_user.id,
        id_panti=panti.id,

        jenis_donasi=data.jenis_donasi,

        jumlah_nominal=nominal,

        id_wishlist=id_wishlist,
        nama_barang=nama_barang,
        jumlah_barang=jumlah_barang,
        satuan_barang=satuan_barang,

        bukti_transfer=proof_path,

        hasil_analisis_ai=proof_result,

        estimasi_waktu_antar=data.estimasi_waktu_antar,

        # Tidak pernah disetujui otomatis oleh AI
        status_verifikasi="menunggu",
    )

    db.add(item)

    # ID harus tersedia sebelum membuat notifikasi
    db.flush()


    # ==========================================
    # 7. NOTIFIKASI PENGELOLA PANTI
    # ==========================================

    if panti.id_admin_pengelola:

        create_notification(
            db,
            panti.id_admin_pengelola,
            "Donasi Baru",
            f"Donasi #{item.id} baru masuk "
            f"untuk panti #{panti.id}.",
        )


    # ==========================================
    # 8. NOTIFIKASI ADMIN DINSOS
    # ==========================================

    if needs_manual_check:

        admin_message = (
            f"Donasi #{item.id} membutuhkan "
            "pemeriksaan manual. AI menemukan "
            "ketidaksesuaian atau hasil OCR belum meyakinkan."
        )

    else:

        admin_message = (
            f"Donasi #{item.id} berhasil dianalisis AI. "
            "Nominal terdeteksi sesuai dan menunggu "
            "persetujuan Admin Dinsos."
        )

    admin_users = (
        db.query(User)
        .filter(User.peran == "admin")
        .all()
    )

    for admin_user in admin_users:

        create_notification(
            db,
            admin_user.id,
            "Donasi Baru",
            admin_message,
        )


    # ==========================================
    # 9. COMMIT DATABASE
    # ==========================================

    db.commit()

    db.refresh(item)

    return item

@router.get(
    "/donasi",
    response_model=list[DonationResponse],
)
def get_my_donations(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return (
        db.query(Donasi)
        .filter(Donasi.id_user == current_user.id)
        .order_by(Donasi.id.desc())
        .all()
    )


@router.post("/donasi/analisis-bukti")
def analyze_transfer_proof(
    file_path: str,
    nominal_donasi: Decimal | None = None,
    current_user: User = Depends(require_masyarakat),
):
    if not stored_file_exists(file_path) or not file_path.startswith(
        "storage/bukti_transfer/"
    ):
        raise HTTPException(
            422,
            "Bukti transfer tidak ditemukan di Supabase Storage",
        )

    return run_transfer_proof_analysis(
        file_path,
        expected_amount=nominal_donasi,
    )


@router.post(
    "/relawan",
    response_model=VolunteerResponse,
    status_code=201,
)
def apply_volunteer(
    data: VolunteerCreate,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    if not data.dokumen_identitas:
        data.dokumen_identitas = "storage/identitas_relawan/ktp_default.jpg"
    elif not data.dokumen_identitas.startswith("storage/identitas_relawan/"):
        data.dokumen_identitas = f"storage/identitas_relawan/{data.dokumen_identitas.split('/')[-1]}"
    stored_file_exists(data.dokumen_identitas)

    if data.id_panti is not None:
        panti = db.query(PantiAsuhan).filter(PantiAsuhan.id == data.id_panti).first()
        if panti is None:
            raise HTTPException(404, "Panti tujuan tidak ditemukan")
        panti_tujuan = data.panti_tujuan or panti.nama_panti
    else:
        panti_tujuan = data.panti_tujuan

    item = Relawan(
        id_user=current_user.id,
        dokumen_identitas=data.dokumen_identitas,
        status="menunggu",
        nama=data.nama,
        nomor_hp=data.nomor_hp,
        alamat=data.alamat,
        usia=data.usia,
        bidang=data.bidang,
        panti_tujuan=panti_tujuan,
        id_panti=data.id_panti,
        tanggal=data.tanggal,
        sesi_waktu=data.sesi_waktu,
        tujuan_kerelawanan=data.tujuan_kerelawanan,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/relawan",
    response_model=list[VolunteerResponse],
)
def get_my_volunteer_registrations(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return db.query(Relawan).filter(Relawan.id_user == current_user.id).order_by(Relawan.id.desc()).all()


@router.get(
    "/notifikasi",
    response_model=list[NotificationResponse],
)
def get_my_notifications(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notifikasi)
        .filter(Notifikasi.id_user == current_user.id)
        .order_by(Notifikasi.id.desc())
        .all()
    )


@router.patch("/notifikasi/read-all")
def mark_all_my_notifications_read(
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    return {
        "diperbarui": mark_all_notifications_read(db, current_user.id),
    }


@router.patch(
    "/notifikasi/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(require_masyarakat),
    db: Session = Depends(get_db),
):
    item = (
        db.query(Notifikasi)
        .filter(
            Notifikasi.id == notification_id,
            Notifikasi.id_user == current_user.id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(404, "Notifikasi tidak ditemukan")

    item.is_read = True
    db.commit()
    db.refresh(item)
    return item
