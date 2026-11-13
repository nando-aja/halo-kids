// Fungsi bantu murni untuk notifikasi (tanpa React) agar mudah diuji.

export const ANNOUNCEMENT_SEEN_KEY = 'halokids_seen_announcement_id';

const ROLE_CODES = new Set(['admin', 'pengelola-panti', 'masyarakat']);

/**
 * Menentukan peran notifikasi dari objek pengguna sesi.
 * Mengembalikan null jika belum login.
 */
export function resolveNotificationRole(user) {
  if (!user) return null;

  if (ROLE_CODES.has(user.roleCode)) return user.roleCode;

  const label = String(user.role || '').toLowerCase();
  if (label === 'super admin') return 'admin';
  if (label === 'admin panti') return 'pengelola-panti';

  return 'masyarakat';
}

/**
 * Kategori ditebak dari judul notifikasi yang dibuat backend.
 * Urutan penting: LKSA dicek sebelum kata "pengajuan" yang umum.
 */
export function inferCategory(title) {
  const text = String(title || '').toLowerCase();

  if (text.includes('lksa')) return 'lksa';
  if (text.includes('adopsi')) return 'adopsi';
  if (text.includes('relawan')) return 'relawan';
  if (text.includes('donasi')) return 'donasi';
  if (text.includes('laporan') || text.includes('pengaduan')) {
    return 'laporan';
  }

  return 'umum';
}

// Tujuan halaman saat notifikasi diklik, per peran.
const TARGET_TABS = {
  admin: {
    lksa: 'approval_panti',
    adopsi: 'supervisi_adopsi',
    laporan: 'monitoring_hilang',
    donasi: 'audit_donasi',
  },
  'pengelola-panti': {
    lksa: 'status_pengajuan_lksa',
    adopsi: 'formulir_adopsi_panti',
    relawan: 'volunteer_panti',
    donasi: 'input_donasi',
    laporan: 'laporan_hilang_panti',
  },
  masyarakat: {
    adopsi: 'adopsi',
    relawan: 'volunteer',
    donasi: 'donasi',
    laporan: 'pengaduan',
  },
};

export function targetTabFor(role, category) {
  return TARGET_TABS[role]?.[category] || null;
}

/**
 * Backend mengirim waktu tanpa zona (mis. "2026-11-12T09:00:00").
 * Dianggap UTC agar tidak bergeser mengikuti zona browser.
 */
export function parseServerDate(value) {
  if (!value) return null;

  const text = String(value);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(value, now = Date.now()) {
  const date = parseServerDate(value);
  if (!date) return '';

  const seconds = Math.floor((now - date.getTime()) / 1000);

  // Selisih jam server/browser tidak boleh menghasilkan waktu negatif.
  if (seconds < 60) return 'Baru saja';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function countUnread(items) {
  return (items || []).filter((item) => !item.is_read).length;
}

export function maxId(items) {
  return (items || []).reduce(
    (highest, item) => Math.max(highest, Number(item.id) || 0),
    0
  );
}

/** Pengumuman dianggap baru jika id-nya lebih besar dari yang terakhir dilihat. */
export function countUnseenAnnouncements(items, seenId) {
  return (items || []).filter(
    (item) => Number(item.id) > Number(seenId || 0)
  ).length;
}
