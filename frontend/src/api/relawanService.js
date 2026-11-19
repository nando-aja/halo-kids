import apiClient from './apiClient';

export const relawanService = {
  /**
   * Mengunggah dokumen identitas / KTP calon relawan
   */
  async uploadIdentitas(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/upload/identitas-relawan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Mengirimkan formulir pendaftaran relawan baru
   */
  async registerRelawan(data) {
    const response = await apiClient.post('/api/masyarakat/relawan', data);
    return response.data;
  },

  /**
   * Mengambil status pendaftaran relawan milik user yang sedang login
   */
  async getMyRelawan() {
    const response = await apiClient.get('/api/masyarakat/relawan');
    return response.data;
  },

  /**
   * Mengambil daftar seluruh relawan yang terverifikasi / disetujui Dinsos
   */
  async getVerifiedVolunteers() {
    const response = await apiClient.get('/api/public/relawan/verified');
    return response.data;
  },

  /**
   * Mengambil seluruh pendaftar relawan untuk Admin Dinsos
   */
  async getAdminRelawan() {
    const response = await apiClient.get('/api/admin/relawan');
    return response.data;
  },

  /**
   * Mengubah status persetujuan relawan ('menunggu' | 'disetujui' | 'ditolak')
   */
  async updateStatus(volunteerId, newStatus) {
    const response = await apiClient.patch(
      `/api/admin/relawan/${volunteerId}/status`,
      null,
      {
        params: { new_status: newStatus },
      }
    );
    return response.data;
  },

  /**
   * Menghapus data relawan
   */
  async deleteRelawan(volunteerId) {
    const response = await apiClient.delete(`/api/admin/relawan/${volunteerId}`);
    return response.data;
  },
};

export default relawanService;
