
import React, { useCallback, useEffect, useState } from 'react';
import pantiService from '../../api/pantiService';

const STATUS_INFO = {
  draft: {
    label: 'Draft',
    color: 'bg-slate-100 text-slate-700',
  },
  diajukan: {
    label: 'Menunggu Pemeriksaan',
    color: 'bg-amber-100 text-amber-800',
  },
  ditinjau: {
    label: 'Sedang Ditinjau',
    color: 'bg-blue-100 text-blue-800',
  },
  menunggu_tinjauan_manual: {
    label: 'Menunggu Tinjauan Manual',
    color: 'bg-orange-100 text-orange-800',
  },
  perlu_perbaikan: {
    label: 'Perlu Perbaikan',
    color: 'bg-red-100 text-red-800',
  },
  disetujui: {
    label: 'Disetujui',
    color: 'bg-emerald-100 text-emerald-800',
  },
  ditolak: {
    label: 'Ditolak',
    color: 'bg-red-100 text-red-800',
  },
};

const DOCUMENT_STATUS = {
  menunggu: 'Menunggu Pemeriksaan',
  valid: 'Valid',
  tidak_valid: 'Tidak Valid',
  perlu_perbaikan: 'Perlu Perbaikan',
};

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function StatusPengajuanLKSA({
  onStartApplication,
}) {
  const [application, setApplication] = useState(null);
  const [documentUrls, setDocumentUrls] = useState({});
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setNotFound(false);

    try {
      const data = await pantiService.getMyLksaApplication();

      setApplication(data);
    } catch (error) {
      if (error?.response?.status === 404) {
        setApplication(null);
        setNotFound(true);
      } else {
        setErrorMessage(
          error.friendlyMessage ||
          'Gagal mengambil status pengajuan LKSA.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  async function handleOpenDocument(documentId) {
    if (!application) return;

    setLoadingDocumentId(documentId);
    setErrorMessage('');

    try {
      const result = await pantiService.getLksaDocumentUrl(
        application.id,
        documentId
      );

      setDocumentUrls((previous) => ({
        ...previous,
        [documentId]: result.signed_url,
      }));

    } catch (error) {
      setErrorMessage(
        error.friendlyMessage ||
        'Tidak dapat membuka dokumen.'
      );
    } finally {
      setLoadingDocumentId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center text-slate-500">
        Memuat status pengajuan...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-7 text-center">
        <div className="text-4xl mb-3">📄</div>
        <h2 className="text-xl font-bold text-slate-900">
          Belum Ada Pengajuan LKSA
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Silakan lengkapi identitas lembaga dan dokumen
          legalitas untuk memulai pendaftaran.
        </p>

        {onStartApplication && (
          <button
            type="button"
            onClick={onStartApplication}
            className="mt-5 px-5 py-2.5 rounded-xl bg-blue-700 text-white font-bold"
          >
            Mulai Pengajuan
          </button>
        )}
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-5 rounded-xl bg-red-50 text-red-700">
        Pengajuan belum dapat dimuat.
      </div>
    );
  }

  const status = STATUS_INFO[application.status_pengajuan] || {
    label: application.status_pengajuan,
    color: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="space-y-5">

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {/* STATUS UTAMA */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <p className="text-xs text-slate-500">
              ID Pengajuan #{application.id}
            </p>

            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {application.nama_panti}
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Diajukan: {formatDate(application.tanggal_diajukan)}
            </p>
          </div>

          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Bentuk Lembaga</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {application.bentuk_lembaga === 'berbadan_hukum'
                ? 'Berbadan Hukum'
                : 'Tidak Berbadan Hukum'}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Jumlah Anak Asuh</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {application.jumlah_anak_asuh ?? '-'}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Tanggal Dibuat</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {formatDate(application.tanggal_dibuat)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Tanggal Verifikasi</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {formatDate(application.tanggal_verifikasi)}
            </p>
          </div>
        </div>
      </section>

      {/* CATATAN ADMIN */}
      {application.catatan_admin && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-900">
            Catatan Admin Dinsos
          </h3>
          <p className="text-sm text-amber-800 mt-2 whitespace-pre-wrap">
            {application.catatan_admin}
          </p>
        </section>
      )}

      {/* DAFTAR DOKUMEN */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900">
              Dokumen Pengajuan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Daftar dokumen yang sudah tersimpan.
            </p>
          </div>

          <button
            type="button"
            onClick={loadApplication}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {(application.dokumen || []).length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada dokumen yang diunggah.
            </p>
          ) : (
            application.dokumen.map((document) => (
              <div
                key={document.id}
                className="border border-slate-200 rounded-xl p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 break-all">
                      {document.label_dokumen || document.jenis_dokumen}
                    </p>

                    <p className="text-xs text-slate-500 mt-1 break-all">
                      {document.nama_file_asli}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Diunggah: {formatDate(document.tanggal_upload)}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-600">
                    {DOCUMENT_STATUS[document.status_verifikasi] ||
                      document.status_verifikasi}
                  </span>
                </div>

                {document.catatan_verifikasi && (
                  <p className="text-xs text-red-700 mt-2">
                    Catatan: {document.catatan_verifikasi}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    disabled={loadingDocumentId === document.id}
                    onClick={() => handleOpenDocument(document.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold disabled:opacity-50"
                  >
                    {loadingDocumentId === document.id
                      ? 'Memuat...'
                      : 'Buat Tautan Dokumen'}
                  </button>

                  {documentUrls[document.id] && (
                    <a
                      href={documentUrls[document.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold"
                    >
                      Buka Dokumen
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Tautan dokumen bersifat sementara dan berlaku
          selama 5 menit.
        </p>
      </section>

      {application.status_pengajuan === 'perlu_perbaikan' &&
        onStartApplication && (
          <button
            type="button"
            onClick={onStartApplication}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold"
          >
            Perbaiki Pengajuan
          </button>
        )}

      {application.status_pengajuan === 'disetujui' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          Pengajuan LKSA telah disetujui. Data panti sudah
          terhubung ke akun pengelola.
        </div>
      )}

    </div>
  );
}
