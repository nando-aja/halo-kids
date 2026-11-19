"""Pengaturan bersama untuk semua tes backend."""
import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def allow_local_storage_for_tests(monkeypatch):
    """Tes berjalan tanpa Supabase, jadi izinkan penyimpanan lokal di sini saja.

    Di production flag ini tetap False (default), sehingga upload tanpa
    Supabase ditolak seperti perilaku aslinya.
    """
    monkeypatch.setattr(settings, "ALLOW_LOCAL_STORAGE", True)
