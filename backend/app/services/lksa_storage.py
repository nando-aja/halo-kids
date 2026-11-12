
import hashlib
import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.supabase_storage import supabase


logger = logging.getLogger("uvicorn.error")

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}

# Hanya kategori yang diizinkan untuk dokumen pendaftaran LKSA.
ALLOWED_LKSA_DOCUMENT_TYPES = {
    "akta_pendirian",
    "sk_pengesahan_badan_hukum",
    "surat_keterangan_terdaftar_kemendagri",
    "ad_art",
    "domisili",
    "npwp_lembaga",
    "struktur_organisasi",
    "ktp_pengurus",
    "skck_pengurus",
    "surat_pernyataan",
    "proposal_lksa",
    "foto_verifikasi",
}

# Jenis dokumen yang memang boleh lebih dari satu berkas.
# Jenis lain hanya boleh punya SATU dokumen per pengajuan; mengunggah
# berkas baru akan menggantikan berkas lama, bukan menambah baris baru.
MULTIPLE_DOCUMENT_TYPES = {
    "ktp_pengurus",
    "foto_verifikasi",
}

# Batas berkas untuk jenis dokumen "multiple" agar kuota Supabase aman.
MAX_FILES_PER_MULTIPLE_TYPE = 10


def _get_private_bucket() -> str:
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Storage belum dikonfigurasi.",
        )

    bucket = str(
        settings.SUPABASE_PRIVATE_BUCKET or ""
    ).strip()

    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_PRIVATE_BUCKET belum diatur.",
        )

    return bucket


def _get_content_type(extension: str, original_type: str | None) -> str:
    if extension in {".jpg", ".jpeg"}:
        return "image/jpeg"

    if extension == ".png":
        return "image/png"

    if extension == ".pdf":
        return "application/pdf"

    return original_type or "application/octet-stream"


def _normalize_extension(extension: str) -> str:
    """.jpeg dan .jpg dianggap sama agar path tidak ganda."""
    extension = extension.lower()
    return ".jpg" if extension == ".jpeg" else extension


def build_lksa_object_path(
    id_pengajuan: int,
    jenis_dokumen: str,
    sha256: str,
    extension: str,
) -> str:
    """
    Path penyimpanan deterministik:

        pengajuan_lksa/<id_pengajuan>/<jenis_dokumen>/<sha256>.<ext>

    Nama file diturunkan dari ISI file (SHA-256), bukan UUID acak.
    Akibatnya berkas yang sama dikirim berulang akan menghasilkan
    path yang sama sehingga bisa dideteksi sebagai duplikat.
    """
    return (
        f"pengajuan_lksa/{id_pengajuan}/"
        f"{jenis_dokumen}/{sha256}{_normalize_extension(extension)}"
    )


def prepare_lksa_file(
    file: UploadFile,
    jenis_dokumen: str,
) -> dict:
    """
    Validasi dan baca berkas ke memori (maks 10 MB), lalu hitung SHA-256.

    Tahap ini belum menyentuh Supabase, sehingga route dapat memeriksa
    duplikasi di database terlebih dahulu sebelum mengunggah apa pun.
    """

    if jenis_dokumen not in ALLOWED_LKSA_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Jenis dokumen LKSA tidak dikenal.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Nama file tidak ditemukan.",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Format file harus PDF, JPG, JPEG, atau PNG.",
        )

    file_bytes = bytearray()
    digest = hashlib.sha256()

    try:
        while True:
            chunk = file.file.read(1024 * 1024)

            if not chunk:
                break

            file_bytes.extend(chunk)
            digest.update(chunk)

            if len(file_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Ukuran file maksimal 10 MB.",
                )
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="File yang diunggah kosong.",
        )

    return {
        "content": bytes(file_bytes),
        "extension": _normalize_extension(extension),
        "content_type": _get_content_type(extension, file.content_type),
        "sha256": digest.hexdigest(),
        "size": len(file_bytes),
    }


