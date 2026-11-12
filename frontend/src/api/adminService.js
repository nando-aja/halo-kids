
import apiClient from './apiClient';


export const adminService = {

  // ==========================================
  // DAFTAR PENGAJUAN LKSA
  // ==========================================

  async getLksaApplications(statusPengajuan = '') {
    const params = {};

    if (statusPengajuan) {
      params.status_pengajuan = statusPengajuan;
    }

    const response = await apiClient.get(
      '/api/admin/pengajuan-lksa',
      { params }
    );

    return response.data;
  },


  // ==========================================
  // DETAIL PENGAJUAN
  // ==========================================

  async getLksaApplicationDetail(applicationId) {
    const response = await apiClient.get(
      `/api/admin/pengajuan-lksa/${applicationId}`
    );

    return response.data;
  },


  // ==========================================
  // LINK DOKUMEN PRIVATE
  // ==========================================

  async getLksaDocumentUrl(
    applicationId,
    documentId
  ) {
    const response = await apiClient.get(
      `/api/admin/pengajuan-lksa/${applicationId}/dokumen/${documentId}/url`
    );

    return response.data;
  },


  // ==========================================
  // VERIFIKASI DOKUMEN
  // ==========================================

  async reviewLksaDocument(
    applicationId,
    documentId,
    statusVerifikasi,
    catatanVerifikasi = null
  ) {
    const response = await apiClient.patch(
      `/api/admin/pengajuan-lksa/${applicationId}/dokumen/${documentId}/status`,
      {
        status_verifikasi: statusVerifikasi,
        catatan_verifikasi: catatanVerifikasi,
      }
    );

    return response.data;
  },


  // ==========================================
  // KEPUTUSAN PENGAJUAN
  // ==========================================

  async updateLksaApplicationStatus(
    applicationId,
    statusPengajuan,
    catatanAdmin = null
  ) {
    const response = await apiClient.patch(
      `/api/admin/pengajuan-lksa/${applicationId}/status`,
      {
        status_pengajuan: statusPengajuan,
        catatan_admin: catatanAdmin,
      }
    );

    return response.data;
  },

};


export default adminService;
