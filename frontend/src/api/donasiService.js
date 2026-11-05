import apiClient from './apiClient';

export const donasiService = {

  // ==========================================
  // UPLOAD BUKTI TRANSFER KE SUPABASE
  // ==========================================

  async uploadBuktiTransfer(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
      '/api/upload/bukti-transfer',
      formData
    );

    return response.data;
  },


  // ==========================================
  // MEMBUAT TRANSAKSI DONASI
  // ==========================================

  async createDonasi(data) {
    const response = await apiClient.post(
      '/api/masyarakat/donasi',
      data
    );

    return response.data;
  },


  // ==========================================
  // RIWAYAT DONASI WARGA
  // ==========================================

  async getMyDonations() {
    const response = await apiClient.get(
      '/api/masyarakat/donasi'
    );

    return response.data;
  },


  // ==========================================
  // SELURUH DONASI UNTUK ADMIN DINSOS
  // ==========================================

  async getAdminDonations() {
    const response = await apiClient.get(
      '/api/admin/donasi'
    );

    return response.data;
  },


  // ==========================================
  // DOWNLOAD BUKTI TRANSFER UNTUK ADMIN
  // ==========================================

  async getAdminFile(filePath) {
    const response = await apiClient.get(
      '/api/admin/files',
      {
        params: {
          path: filePath
        },
        responseType: 'blob'
      }
    );

    return response.data;
  },


  // ==========================================
  // ANALISIS AI BUKTI TRANSFER
  // ==========================================

  async analyzeProofAI(donationId) {
    const response = await apiClient.post(
      `/api/admin/donasi/${donationId}/analisis-bukti-ai`
    );

    return response.data;
  },


  // ==========================================
  // APPROVAL DONASI OLEH DINSOS
  // ==========================================

  async updateDonasiStatus(donationId, newStatus) {
    const response = await apiClient.patch(
      `/api/admin/donasi/${donationId}/status`,
      null,
      {
        params: {
          new_status: newStatus
        }
      }
    );

    return response.data;
  }

};

export default donasiService;