def upload_prepared_lksa_file(
    prepared: dict,
    id_pengajuan: int,
    jenis_dokumen: str,
) -> dict:
    """
    Unggah berkas hasil prepare_lksa_file() ke bucket private.

    Karena path berasal dari hash isi file, upsert aman dipakai:
    jika objek dengan path sama sudah ada (mis. sisa upload yang
    gagal disimpan ke database), isinya identik sehingga tidak ada
    data yang tertimpa dan tidak ada objek baru yang bertambah.
    """

    if id_pengajuan <= 0:
        raise HTTPException(
            status_code=400,
            detail="ID pengajuan tidak valid.",
        )

    if jenis_dokumen not in ALLOWED_LKSA_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Jenis dokumen LKSA tidak dikenal.",
        )

    bucket = _get_private_bucket()

    object_path = build_lksa_object_path(
        id_pengajuan,
        jenis_dokumen,
        prepared["sha256"],
        prepared["extension"],
    )

    try:
        supabase.storage.from_(bucket).upload(
            path=object_path,
            file=prepared["content"],
            file_options={
                "content-type": prepared["content_type"],
                "cache-control": "3600",
                "upsert": "true",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Gagal mengunggah dokumen ke Supabase Storage.",
        ) from exc

    return {
        "bucket_name": bucket,
        "path_file": object_path,
        "mime_type": prepared["content_type"],
        "ukuran_byte": prepared["size"],
    }


def upload_lksa_document(
    file: UploadFile,
    id_pengajuan: int,
    jenis_dokumen: str,
) -> dict:
    """
    Pembungkus kompatibilitas: validasi + unggah dalam satu panggilan.

    Struktur:
    pengajuan_lksa/<id_pengajuan>/<jenis_dokumen>/<sha256>.<ext>
    """

    prepared = prepare_lksa_file(file, jenis_dokumen)

    return upload_prepared_lksa_file(
        prepared,
        id_pengajuan,
        jenis_dokumen,
    )


def delete_lksa_document_quietly(
    bucket_name: str,
    path_file: str,
) -> None:
    """
    Hapus objek Supabase tanpa melempar error.

    Dipakai untuk pembersihan sisa (mis. berkas lama yang digantikan)
    setelah data utama sudah aman tersimpan di database.
    """

    try:
        delete_lksa_document(bucket_name, path_file)
    except Exception:
        logger.warning(
            "Gagal membersihkan objek Supabase: %s", path_file
        )


def delete_lksa_document(
    bucket_name: str,
    path_file: str,
) -> None:
    """
    Menghapus objek dokumen dari Supabase.
    Hanya bucket private yang diperbolehkan.
    """

    expected_bucket = _get_private_bucket()

    if bucket_name != expected_bucket:
        raise HTTPException(
            status_code=400,
            detail="Bucket dokumen tidak valid.",
        )

    if (
        not path_file.startswith("pengajuan_lksa/")
        or ".." in Path(path_file).parts
    ):
        raise HTTPException(
            status_code=400,
            detail="Path dokumen tidak valid.",
        )

    try:
        supabase.storage.from_(expected_bucket).remove(
            [path_file]
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Gagal menghapus dokumen dari Supabase.",
        ) from exc


def create_lksa_signed_url(
    bucket_name: str,
    path_file: str,
    expires_in: int = 300,
) -> str:
    """
    Membuat signed URL sementara untuk membuka dokumen private.
    """

    expected_bucket = _get_private_bucket()

    if bucket_name != expected_bucket:
        raise HTTPException(
            status_code=400,
            detail="Bucket dokumen tidak valid.",
        )

    if (
        not path_file.startswith("pengajuan_lksa/")
        or ".." in Path(path_file).parts
    ):
        raise HTTPException(
            status_code=400,
            detail="Path dokumen tidak valid.",
        )

    try:
        result = supabase.storage.from_(expected_bucket).create_signed_url(
            path_file,
            expires_in,
        )

        signed_url = (
            result.get("signedURL")
            or result.get("signedUrl")
        )

        if not signed_url:
            raise ValueError("Signed URL tidak ditemukan.")

        return signed_url

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Gagal membuat URL dokumen sementara.",
        ) from exc
