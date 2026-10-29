import apiClient from './apiClient';

export const adopsiService = {
  // ==========================================
  // SISI WARGA (PEMOHON COTA)
  // ==========================================

  /** Pengecekan kelayakan awal pemohon COTA. */
  async checkEligibility({ tanggal_lahir_pemohon, tanggal_pernikahan }) {
    const response = await apiClient.post('/api/masyarakat/pengajuan-adopsi/cek-kelayakan', {
      nama_pemohon: 'Pengecekan Kelayakan',
      tanggal_lahir_pemohon,
      tanggal_pernikahan,
      dokumen_ktp: 'temp',
      dokumen_kk: 'temp',
    });
    return response.data;
  },

  /** Upload KTP dan KK via multipart/form-data. */
  async uploadKtpKk(ktpFile, kkFile) {
    const formData = new FormData();
    formData.append('ktp', ktpFile);
    formData.append('kk', kkFile);

    const response = await apiClient.post('/api/upload/ktp-adopsi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadKtpDanKk(ktpFile, kkFile) {
    return this.uploadKtpKk(ktpFile, kkFile);
  },

  /** Upload empat berkas awal COTA. */
  async uploadDokumenAwal({ aktaKelahiran, bukuNikah, skck, suratSehat }) {
    const formData = new FormData();
    if (aktaKelahiran) formData.append('akta_kelahiran', aktaKelahiran);
    if (bukuNikah) formData.append('buku_nikah', bukuNikah);
    if (skck) formData.append('skck', skck);
    if (suratSehat) formData.append('surat_sehat', suratSehat);

    const response = await apiClient.post('/api/upload/dokumen-awal-adopsi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Upload dokumen tambahan adopsi. */
  async uploadDokumenTambahan(jenisDokumen, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/upload/dokumen-tambahan-adopsi', formData, {
      params: { jenis_dokumen: jenisDokumen },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Submit pengajuan COTA lengkap. */
  async submitPengajuan(data) {
    const response = await apiClient.post('/api/masyarakat/pengajuan-adopsi', data);
    return response.data;
  },

  async submitAdopsi(data) {
    return this.submitPengajuan(data);
  },

  /** Daftar riwayat pengajuan milik pemohon. */
  async getMyAdoptions() {
    const response = await apiClient.get('/api/masyarakat/pengajuan-adopsi');
    return response.data;
  },

  /** Detail pengajuan milik pemohon. */
  async getMyAdoptionDetail(id) {
    const response = await apiClient.get(`/api/masyarakat/pengajuan-adopsi/${id}`);
    return response.data;
  },

  // ==========================================
  // SISI SUPER ADMIN DINSOS (VERIFIKASI & AI)
  // ==========================================

  /** Daftar antrean berkas adopsi COTA. */
  async getAdminAdoptions() {
    const response = await apiClient.get('/api/admin/pengajuan-adopsi');
    return response.data;
  },

  /** Detail berkas adopsi lengkap dengan hasil AI. */
  async getAdminAdoptionDetail(id) {
    const response = await apiClient.get(`/api/admin/pengajuan-adopsi/${id}`);
    return response.data;
  },

  /**
   * Mengambil dokumen fisik dari endpoint admin yang memeriksa role dan record.
   * Respons berupa Blob agar dapat ditampilkan sebagai gambar/PDF.
   */
  async getAdminAdoptionDocument(id, dokumenKey) {
    try {
      const response = await apiClient.get(
        `/api/admin/pengajuan-adopsi/${id}/dokumen/${encodeURIComponent(dokumenKey)}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      // Dengan responseType 'blob', pesan error FastAPI ikut menjadi Blob.
      // Baca isinya supaya admin melihat penyebab sebenarnya (mis. berkas tidak ada di Supabase).
      const body = error?.response?.data;
      if (body instanceof Blob) {
        try {
          const parsed = JSON.parse(await body.text());
          const detail = typeof parsed?.detail === 'string' ? parsed.detail : parsed?.message;
          if (detail) error.friendlyMessage = detail;
        } catch {
          // biarkan pesan bawaan
        }
      }
      throw error;
    }
  },

  /** Analisis ulang dokumen COTA menggunakan AI internal backend. */
  async reanalyzeAdoptionAI(id) {
    const response = await apiClient.post(`/api/admin/pengajuan-adopsi/${id}/analisis-ai`);
    return response.data;
  },

  /** Memperbarui status keputusan verifikasi admin. */
  async updateAdoptionStatus(id, newStatus) {
    const response = await apiClient.patch(
      `/api/admin/pengajuan-adopsi/${id}/status`,
      null,
      { params: { new_status: newStatus } }
    );
    return response.data;
  },
};

export default adopsiService;
