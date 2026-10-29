from __future__ import annotations

import logging
from datetime import datetime
from mimetypes import guess_type
from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.supabase_storage import supabase


logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
# File-backed application data uses Supabase. STORAGE_DIR is retained for
# unrelated JSON-based features that still use local data files.
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_CACHE_DIR = BASE_DIR / ".storage_cache"

STORAGE_FOLDERS = {
    "ktp",
    "kk",
    "dokumen_pendukung",
    "bukti_transfer",
    "identitas_relawan",
    "laporan_dana",
    "galeri_panti",
    "laporan_pengawasan",
}

PUBLIC_FOLDERS = {"laporan_dana", "galeri_panti", "laporan_pengawasan"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024
OLD_PLACEHOLDER_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _require_supabase():
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase Storage belum dikonfigurasi. Periksa SUPABASE_URL, "
                "SUPABASE_SECRET_KEY, SUPABASE_PRIVATE_BUCKET, dan "
                "SUPABASE_PUBLIC_BUCKET pada backend/.env. File tidak akan "
                "ditandai berhasil jika hanya tersimpan lokal."
            ),
        )


def _get_bucket_name(folder_name: str) -> str:
    if folder_name not in STORAGE_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder storage tidak valid",
        )

    raw_name = (
        settings.SUPABASE_PUBLIC_BUCKET
        if folder_name in PUBLIC_FOLDERS
        else settings.SUPABASE_PRIVATE_BUCKET
    )
    bucket_name = str(raw_name or "").strip()
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Nama bucket Supabase belum dikonfigurasi. Periksa "
                "SUPABASE_PUBLIC_BUCKET dan SUPABASE_PRIVATE_BUCKET di backend/.env."
            ),
        )
    return bucket_name


def _get_object_path(relative_path: str) -> tuple[str, str]:
    """Convert storage/<folder>/<filename> into a Supabase bucket/object path."""
    if not isinstance(relative_path, str) or not relative_path.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file kosong",
        )

    normalized = relative_path.replace("\\", "/")
    if not normalized.startswith("storage/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file harus berada di dalam storage",
        )

    object_path = normalized[len("storage/"):]
    segments = object_path.split("/")
    if (
        len(segments) < 2
        or any(segment in {"", ".", ".."} for segment in segments)
        or object_path.startswith("/")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file tidak valid",
        )

    path = PurePosixPath(object_path)
    folder_name = path.parts[0]
    if folder_name not in STORAGE_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder storage tidak valid",
        )
    return _get_bucket_name(folder_name), object_path


def _safe_local_path(relative_path: str) -> Path:
    normalized = relative_path.replace("\\", "/")
    if not normalized.startswith("storage/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file tidak valid",
        )
    root = (BASE_DIR / "storage").resolve()
    candidate = (BASE_DIR / normalized).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file tidak valid",
        ) from exc
    return candidate


def _get_cache_path(relative_path: str) -> Path:
    normalized = relative_path.replace("\\", "/")
    if not normalized.startswith("storage/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file tidak valid",
        )

    object_path = normalized[len("storage/"):]
    candidate = (STORAGE_CACHE_DIR / object_path).resolve()
    root = STORAGE_CACHE_DIR.resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path file tidak valid",
        ) from exc
    return candidate


def _is_old_placeholder(path: Path) -> bool:
    try:
        return path.is_file() and path.read_bytes() == OLD_PLACEHOLDER_BYTES
    except OSError:
        return False


def _remove_placeholder(path: Path) -> None:
    if _is_old_placeholder(path):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove an old placeholder file from cache/storage.", exc_info=True)


def save_upload_file(file: UploadFile, folder_name: str, prefix: str = "") -> str:
    """Upload a real file to Supabase first; local copy is only a mirror/cache."""
    if folder_name not in STORAGE_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder storage tidak valid",
        )
    _require_supabase()
    bucket_name = _get_bucket_name(folder_name)

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file tidak ditemukan",
        )

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format file harus JPG, JPEG, PNG, atau PDF",
        )

    filename = f"{prefix}{uuid4().hex}{extension}"
    object_path = f"{folder_name}/{filename}"
    total_size = 0
    chunks: list[bytes] = []

    try:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Ukuran file maksimal 10 MB",
                )
            chunks.append(chunk)

        file_bytes = b"".join(chunks)
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File yang diunggah kosong",
            )

        content_type = file.content_type or guess_type(file.filename)[0] or "application/octet-stream"
        if extension in {".jpg", ".jpeg"}:
            content_type = "image/jpeg"
        elif extension == ".png":
            content_type = "image/png"
        elif extension == ".pdf":
            content_type = "application/pdf"

        try:
            supabase.storage.from_(bucket_name).upload(
                path=object_path,
                file=file_bytes,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600",
                    "upsert": "false",
                },
            )
        except Exception as exc:
            logger.exception("Supabase upload failed for folder %s", folder_name)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Upload ke Supabase Storage gagal. Periksa nama bucket, "
                    "izin akses, koneksi, dan secret key backend. Pengajuan "
                    "belum boleh dilanjutkan dengan berkas ini."
                ),
            ) from exc

        # Keep an optional local mirror to support OCR/FileResponse code that
        # expects a Path. Remote upload already succeeded before this step.
        try:
            local_path = (STORAGE_DIR / folder_name / filename).resolve()
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(file_bytes)
        except OSError:
            logger.warning("Supabase upload succeeded but local mirror failed.", exc_info=True)

        return f"storage/{object_path}"
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to process uploaded file in folder %s", folder_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal memproses file upload.",
        ) from exc
    finally:
        try:
            file.file.close()
        except Exception:
            pass


