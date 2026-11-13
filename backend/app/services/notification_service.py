from sqlalchemy.orm import Session

from app.db.models.announcement import Pengumuman
from app.db.models.notification import Notifikasi
from app.db.models.user import User


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
) -> Notifikasi:
    item = Notifikasi(
        id_user=user_id,
        judul=title[:150],
        pesan=message[:255],
        is_read=False,
    )
    db.add(item)
    return item


def notify_admins(
    db: Session,
    title: str,
    message: str,
) -> int:
    """
    Kirim satu notifikasi PRIBADI ke setiap akun Super Admin Dinsos.

    Masing-masing admin mendapat salinan sendiri (id_user = admin itu),
    sehingga status baca tiap admin terpisah. Pengelola panti dan
    masyarakat tidak menerimanya. Tidak melakukan commit; ikut
    transaksi pemanggil.
    """

    admin_ids = [
        row[0]
        for row in db.query(User.id)
        .filter(User.peran == "admin")
        .all()
    ]

    for admin_id in admin_ids:
        create_notification(db, admin_id, title, message)

    return len(admin_ids)


def create_announcement(
    db: Session,
    title: str,
    message: str,
    category: str = "pengumuman",
    panti_id: int | None = None,
    creator_id: int | None = None,
) -> Pengumuman:
    """Buat pengumuman publik. Tidak melakukan commit."""

    item = Pengumuman(
        judul=title[:150],
        pesan=message[:500],
        kategori=category,
        id_panti=panti_id,
        id_pembuat=creator_id,
        aktif=True,
    )
    db.add(item)
    return item


def get_user_notifications(
    db: Session,
    user_id: int,
    limit: int = 50,
) -> list[Notifikasi]:
    return (
        db.query(Notifikasi)
        .filter(Notifikasi.id_user == user_id)
        .order_by(Notifikasi.id.desc())
        .limit(limit)
        .all()
    )


def mark_notification_read(
    db: Session,
    user_id: int,
    notification_id: int,
) -> Notifikasi | None:
    """Menandai satu notifikasi milik user sebagai sudah dibaca."""
    item = (
        db.query(Notifikasi)
        .filter(
            Notifikasi.id == notification_id,
            Notifikasi.id_user == user_id,
        )
        .first()
    )

    if item is None:
        return None

    item.is_read = True
    db.commit()
    db.refresh(item)
    return item


def mark_all_notifications_read(db: Session, user_id: int) -> int:
    """Menandai semua notifikasi user sebagai dibaca. Mengembalikan jumlahnya."""
    updated = (
        db.query(Notifikasi)
        .filter(
            Notifikasi.id_user == user_id,
            Notifikasi.is_read.is_(False),
        )
        .update({Notifikasi.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return updated
