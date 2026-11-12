
import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../api/adminService';

const STATUS_LABEL = {
  draft: 'Draft',
  diajukan: 'Menunggu Pemeriksaan',
  ditinjau: 'Sedang Ditinjau',
  menunggu_tinjauan_manual: 'Tinjauan Manual',
  perlu_perbaikan: 'Perlu Perbaikan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

const STATUS_COLOR = {
  draft: 'bg-slate-100 text-slate-700',
  diajukan: 'bg-amber-100 text-amber-800',
  ditinjau: 'bg-blue-100 text-blue-800',
  menunggu_tinjauan_manual: 'bg-orange-100 text-orange-800',
  perlu_perbaikan: 'bg-red-100 text-red-800',
  disetujui: 'bg-emerald-100 text-emerald-800',
  ditolak: 'bg-red-100 text-red-800',
};

const DOCUMENT_OPTIONS = [
  { value: 'valid', label: 'Valid' },
  { value: 'tidak_valid', label: 'Tidak Valid' },
  { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
];

function getError(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') return detail;
  if (detail?.message) return detail.message;

  if (detail?.dokumen_belum_valid) {
    return `Dokumen belum valid: ${detail.dokumen_belum_valid.join(', ')}`;
  }

  return error?.friendlyMessage || 'Terjadi kesalahan pada server.';
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function PanelVerifikasiLKSA() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);

  const [filter, setFilter] = useState('');
  const [appNote, setAppNote] = useState('');
  const [documentNotes, setDocumentNotes] = useState({});
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [documentLinks, setDocumentLinks] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDocument, setLoadingDocument] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await adminService.getLksaApplications(filter);
      setApplications(result || []);
    } catch (error) {
      setErrorMessage(getError(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function openDetail(applicationId) {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const detail = await adminService.getLksaApplicationDetail(
        applicationId
      );

      setSelected(detail);
      setAppNote(detail.catatan_admin || '');
      setDocumentNotes({});
      setReviewStatuses({});
      setDocumentLinks({});
    } catch (error) {
      setErrorMessage(getError(error));
    }
  }

  async function refreshDetail() {
    if (!selected) return;

    const detail = await adminService.getLksaApplicationDetail(
      selected.id
    );

    setSelected(detail);
  }

  async function openDocument(documentId) {
    if (!selected) return;

    setLoadingDocument(documentId);
    setErrorMessage('');

    try {
      const result = await adminService.getLksaDocumentUrl(
        selected.id,
        documentId
      );

      setDocumentLinks((previous) => ({
        ...previous,
        [documentId]: result.signed_url,
      }));
    } catch (error) {
      setErrorMessage(getError(error));
    } finally {
      setLoadingDocument(null);
    }
  }

  async function reviewDocument(document) {
    if (!selected) return;

    const status = reviewStatuses[document.id];

    if (!status) {
      setErrorMessage('Pilih hasil pemeriksaan dokumen terlebih dahulu.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await adminService.reviewLksaDocument(
        selected.id,
        document.id,
        status,
        documentNotes[document.id]?.trim() || null
      );

      await refreshDetail();
      await loadApplications();

      setSuccessMessage('Hasil pemeriksaan dokumen berhasil disimpan.');
    } catch (error) {
      setErrorMessage(getError(error));
    } finally {
      setSaving(false);
    }
  }

  async function updateApplication(statusPengajuan) {
    if (!selected) return;

    if (
      ['perlu_perbaikan', 'ditolak'].includes(statusPengajuan) &&
      !appNote.trim()
    ) {
      setErrorMessage(
        'Catatan Admin wajib diisi untuk keputusan ini.'
      );
      return;
    }

    const labels = {
      ditinjau: 'memulai pemeriksaan',
      menunggu_tinjauan_manual: 'memindahkan ke tinjauan manual',
      perlu_perbaikan: 'meminta perbaikan',
      disetujui: 'menyetujui',
      ditolak: 'menolak',
    };

    if (!window.confirm(
      `Yakin ingin ${labels[statusPengajuan]} pengajuan ${selected.nama_panti}?`
    )) {
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await adminService.updateLksaApplicationStatus(
        selected.id,
        statusPengajuan,
        appNote.trim() || null
      );

      setSelected(result);
      setAppNote(result.catatan_admin || '');

      await loadApplications();

      setSuccessMessage(
        `Status pengajuan berhasil diperbarui menjadi ${STATUS_LABEL[statusPengajuan]}.`
      );
    } catch (error) {
      setErrorMessage(getError(error));
    } finally {
      setSaving(false);
    }
  }

  const isFinal = selected && [
    'disetujui',
    'ditolak',
  ].includes(selected.status_pengajuan);

  return (
    <div className="space-y-5">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Verifikasi Pendaftaran LKSA
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pemeriksaan dokumen dan keputusan Admin Dinas Sosial.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm"
        >
          {loading ? 'Memuat...' : 'Refresh Data'}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 bg-white text-sm"
        >
          <option value="">Semua Status</option>
          <option value="diajukan">Menunggu Pemeriksaan</option>
          <option value="ditinjau">Sedang Ditinjau</option>
          <option value="menunggu_tinjauan_manual">Tinjauan Manual</option>
          <option value="perlu_perbaikan">Perlu Perbaikan</option>
          <option value="disetujui">Disetujui</option>
          <option value="ditolak">Ditolak</option>
        </select>

        <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm">
          {applications.length} Pengajuan
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-5">

        {/* DAFTAR PENGAJUAN */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-3">
            Daftar Pengajuan
          </h3>

          {loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Memuat data dari database...
            </p>
          ) : applications.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Belum ada pengajuan pada filter ini.
            </p>
          ) : (
            <div className="space-y-2">
              {applications.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selected?.id === item.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800">
                      {item.nama_panti}
                    </span>
                    <span className="text-xs text-slate-500">
                      #{item.id}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Pengelola ID: {item.id_pengelola}
                  </p>

                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    STATUS_COLOR[item.status_pengajuan] ||
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {STATUS_LABEL[item.status_pengajuan] ||
                      item.status_pengajuan}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DETAIL PENGAJUAN */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
          {!selected ? (
            <div className="text-center py-16 text-slate-400">
              Pilih pengajuan untuk melihat detail.
            </div>
          ) : (
            <div className="space-y-5">

              <div>
                <span className="text-xs text-slate-500">
                  Pengajuan #{selected.id}
                </span>

                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selected.nama_panti}
                </h3>

                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                  STATUS_COLOR[selected.status_pengajuan] ||
                  'bg-slate-100 text-slate-700'
                }`}>
                  {STATUS_LABEL[selected.status_pengajuan] ||
                    selected.status_pengajuan}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Pengelola ID</p>
                  <strong>{selected.id_pengelola}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Bentuk Lembaga</p>
                  <strong>
                    {selected.bentuk_lembaga === 'berbadan_hukum'
                      ? 'Berbadan Hukum'
                      : 'Tidak Berbadan Hukum'}
                  </strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Tahun Berdiri</p>
                  <strong>{selected.tahun_berdiri || '-'}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Anak Asuh</p>
                  <strong>{selected.jumlah_anak_asuh ?? '-'}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Kontak</p>
                  <strong>{selected.kontak || '-'}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Email Lembaga</p>
                  <strong className="break-all">
                    {selected.email_lembaga || '-'}
                  </strong>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Alamat</p>
                <p className="text-sm text-slate-800">
                  {selected.alamat}
                </p>
              </div>

              {/* DOKUMEN */}
              <div>
                <h4 className="font-bold text-slate-900 mb-3">
                  Pemeriksaan Dokumen
                </h4>

                {(selected.dokumen || []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada dokumen yang diunggah.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selected.dokumen.map((document) => (
                      <div
                        key={document.id}
                        className="border border-slate-200 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800">
                              {document.label_dokumen ||
                                document.jenis_dokumen}
                            </p>

                            <p className="text-xs text-slate-500 break-all">
                              {document.nama_file_asli}
                            </p>

                            <p className="text-xs text-slate-400">
                              {formatDate(document.tanggal_upload)}
                            </p>
                          </div>

                          <span className="text-xs font-semibold text-slate-600">
                            {DOCUMENT_OPTIONS.find(
                              (item) =>
                                item.value === document.status_verifikasi
                            )?.label || 'Menunggu'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={loadingDocument === document.id}
                            onClick={() => openDocument(document.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold"
                          >
                            {loadingDocument === document.id
                              ? 'Memuat...'
                              : 'Buat Tautan Dokumen'}
                          </button>

                          {documentLinks[document.id] && (
                            <a
                              href={documentLinks[document.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
                            >
                              Lihat File
                            </a>
                          )}
                        </div>

                        {!isFinal && (
                          <div className="space-y-2 border-t pt-2">
                            <select
                              value={reviewStatuses[document.id] || ''}
                              onChange={(event) =>
                                setReviewStatuses((previous) => ({
                                  ...previous,
                                  [document.id]: event.target.value,
                                }))
                              }
                              className="w-full border rounded-lg px-2 py-2 text-xs bg-white"
                            >
                              <option value="">
                                Pilih hasil pemeriksaan
                              </option>
                              {DOCUMENT_OPTIONS.map((item) => (
                                <option
                                  key={item.value}
                                  value={item.value}
                                >
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            <input
                              value={documentNotes[document.id] || ''}
                              onChange={(event) =>
                                setDocumentNotes((previous) => ({
                                  ...previous,
                                  [document.id]: event.target.value,
                                }))
                              }
                              placeholder="Catatan pemeriksa (opsional)"
                              className="w-full border rounded-lg px-2 py-2 text-xs"
                            />

                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => reviewDocument(document)}
                              className="px-3 py-2 rounded-lg bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                            >
                              Simpan Hasil Pemeriksaan
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KEPUTUSAN PENGAJUAN */}
              {!isFinal && (
                <div className="border-t pt-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    Catatan / Keputusan Admin
                  </label>

                  <textarea
                    value={appNote}
                    onChange={(event) => setAppNote(event.target.value)}
                    rows={3}
                    placeholder="Isi alasan atau arahan perbaikan bila diperlukan..."
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateApplication('ditinjau')}
                      className="px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold"
                    >
                      Mulai Ditinjau
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        updateApplication('menunggu_tinjauan_manual')
                      }
                      className="px-3 py-2 rounded-lg bg-orange-100 text-orange-800 text-xs font-bold"
                    >
                      Tinjauan Manual
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        updateApplication('perlu_perbaikan')
                      }
                      className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold"
                    >
                      Minta Perbaikan
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateApplication('ditolak')}
                      className="px-3 py-2 rounded-lg bg-red-100 text-red-800 text-xs font-bold"
                    >
                      Tolak
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateApplication('disetujui')}
                      className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold"
                    >
                      Setujui LKSA
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Persetujuan hanya berhasil apabila seluruh dokumen
                    wajib telah berstatus valid. Keputusan akhir dilakukan
                    oleh Admin Dinsos.
                  </p>
                </div>
              )}

              {isFinal && (
                <div className="rounded-xl bg-slate-50 border p-4 text-sm text-slate-600">
                  Pengajuan ini sudah memiliki keputusan final:
                  <strong className="ml-1">
                    {STATUS_LABEL[selected.status_pengajuan]}
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