def get_storage_absolute_path(relative_path: str) -> Path:
    """Return a real local/cache file, downloading it from Supabase when necessary."""
    bucket_name, object_path = _get_object_path(relative_path)
    local_path = _safe_local_path(relative_path)
    cache_path = _get_cache_path(relative_path)

    # Versions of the earlier storage module could create a tiny fake PDF when
    # a file was missing. Never pass that placeholder to OCR or document review.
    _remove_placeholder(local_path)
    _remove_placeholder(cache_path)

    if local_path.is_file():
        return local_path
    if cache_path.is_file():
        return cache_path

    _require_supabase()
    try:
        file_bytes = supabase.storage.from_(bucket_name).download(object_path)
        if not file_bytes or file_bytes == OLD_PLACEHOLDER_BYTES:
            raise FileNotFoundError("Supabase returned an empty or placeholder object")
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(file_bytes)
        return cache_path
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not download file from Supabase object %s", object_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File tidak ditemukan di penyimpanan. Unggah ulang dokumen yang hilang.",
        ) from exc


def stored_file_exists(relative_path: str) -> bool:
    """Return True only when a real local/cache/cloud file can be resolved."""
    try:
        return get_storage_absolute_path(relative_path).is_file()
    except Exception:
        return False


def resolve_public_file(folder_name: str, filename: str) -> Path:
    if folder_name not in PUBLIC_FOLDERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File tidak ditemukan",
        )
    if not filename or filename != Path(filename).name or filename in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file tidak valid",
        )

    relative_path = (Path("storage") / folder_name / filename).as_posix()
    path = get_storage_absolute_path(relative_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File tidak ditemukan",
        )
    return path


def _list_local_files(folder_name: str, prefix: str = "") -> list[dict]:
    local_dir = (STORAGE_DIR / folder_name).resolve()
    if not local_dir.is_dir():
        return []
    files = []
    for path in sorted(local_dir.iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if not path.is_file() or not path.name.startswith(prefix) or _is_old_placeholder(path):
            continue
        files.append({
            "file": (Path("storage") / folder_name / path.name).as_posix(),
            "nama_file": path.name,
            "tanggal_unggah": path.stat().st_mtime,
        })
    return files


def list_folder_files(folder_name: str, prefix: str = "") -> list[dict]:
    """List files from Supabase as source of truth; use local only on remote failure."""
    if folder_name not in STORAGE_FOLDERS:
        return []

    if supabase is None:
        return _list_local_files(folder_name, prefix)

    bucket_name = _get_bucket_name(folder_name)
    try:
        items = supabase.storage.from_(bucket_name).list(
            folder_name,
            {"limit": 100, "offset": 0},
        )
    except Exception:
        logger.exception("Failed to list Supabase folder %s", folder_name)
        return _list_local_files(folder_name, prefix)

    result = []
    for item in items or []:
        filename = item.get("name")
        if not filename or not filename.startswith(prefix):
            continue
        if item.get("id") is None and item.get("metadata") is None:
            continue
        updated_at = item.get("updated_at") or item.get("created_at")
        timestamp = 0
        if updated_at:
            try:
                timestamp = datetime.fromisoformat(updated_at.replace("Z", "+00:00")).timestamp()
            except (ValueError, TypeError, AttributeError):
                timestamp = 0
        result.append({
            "file": (Path("storage") / folder_name / filename).as_posix(),
            "nama_file": filename,
            "tanggal_unggah": timestamp,
        })
    return sorted(result, key=lambda item: item["tanggal_unggah"], reverse=True)


def delete_stored_file(relative_path: str) -> None:
    """Delete the remote object first; preserve local copies if remote deletion fails."""
    bucket_name, object_path = _get_object_path(relative_path)
    _require_supabase()
    try:
        supabase.storage.from_(bucket_name).remove([object_path])
    except Exception as exc:
        logger.exception("Supabase deletion failed for object %s", object_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal menghapus berkas dari Supabase Storage.",
        ) from exc

    local_path = _safe_local_path(relative_path)
    cache_path = _get_cache_path(relative_path)
    for path in (local_path, cache_path):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Remote file deleted, but local cache cleanup failed.", exc_info=True)
