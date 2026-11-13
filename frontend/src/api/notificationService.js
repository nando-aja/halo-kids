import apiClient from './apiClient';

// Endpoint kotak masuk pribadi per peran. Setiap endpoint hanya
// mengembalikan notifikasi milik akun yang sedang login.
const PERSONAL_PATH = {
  admin: '/api/admin/notifikasi',
  'pengelola-panti': '/api/panti/notifikasi',
  masyarakat: '/api/masyarakat/notifikasi',
};

function personalPath(role) {
  const path = PERSONAL_PATH[role];

  if (!path) {
    throw new Error('Peran pengguna tidak dikenal untuk notifikasi.');
  }

  return path;
}

export const notificationService = {

  // ---------- Notifikasi pribadi (wajib login) ----------

  async listMine(role, limit = 50) {
    const response = await apiClient.get(personalPath(role), {
      params: { limit },
    });
    return response.data;
  },

  async markRead(role, notificationId) {
    const response = await apiClient.patch(
      `${personalPath(role)}/${notificationId}/read`
    );
    return response.data;
  },

  async markAllRead(role) {
    const response = await apiClient.patch(
      `${personalPath(role)}/read-all`
    );
    return response.data;
  },

  // ---------- Pengumuman publik (tanpa login) ----------

  async listAnnouncements(limit = 20) {
    const response = await apiClient.get('/api/public/pengumuman', {
      params: { limit },
    });
    return response.data;
  },

  // ---------- Pengelolaan pengumuman (Super Admin) ----------

  async adminListAnnouncements() {
    const response = await apiClient.get('/api/admin/pengumuman');
    return response.data;
  },

  async adminCreateAnnouncement({ judul, pesan, kategori }) {
    const response = await apiClient.post('/api/admin/pengumuman', {
      judul,
      pesan,
      kategori,
    });
    return response.data;
  },

  async adminDeactivateAnnouncement(announcementId) {
    const response = await apiClient.delete(
      `/api/admin/pengumuman/${announcementId}`
    );
    return response.data;
  },
};

export default notificationService;
