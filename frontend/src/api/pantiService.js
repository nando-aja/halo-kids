
import apiClient from './apiClient';


export const pantiService = {

  // ==========================================
  // ENDPOINT PUBLIK
  // ==========================================

  async getPublicPantiList(wilayah = '') {
    const params = {};

    if (wilayah && wilayah !== 'Semua') {
      params.wilayah = wilayah;
    }

    const response = await apiClient.get(
      '/api/public/panti',
      { params }
    );

    return response.data;
  },


  async getPublicPantiDetail(pantiId) {
    const response = await apiClient.get(
      `/api/public/panti/${pantiId}`
    );

    return response.data;
  },


  async getPublicWishlist(pantiId) {
    const response = await apiClient.get(
      `/api/public/panti/${pantiId}/wishlist`
    );

    return response.data;
  },


  async getPublicGallery(pantiId) {
    const response = await apiClient.get(
      `/api/public/panti/${pantiId}/galeri`
    );

    return response.data;
  },


  async getPublicDanaReports(pantiId) {
    const response = await apiClient.get(
      `/api/public/panti/${pantiId}/laporan-dana`
    );

    return response.data;
  },


  // ==========================================
  // ENDPOINT PENGAJUAN LKSA PENGELOLA
  // ==========================================

  /**
   * Membuat draft pengajuan LKSA.
   */
  async createLksaApplication(data) {
    const response = await apiClient.post(
      '/api/pengajuan-lksa/',
      data
    );

    return response.data;
  },


  /**
   * Mengambil pengajuan LKSA milik pengelola login.
   */
  async getMyLksaApplication() {
    const response = await apiClient.get(
      '/api/pengajuan-lksa/me'
    );

    return response.data;
  },


  /**
   * Memperbarui identitas lembaga.
   */
  async updateLksaApplication(applicationId, data) {
    const response = await apiClient.put(
      `/api/pengajuan-lksa/${applicationId}`,
      data
    );

    return response.data;
  },


  /**
   * Mengunggah dokumen legalitas ke Supabase private.
   *
   * FormData:
   * - jenis_dokumen
   * - label_dokumen (opsional)
   * - file
   */
  async uploadLksaDocument(
    applicationId,
    jenisDokumen,
    file,
    labelDokumen = ''
  ) {
    if (!file) {
      throw new Error('File dokumen wajib dipilih.');
    }

    const formData = new FormData();

    formData.append(
      'jenis_dokumen',
      jenisDokumen
    );

    formData.append(
      'file',
      file
    );

    if (labelDokumen.trim()) {
      formData.append(
        'label_dokumen',
        labelDokumen.trim()
      );
    }

    const response = await apiClient.post(
      `/api/pengajuan-lksa/${applicationId}/dokumen`,
      formData
    );

    return response.data;
  },


  /**
   * Mengambil seluruh dokumen pada satu pengajuan.
   */
  async getLksaDocuments(applicationId) {
    const response = await apiClient.get(
      `/api/pengajuan-lksa/${applicationId}/dokumen`
    );

    return response.data;
  },


  /**
   * Meminta signed URL sementara untuk melihat dokumen.
   */
  async getLksaDocumentUrl(
    applicationId,
    documentId
  ) {
    const response = await apiClient.get(
      `/api/pengajuan-lksa/${applicationId}/dokumen/${documentId}/url`
    );

    return response.data;
  },


  /**
   * Menghapus dokumen selama pengajuan masih dapat diedit.
   */
  async deleteLksaDocument(
    applicationId,
    documentId
  ) {
    const response = await apiClient.delete(
      `/api/pengajuan-lksa/${applicationId}/dokumen/${documentId}`
    );

    return response.data;
  },


  /**
   * Mengirim pengajuan ke Admin Dinsos.
   */
  async submitLksaApplication(applicationId) {
    const response = await apiClient.post(
      `/api/pengajuan-lksa/${applicationId}/ajukan`
    );

    return response.data;
  },


  // ==========================================
  // ENDPOINT PROFIL PANTI RESMI
  // ==========================================

  /**
   * Mengambil panti yang sudah terhubung dengan
   * akun pengelola dan disetujui.
   */
  async getManagedPanti() {
    const response = await apiClient.get(
      '/api/panti/me'
    );

    return response.data;
  },


  /**
   * Mengupdate informasi profil panti resmi.
   */
  async updateManagedPanti(data) {
    const response = await apiClient.put(
      '/api/panti/me',
      data
    );

    return response.data;
  },


  // ==========================================
  // WISHLIST PANTI
  // ==========================================

  async getWishlist() {
    const response = await apiClient.get(
      '/api/panti/wishlist'
    );

    return response.data;
  },


  async createWishlist({
    nama_barang,
    jumlah_kebutuhan,
  }) {
    const response = await apiClient.post(
      '/api/panti/wishlist',
      {
        nama_barang: nama_barang.trim(),
        jumlah_kebutuhan: parseInt(
          jumlah_kebutuhan,
          10
        ),
      }
    );

    return response.data;
  },


  async updateWishlist(
    wishlistId,
    {
      nama_barang,
      jumlah_kebutuhan,
      jumlah_terpenuhi,
    }
  ) {
    const payload = {};

    if (nama_barang !== undefined) {
      payload.nama_barang = nama_barang.trim();
    }

    if (jumlah_kebutuhan !== undefined) {
      payload.jumlah_kebutuhan = parseInt(
        jumlah_kebutuhan,
        10
      );
    }

    if (jumlah_terpenuhi !== undefined) {
      payload.jumlah_terpenuhi = parseInt(
        jumlah_terpenuhi,
        10
      );
    }

    const response = await apiClient.put(
      `/api/panti/wishlist/${wishlistId}`,
      payload
    );

    return response.data;
  },


  async deleteWishlist(wishlistId) {
    const response = await apiClient.delete(
      `/api/panti/wishlist/${wishlistId}`
    );

    return response.data;
  },


  // ==========================================
  // DONASI PANTI
  // ==========================================

  async getPantiDonations() {
    const response = await apiClient.get(
      '/api/panti/donasi'
    );

    return response.data;
  },


  async updateDonationStatus(
    donationId,
    newStatus
  ) {
    const response = await apiClient.patch(
      `/api/panti/donasi/${donationId}/status`,
      null,
      {
        params: {
          new_status: newStatus,
        },
      }
    );

    return response.data;
  },


  // ==========================================
  // ADOPSI
  // ==========================================

  async getPantiAdoptions() {
    const response = await apiClient.get(
      '/api/panti/pengajuan-adopsi'
    );

    return response.data;
  },


  async recommendAdoption(
    adoptionId,
    action = 'rekomendasikan'
  ) {
    const response = await apiClient.patch(
      `/api/panti/pengajuan-adopsi/${adoptionId}/rekomendasi`,
      null,
      {
        params: {
          action,
        },
      }
    );

    return response.data;
  },
};


export default pantiService;
