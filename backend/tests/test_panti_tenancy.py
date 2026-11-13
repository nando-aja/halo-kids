"""Isolasi data antar panti (multi-tenant)."""

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
from app.db.models.panti import PantiAsuhan
from app.db.models.pengajuan_lksa import PengajuanLKSA
from app.db.models.user import User
from app.db.models.volunteer import Relawan
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

    warga = User(nama="Warga", email="warga@halo.test",
                 password_hash=hash_password("Warga12345"), peran="masyarakat")
    db.add(warga)

    ids = {}
    for key, approved in (("a", True), ("b", True), ("c", False)):
        mgr = User(nama=f"Mgr {key}", email=f"{key}@halo.test",
                   password_hash=hash_password("Manager12345"),
                   peran="pengelola-panti")
        db.add(mgr)
        db.flush()
        panti = PantiAsuhan(nama_panti=f"Panti {key.upper()}", alamat="Alamat panti",
                            id_admin_pengelola=mgr.id)
        db.add(panti)
        db.flush()
        db.add(PengajuanLKSA(
            id_pengelola=mgr.id, id_panti=panti.id,
            nama_panti=panti.nama_panti, bentuk_lembaga="berbadan_hukum",
            alamat="Alamat panti",
            status_pengajuan="disetujui" if approved else "diajukan",
        ))
        ids[key] = panti.id
    db.commit()
    db.refresh(warga)

    def adopsi(id_panti, nama):
        item = PengajuanAdopsi(
            id_user=warga.id, nama_pemohon=nama,
            tanggal_lahir_pemohon=date(1985, 1, 1),
            tanggal_pernikahan=date(2012, 1, 1), id_panti=id_panti)
        db.add(item)
        db.flush()
        return item.id

    def relawan(id_panti, nama):
        item = Relawan(id_user=warga.id, nama=nama, id_panti=id_panti)
        db.add(item)
        db.flush()
        return item.id

    ids["adopsi_a"] = adopsi(ids["a"], "Pemohon A")
    ids["adopsi_b"] = adopsi(ids["b"], "Pemohon B")
    ids["adopsi_open"] = adopsi(None, "Pemohon Terbuka")
    ids["relawan_a"] = relawan(ids["a"], "Relawan A")
    ids["relawan_b"] = relawan(ids["b"], "Relawan B")
    db.commit()
    db.close()
    return TestClient(app), ids


def _login(client, email, password="Manager12345"):
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def test_adoptions_only_those_addressed_to_own_panti():
    client, ids = _setup()
    a, b = _login(client, "a@halo.test"), _login(client, "b@halo.test")

    rows = client.get("/api/panti/pengajuan-adopsi", headers=a).json()
    assert [r["nama_pemohon"] for r in rows] == ["Pemohon A"]

    rows = client.get("/api/panti/pengajuan-adopsi", headers=b).json()
    assert [r["nama_pemohon"] for r in rows] == ["Pemohon B"]

    # Tidak bisa menyentuh pengajuan panti lain maupun rekomendasi terbuka.
    for other in (ids["adopsi_b"], ids["adopsi_open"]):
        r = client.patch(f"/api/panti/pengajuan-adopsi/{other}/rekomendasi", headers=a)
        assert r.status_code == 404

    r = client.patch(f"/api/panti/pengajuan-adopsi/{ids['adopsi_a']}/rekomendasi", headers=a)
    assert r.status_code == 200 and r.json()["status"] == "diverifikasi"


def test_volunteers_are_scoped_and_cross_panti_decision_is_blocked():
    client, ids = _setup()
    a = _login(client, "a@halo.test")

    rows = client.get("/api/panti/relawan", headers=a).json()
    assert [r["nama"] for r in rows] == ["Relawan A"]

    r = client.patch(f"/api/panti/relawan/{ids['relawan_b']}/status",
                     params={"new_status": "disetujui"}, headers=a)
    assert r.status_code == 404

    r = client.patch(f"/api/panti/relawan/{ids['relawan_a']}/status",
                     params={"new_status": "disetujui"}, headers=a)
    assert r.status_code == 200 and r.json()["status"] == "disetujui"


def test_children_are_private_to_each_panti():
    client, ids = _setup()
    a, b = _login(client, "a@halo.test"), _login(client, "b@halo.test")

    assert client.get("/api/panti/anak-asuh", headers=a).json() == []

    r = client.post("/api/panti/anak-asuh", headers=a, json={
        "nama": "Anak Panti A", "usia": 7, "jenis_kelamin": "Perempuan",
        "status_kesejahteraan": "Yatim"})
    assert r.status_code == 201
    child_id = r.json()["id"]
    assert r.json()["id_panti"] == ids["a"]

    assert [c["nama"] for c in client.get("/api/panti/anak-asuh", headers=a).json()] == ["Anak Panti A"]
    assert client.get("/api/panti/anak-asuh", headers=b).json() == []

    assert client.put(f"/api/panti/anak-asuh/{child_id}", headers=b,
                      json={"nama": "Dibajak"}).status_code == 404
    assert client.delete(f"/api/panti/anak-asuh/{child_id}", headers=b).status_code == 404

    r = client.put(f"/api/panti/anak-asuh/{child_id}", headers=a, json={"usia": 8})
    assert r.status_code == 200 and r.json()["usia"] == 8
    assert client.delete(f"/api/panti/anak-asuh/{child_id}", headers=a).status_code == 200


def test_unapproved_panti_cannot_access_operational_data():
    client, _ = _setup()
    c = _login(client, "c@halo.test")
    for path in ("/api/panti/anak-asuh", "/api/panti/relawan", "/api/panti/pengajuan-adopsi"):
        assert client.get(path, headers=c).status_code == 403
