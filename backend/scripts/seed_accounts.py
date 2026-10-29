import pymysql
from app.core.security import hash_password

def seed():
    conn = pymysql.connect(host='localhost', user='root', password='', database='halokids_db', autocommit=True)
    cur = conn.cursor()

    mutiara_hash = hash_password('12345678')
    default_hash = hash_password('123456')

    # 1. mutiara@gmail.com -> User (masyarakat)
    cur.execute("SELECT id FROM users WHERE email = %s", ('mutiara@gmail.com',))
    row = cur.fetchone()
    if not row:
        cur.execute("""
            INSERT INTO users (nama, email, no_hp, password_hash, peran)
            VALUES (%s, %s, %s, %s, %s)
        """, ('Mutiara Dewanda', 'mutiara@gmail.com', '0812-3456-7890', mutiara_hash, 'masyarakat'))
    else:
        cur.execute("UPDATE users SET peran = 'masyarakat', password_hash = %s WHERE email = %s", (mutiara_hash, 'mutiara@gmail.com'))
    print("Akun Warga mutiara@gmail.com berhasil diset (sandi: 12345678).")

    # 2. mutiara@panti.or.id -> Admin Panti (pengelola-panti)
    cur.execute("SELECT id FROM users WHERE email = %s", ('mutiara@panti.or.id',))
    row = cur.fetchone()
    if not row:
        cur.execute("""
            INSERT INTO users (nama, email, no_hp, password_hash, peran)
            VALUES (%s, %s, %s, %s, %s)
        """, ('Mutiara Dewanda (Admin Panti)', 'mutiara@panti.or.id', '0813-8877-6655', mutiara_hash, 'pengelola-panti'))
        m_panti_id = cur.lastrowid
    else:
        m_panti_id = row[0]
        cur.execute("UPDATE users SET peran = 'pengelola-panti', password_hash = %s WHERE email = %s", (mutiara_hash, 'mutiara@panti.or.id'))
    print("Akun Admin Panti mutiara@panti.or.id berhasil diset (sandi: 12345678).")

    # 3. mutiara@dinsos.go.id -> Super Admin (admin)
    cur.execute("SELECT id FROM users WHERE email = %s", ('mutiara@dinsos.go.id',))
    row = cur.fetchone()
    if not row:
        cur.execute("""
            INSERT INTO users (nama, email, no_hp, password_hash, peran)
            VALUES (%s, %s, %s, %s, %s)
        """, ('Mutiara Dewanda (Super Admin)', 'mutiara@dinsos.go.id', '0811-2233-4455', mutiara_hash, 'admin'))
    else:
        cur.execute("UPDATE users SET peran = 'admin', password_hash = %s WHERE email = %s", (mutiara_hash, 'mutiara@dinsos.go.id'))
    print("Akun Super Admin mutiara@dinsos.go.id berhasil diset (sandi: 12345678).")

    # Pastikan ada panti asuhan yang terhubung ke mutiara@panti.or.id
    cur.execute("SELECT id FROM panti_asuhan WHERE id_admin_pengelola = %s", (m_panti_id,))
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO panti_asuhan (nama_panti, alamat, kontak, status_akreditasi, jumlah_anak_asuh, id_admin_pengelola)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('LKSA Mutiara Kasih Mandiri', 'Jl. Pajajaran No. 88, Bogor', '0813-8877-6655', 'AKREDITASI A', 30, m_panti_id))
        print("Panti asuhan untuk mutiara@panti.or.id berhasil dibuat.")

    # Akun default cadangan
    for email, role, nama, hp in [
        ('ahmad@gmail.com', 'masyarakat', 'Ahmad Rifai', '0812-9876-5432'),
        ('panti@panti-alikhlas.or.id', 'pengelola-panti', 'Ust. H. Syarifudin', '0813-8877-6655'),
        ('budi@dinsos.go.id', 'admin', 'Budi Santoso, S.Sos', '0811-2233-4455')
    ]:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO users (nama, email, no_hp, password_hash, peran)
                VALUES (%s, %s, %s, %s, %s)
            """, (nama, email, hp, default_hash, role))

    cur.close()
    conn.close()
    print("Seeding akun selesai!")

if __name__ == '__main__':
    seed()
