from __future__ import annotations

import py_compile
import shutil
import sys
from datetime import datetime
from pathlib import Path


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"Marker awal tidak ditemukan untuk {label}: {start_marker!r}")
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f"Marker akhir tidak ditemukan untuk {label}: {end_marker!r}")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


def main() -> int:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("backend/app/api/routes/admin.py")
    target = target.resolve()
    if not target.is_file():
        print(f"File backend tidak ditemukan: {target}", file=sys.stderr)
        print("Jalankan dari root proyek atau berikan path ke app/api/routes/admin.py.", file=sys.stderr)
        return 2

    text = target.read_text(encoding="utf-8")

    reanalyze = '''@router.post("/pengajuan-adopsi/{adoption_id}/analisis-ai")
def reanalyze_adoption(
    adoption_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PengajuanAdopsi)
        .filter(PengajuanAdopsi.id == adoption_id)
        .first()
    )
    if item is None:
        raise HTTPException(404, "Pengajuan adopsi tidak ditemukan")

    documents = {
        "ktp": item.dokumen_ktp,
        "kk": item.dokumen_kk,
    }
    supporting = item.dokumen_pendukung or {}
    if isinstance(supporting, dict):
        documents.update(supporting)
    elif isinstance(supporting, list):
        # Data lama kadang tersimpan sebagai list path, bukan dict jenis dokumen -> path.
        # Pakai key stabil supaya OCR tetap bisa dijalankan dan hasilnya terlihat di admin.
        for index, path in enumerate(supporting, start=1):
            if path:
                documents[f"dokumen_pendukung_{index}"] = path

    documents = {
        key: value
        for key, value in documents.items()
        if isinstance(value, str) and value.strip()
    }
    if not documents:
        raise HTTPException(400, "Pengajuan ini belum memiliki path dokumen yang dapat dianalisis")

    result = analyze_adoption_documents(
        document_paths=documents,
        db=db,
        adoption=item,
    )
    item.hasil_ekstraksi_ai = result
    if result.get("requires_manual_review"):
        item.status = "menunggu_tinjauan_manual"

    db.commit()
    db.refresh(item)
    return {
        "id_pengajuan": item.id,
        "status": item.status,
        "hasil_ekstraksi_ai": item.hasil_ekstraksi_ai,
    }
'''
    text = replace_between(
        text,
        '@router.post("/pengajuan-adopsi/{adoption_id}/analisis-ai")',
        '@router.patch(\n    "/pengajuan-adopsi/{adoption_id}/status",',
        reanalyze,
        "reanalyze_adoption",
    )

    referenced = '''def _admin_file_is_referenced(db: Session, relative_path: str) -> bool:
    """Pastikan admin hanya membuka berkas yang direferensikan record aplikasi."""
    normalized = relative_path.replace("\\\\", "/")

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
        if isinstance(supporting, list) and normalized in supporting:
            return True
    return False
'''
    text = replace_between(
        text,
        'def _admin_file_is_referenced(db: Session, relative_path: str) -> bool:',
        '@router.get("/pengajuan-adopsi/{adoption_id}/dokumen/{dokumen_key}")',
        referenced,
        "_admin_file_is_referenced",
    )

    download = '''@router.get("/pengajuan-adopsi/{adoption_id}/dokumen/{dokumen_key}")
def download_adoption_document(
    adoption_id: int,
    dokumen_key: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin mengambil file COTA setelah autentikasi dan validasi record."""
    item = db.query(PengajuanAdopsi).filter(PengajuanAdopsi.id == adoption_id).first()
    if item is None:
        raise HTTPException(404, "Pengajuan adopsi tidak ditemukan")

    allowed = {"ktp": item.dokumen_ktp, "kk": item.dokumen_kk}
    supporting = item.dokumen_pendukung or {}
    if isinstance(supporting, dict):
        allowed.update(supporting)
    elif isinstance(supporting, list):
        for index, path in enumerate(supporting, start=1):
            allowed[f"dokumen_pendukung_{index}"] = path

    relative_path = allowed.get(dokumen_key)
    if not isinstance(relative_path, str) or not relative_path.strip():
        raise HTTPException(404, "Dokumen tidak ditemukan")

    absolute_path = get_storage_absolute_path(relative_path)
    if not absolute_path.is_file():
        raise HTTPException(404, "File dokumen tidak ditemukan")
    return FileResponse(absolute_path)
'''
    text = replace_between(
        text,
        '@router.get("/pengajuan-adopsi/{adoption_id}/dokumen/{dokumen_key}")',
        '@router.get("/files")',
        download,
        "download_adoption_document",
    )

    backup = target.with_suffix(target.suffix + f".bak-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    shutil.copy2(target, backup)
    target.write_text(text, encoding="utf-8", newline="")
    try:
        py_compile.compile(str(target), doraise=True)
    except py_compile.PyCompileError:
        shutil.copy2(backup, target)
        print("Hasil patch gagal dikompilasi. File awal dipulihkan dari backup.", file=sys.stderr)
        raise

    print(f"Patch berhasil diterapkan: {target}")
    print(f"Backup dibuat: {backup}")
    print("Pastikan backend berjalan dan uji GET dokumen + POST analisis-ai.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
