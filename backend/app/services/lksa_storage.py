
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.supabase_storage import supabase


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


def upload_lksa_document(
    file: UploadFile,
    id_pengajuan: int,
    jenis_dokumen: str,
) -> dict:
    """
    Upload dokumen LKSA ke bucket private.

    Struktur:
    pengajuan_lksa/<id_pengajuan>/<jenis_dokumen>/<uuid>.<ext>
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

    bucket = _get_private_bucket()

    # Nama file acak agar tidak menimpa file sebelumnya.
    filename = f"{uuid4().hex}{extension}"

    object_path = (
        f"pengajuan_lksa/{id_pengajuan}/"
        f"{jenis_dokumen}/{filename}"
    )

    file_bytes = bytearray()

    try:
        while True:
            chunk = file.file.read(1024 * 1024)

            if not chunk:
                break

            file_bytes.extend(chunk)

            if len(file_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Ukuran file maksimal 10 MB.",
                )

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="File yang diunggah kosong.",
            )

        content_type = _get_content_type(
            extension,
            file.content_type,
        )

        try:
            supabase.storage.from_(bucket).upload(
                path=object_path,
                file=bytes(file_bytes),
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600",
                    "upsert": "false",
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
            "mime_type": content_type,
            "ukuran_byte": len(file_bytes),
        }

    finally:
        try:
            file.file.close()
        except Exception:
            pass


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
