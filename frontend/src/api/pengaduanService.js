import apiClient from './apiClient';

export function createReportSubmissionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `hk-${crypto.randomUUID()}`;
  }
  return `hk-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`.slice(0, 80);
}

// Frontend uses a canonical category code; the report schema also normalizes legacy labels.
export function normalizeReportType(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
  if (normalized.includes('panti') && (normalized.includes('ilegal') || normalized.includes('tidak berizin'))) return 'panti_ilegal';
  if (normalized.includes('eksploitasi') || normalized.includes('perdagangan anak')) return 'eksploitasi';
  if (['kekerasan', 'fisik', 'psikis', 'seksual', 'verbal', 'abuse'].some((term) => normalized.includes(term))) return 'kekerasan';
  if (normalized === 'lainnya' || normalized === 'other') return 'lainnya';
  return 'lainnya';
}

export const pengaduanService = {
  /**
   * Create a complaint. JSON is used when no evidence is attached; multipart
   * is used for actual File objects. The service never sends file names only.
   */
  async createPengaduan({ isi_laporan, jenis_laporan, submission_key, files = [] }) {
    const cleanFiles = Array.from(files || []).filter((file) => typeof File !== 'undefined' && file instanceof File);
    const canonicalType = normalizeReportType(jenis_laporan);
    const key = submission_key || createReportSubmissionKey();
    let response;

    if (cleanFiles.length > 0) {
      const body = new FormData();
      body.append('isi_laporan', String(isi_laporan || '').trim());
      body.append('jenis_laporan', canonicalType);
      body.append('submission_key', key);
      cleanFiles.forEach((file) => body.append('files', file, file.name));
      response = await apiClient.post('/api/public/pengaduan/dengan-lampiran', body);

      const count = Number(response.data?.lampiran_tersimpan ?? 0);
      if (count !== cleanFiles.length) {
        throw new Error('Server belum mengonfirmasi bahwa semua lampiran tersimpan di Supabase. Periksa laporan sebelum mengirim ulang.');
      }
    } else {
      response = await apiClient.post('/api/public/pengaduan', {
        isi_laporan: String(isi_laporan || '').trim(),
        jenis_laporan: canonicalType,
        submission_key: key,
      });
    }

    if (!response.data?.kode_tiket) {
      throw new Error('Backend tidak mengembalikan kode tiket. Laporan belum dapat dikonfirmasi tersimpan.');
    }
    return response.data;
  },

  async trackPengaduan(kodeTiket) {
    const cleanKode = kodeTiket.trim().toUpperCase();
    const response = await apiClient.get(`/api/public/pengaduan/${encodeURIComponent(cleanKode)}`);
    return response.data;
  },

  async getMyPengaduan() {
    const response = await apiClient.get('/api/masyarakat/pengaduan/saya');
    return response.data;
  },

  async getAdminPengaduan() {
    const response = await apiClient.get('/api/admin/pengaduan');
    return response.data;
  },

  async getAdminReportAttachments(reportId) {
    const response = await apiClient.get(`/api/admin/pengaduan/${reportId}/lampiran`);
    return response.data;
  },

  async updatePengaduanStatus(reportId, newStatus) {
    const response = await apiClient.patch(
      `/api/admin/pengaduan/${reportId}/status`,
      null,
      { params: { new_status: newStatus } },
    );
    return response.data;
  },
};

export default pengaduanService;
