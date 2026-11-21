"""Audit donasi, analitik dashboard, dan lacak tiket COTA memakai data asli DB."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.database import Base
from app.db.models.adoption import PengajuanAdopsi
from app.db.models.anak_asuh import AnakAsuh
from app.db.models.donation import Donasi
from app.db.models.panti import PantiAsuhan
from app.db.models.report import LaporanPengaduan
from app.db.models.user import User
from app.db.models.wishlist import WishlistPanti
from app.main import app


def _setup():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)

    def override_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    db = SessionLocal()

    admin = User(nama="Admin", email="admin@halo.test",
                 password_hash=hash_password("Admin12345"), peran="admin")
    budi = User(nama="Budi Santoso", email="budi@halo.test",
                password_hash=hash_password("Warga12345"), peran="masyarakat")
    sari = User(nama="Sari", email="sari@halo.test",
                password_hash=hash_password("Warga12345"), peran="masyarakat")
    db.add_all([admin, budi, sari])
    db.flush()

    p1 = PantiAsuhan(nama_panti="Panti Harapan", alamat="Jl. A",
                     status_akreditasi="A")
    p2 = PantiAsuhan(nama_panti="Panti Kosong", alamat="Jl. B")
    db.add_all([p1, p2])
    db.flush()

    db.add_all([
        Donasi(id_user=budi.id, id_panti=p1.id, jenis_donasi="uang",
               jumlah_nominal=100000, status_verifikasi="terverifikasi"),
        Donasi(id_user=budi.id, id_panti=p1.id, jenis_donasi="uang",
               jumlah_nominal=50000, status_verifikasi="ditolak"),
        Donasi(id_user=budi.id, id_panti=p1.id, jenis_donasi="barang",
               jumlah_nominal=0, nama_barang="Beras", jumlah_barang=10,
               satuan_barang="kg", status_verifikasi="terverifikasi"),
        Donasi(id_user=budi.id, id_panti=p1.id, jenis_donasi="uang",
               jumlah_nominal=1000, status_verifikasi="menunggu"),
        WishlistPanti(id_panti=p1.id, nama_barang="Susu",
                      jumlah_kebutuhan=10, jumlah_terpenuhi=1),
        AnakAsuh(id_panti=p1.id, nama="Anak 1", status_kesejahteraan="Yatim"),
        AnakAsuh(id_panti=p1.id, nama="Anak 2", status_kesejahteraan="Piatu"),
        LaporanPengaduan(kode_tiket="T-1", isi_laporan="x" * 12,
                         jenis_laporan="kekerasan", status="selesai"),
        LaporanPengaduan(kode_tiket="T-2", isi_laporan="x" * 12,
                         jenis_laporan="kekerasan", status="baru"),
    ])
    adopsi = PengajuanAdopsi(
        id_user=budi.id, nama_pemohon="Budi Santoso & Ani Lestari",
        tanggal_lahir_pemohon=date(1985, 1, 1),
        tanggal_pernikahan=date(2015, 1, 1), id_panti=p1.id,
        status="menunggu_tinjauan_manual")
    db.add(adopsi)
    db.commit()
    ids = {"adopsi": adopsi.id, "panti": p1.id}
    db.close()
    return TestClient(app), ids


def _login(client, email, password):
    res = client.post("/api/auth/login",
                      data={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_admin_donations_include_real_names():
    client, _ = _setup()
    rows = client.get("/api/admin/donasi",
                      headers=_login(client, "admin@halo.test", "Admin12345")).json()
    assert {r["nama_donatur"] for r in rows} == {"Budi Santoso"}
    assert {r["nama_panti"] for r in rows} == {"Panti Harapan"}


def test_recap_uses_only_verified_money_and_goods():
    client, _ = _setup()
    rows = client.get("/api/admin/donasi-rekap-panti",
                      headers=_login(client, "admin@halo.test", "Admin12345")).json()
    by_name = {r["nama_panti"]: r for r in rows}
    harapan = by_name["Panti Harapan"]
    assert float(harapan["uang_terverifikasi"]) == 100000
    assert harapan["total_barang_diterima"] == 10
    assert harapan["donasi_menunggu"] == 1
    assert harapan["tingkat_urgensi"] == "Kritis"
    assert by_name["Panti Kosong"]["tingkat_urgensi"] == "Belum ada data"
    assert float(by_name["Panti Kosong"]["uang_terverifikasi"]) == 0


def test_recap_requires_admin():
    client, _ = _setup()
    headers = _login(client, "budi@halo.test", "Warga12345")
    assert client.get("/api/admin/donasi-rekap-panti", headers=headers).status_code == 403


def test_dashboard_stats_analytics_are_real():
    client, _ = _setup()
    data = client.get("/api/admin/dashboard/stats",
                      headers=_login(client, "admin@halo.test", "Admin12345")).json()["analitik"]
    assert data["total_panti"] == 2
    assert data["panti_bertanda_daftar"] == 1
    assert data["total_anak_asuh_tercatat"] == 2
    assert data["anak_asuh_per_status"] == {"Yatim": 1, "Piatu": 1}
    assert data["total_pengaduan"] == 2
    assert data["pengaduan_selesai"] == 1
    assert data["adopsi_disetujui"] == 0


def test_track_ticket_returns_real_applicant_name_for_owner():
    client, ids = _setup()
    headers = _login(client, "budi@halo.test", "Warga12345")
    res = client.get(
        f"/api/masyarakat/pengajuan-adopsi/lacak/PIPA-2024-{ids['adopsi']}",
        headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["nama_pemohon"] == "Budi Santoso & Ani Lestari"
    assert body["nama_panti"] == "Panti Harapan"
    assert body["tahap_saat_ini"] == 2


def test_track_ticket_hidden_from_other_users_and_unknown_codes():
    client, ids = _setup()
    other = _login(client, "sari@halo.test", "Warga12345")
    url = f"/api/masyarakat/pengajuan-adopsi/lacak/PIPA-2024-{ids['adopsi']}"
    assert client.get(url, headers=other).status_code == 404
    mine = _login(client, "budi@halo.test", "Warga12345")
    assert client.get("/api/masyarakat/pengajuan-adopsi/lacak/PIPA-2024-9999",
                      headers=mine).status_code == 404
    assert client.get("/api/masyarakat/pengajuan-adopsi/lacak/ngawur",
                      headers=mine).status_code == 404
