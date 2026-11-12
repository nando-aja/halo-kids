
import React, { useEffect, useMemo, useState } from 'react';
import pantiService from '../../api/pantiService';

const DOCUMENTS = [
  {
    key: 'akta_pendirian',
    label: 'Akta Pendirian Yayasan / LKSA',
    requiredFor: 'berbadan_hukum',
    multiple: false,
  },
  {
    key: 'sk_pengesahan_badan_hukum',
    label: 'SK Pengesahan Badan Hukum',
    requiredFor: 'berbadan_hukum',
    multiple: false,
  },
  {
    key: 'surat_keterangan_terdaftar_kemendagri',
    label: 'Surat Keterangan Terdaftar Kemendagri',
    requiredFor: 'tidak_berbadan_hukum',
    multiple: false,
  },
  {
    key: 'ad_art',
    label: 'AD/ART Lembaga',
    required: true,
  },
  {
    key: 'domisili',
    label: 'Surat Keterangan Domisili',
    required: true,
  },
  {
    key: 'npwp_lembaga',
    label: 'NPWP Lembaga',
    required: true,
  },
  {
    key: 'struktur_organisasi',
    label: 'Struktur Organisasi',
    required: true,
  },
  {
    key: 'ktp_pengurus',
    label: 'KTP Pengurus',
    required: true,
    multiple: true,
  },
  {
    key: 'skck_pengurus',
    label: 'SKCK Pengurus',
    required: true,
  },
  {
    key: 'surat_pernyataan',
    label: 'Surat Pernyataan Lembaga',
    required: true,
  },
  {
    key: 'proposal_lksa',
    label: 'Proposal Kegiatan LKSA',
    required: true,
  },
  {
    key: 'foto_verifikasi',
    label: 'Foto Bangunan dan Fasilitas Panti',
    required: false,
    multiple: true,
  },
];

const INITIAL_FORM = {
  nama_panti: '',
  bentuk_lembaga: 'berbadan_hukum',
  tahun_berdiri: '',
  alamat: '',
  kontak: '',
  email_lembaga: '',
  jumlah_anak_asuh: '',
  deskripsi: '',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getRequiredDocuments(bentukLembaga) {
  return DOCUMENTS.filter((doc) => {
    if (doc.requiredFor) {
      return doc.requiredFor === bentukLembaga;
    }
    return doc.required === true;
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '-';

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  if (detail?.message) {
    const missing = detail.dokumen_belum_diunggah || [];
    return missing.length
      ? `${detail.message} Dokumen belum diunggah: ${missing.join(', ')}`
      : detail.message;
  }

  return error?.friendlyMessage || 'Terjadi kesalahan. Silakan coba kembali.';
}

export default function FormPengajuanLKSA({
  onSubmitted,
  onCancel,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const requiredDocuments = useMemo(
    () => getRequiredDocuments(form.bentuk_lembaga),
    [form.bentuk_lembaga]
  );

  const isEditable = !application ||
    ['draft', 'perlu_perbaikan'].includes(
      application.status_pengajuan
    );

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      try {
        const data = await pantiService.getMyLksaApplication();

        if (!active) return;

        setApplication(data);
        setDocuments(data.dokumen || []);

        setForm({
          nama_panti: data.nama_panti || '',
          bentuk_lembaga: data.bentuk_lembaga || 'berbadan_hukum',
          tahun_berdiri: data.tahun_berdiri || '',
          alamat: data.alamat || '',
          kontak: data.kontak || '',
          email_lembaga: data.email_lembaga || '',
          jumlah_anak_asuh: data.jumlah_anak_asuh ?? '',
          deskripsi: data.deskripsi || '',
        });
      } catch (error) {
        if (error?.response?.status !== 404) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(documentKey, event) {
    const files = Array.from(event.target.files || []);

    const invalidFile = files.find((file) => {
      const extension = file.name
        .split('.')
        .pop()
        .toLowerCase();

      return (
        !['pdf', 'jpg', 'jpeg', 'png'].includes(extension) ||
        file.size <= 0 ||
        file.size > MAX_FILE_SIZE
      );
    });

    if (invalidFile) {
      setErrorMessage(
        `${invalidFile.name}: format harus PDF/JPG/PNG dan ukuran maksimal 10 MB.`
      );
      event.target.value = '';
      return;
    }

    setErrorMessage('');

    setSelectedFiles((previous) => ({
      ...previous,
      [documentKey]: files,
    }));
  }

  async function refreshDocuments(applicationId) {
    const result = await pantiService.getLksaDocuments(
      applicationId
    );

    setDocuments(result || []);
  }

  async function handleDeleteDocument(documentId) {
    if (!application || !isEditable) return;

    const confirmed = window.confirm(
      'Hapus dokumen ini dari pengajuan?'
    );

    if (!confirmed) return;

    try {
      await pantiService.deleteLksaDocument(
        application.id,
        documentId
      );

      await refreshDocuments(application.id);

      setSuccessMessage('Dokumen berhasil dihapus.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isEditable) {
      setErrorMessage(
        'Pengajuan sudah dikirim dan tidak dapat diedit.'
      );
      return;
    }

    if (
      form.bentuk_lembaga === 'berbadan_hukum' &&
      (
        !selectedFiles.akta_pendirian?.length &&
        !documents.some((doc) => doc.jenis_dokumen === 'akta_pendirian')
      )
    ) {
      setErrorMessage('Akta pendirian wajib diunggah.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        ...form,
        tahun_berdiri: form.tahun_berdiri
          ? Number(form.tahun_berdiri)
          : null,
        jumlah_anak_asuh: form.jumlah_anak_asuh !== ''
          ? Number(form.jumlah_anak_asuh)
          : null,
        email_lembaga: form.email_lembaga.trim() || null,
        kontak: form.kontak.trim() || null,
        deskripsi: form.deskripsi.trim() || null,
      };

      let currentApplication = application;

      // Buat draft hanya sekali.
      if (!currentApplication) {
        currentApplication =
          await pantiService.createLksaApplication(payload);

        setApplication(currentApplication);
      } else {
        currentApplication =
          await pantiService.updateLksaApplication(
            currentApplication.id,
            payload
          );

        setApplication(currentApplication);
      }

      // Upload file secara berurutan agar mudah dilacak jika gagal.
      for (const document of DOCUMENTS) {
        const files = selectedFiles[document.key] || [];

        for (const file of files) {
          await pantiService.uploadLksaDocument(
            currentApplication.id,
            document.key,
            file,
            document.label
          );
        }
      }

      await refreshDocuments(currentApplication.id);

      // Kirim pengajuan setelah upload selesai.
      const submitted =
        await pantiService.submitLksaApplication(
          currentApplication.id
        );

      setApplication(submitted);
      setSelectedFiles({});

      setSuccessMessage(
        'Pengajuan LKSA berhasil dikirim kepada Admin Dinsos.'
      );

      if (onSubmitted) onSubmitted(submitted);

    } catch (error) {
      setErrorMessage(getErrorMessage(error));

      // Simpan informasi draft jika sebelumnya berhasil dibuat.
      if (!application && error?.response?.status !== 404) {
        try {
          const latest = await pantiService.getMyLksaApplication();
          setApplication(latest);
          setDocuments(latest.dokumen || []);
        } catch {
          // Draft belum tentu sudah berhasil tercatat.
        }
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Memuat data pengajuan LKSA...
      </div>
    );
  }

  if (application && !isEditable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Pengajuan LKSA sudah dikirim
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Status pengajuan: {application.status_pengajuan}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Silakan lihat halaman status pengajuan untuk
          memantau pemeriksaan Admin Dinsos.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 px-4 py-2 rounded-lg bg-slate-100 text-slate-700"
          >
            Kembali
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-7 space-y-6"
    >
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          Pengajuan Pendaftaran LKSA
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Lengkapi identitas lembaga dan unggah dokumen
          untuk diperiksa oleh Dinas Sosial.
        </p>
        {application && (
          <p className="text-xs text-blue-700 font-semibold mt-2">
            ID Pengajuan: {application.id} · Status: {application.status_pengajuan}
          </p>
        )}
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

      <section className="space-y-4">
        <h3 className="font-bold text-slate-800">
          A. Identitas Lembaga
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nama LKSA *
          </label>
          <input
            name="nama_panti"
            value={form.nama_panti}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={150}
            className="w-full border rounded-xl px-3 py-2.5"
            placeholder="Contoh: LKSA Harapan Bangsa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Status Badan Hukum *
          </label>
          <select
            name="bentuk_lembaga"
            value={form.bentuk_lembaga}
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2.5 bg-white"
          >
            <option value="berbadan_hukum">
              Berbadan Hukum
            </option>
            <option value="tidak_berbadan_hukum">
              Tidak Berbadan Hukum
            </option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tahun Berdiri
            </label>
            <input
              type="number"
              name="tahun_berdiri"
              value={form.tahun_berdiri}
              onChange={handleChange}
              min="1900"
              max="2100"
              className="w-full border rounded-xl px-3 py-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Jumlah Anak Asuh
            </label>
            <input
              type="number"
              name="jumlah_anak_asuh"
              value={form.jumlah_anak_asuh}
              onChange={handleChange}
              min="0"
              className="w-full border rounded-xl px-3 py-2.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Alamat Lengkap *
          </label>
          <textarea
            name="alamat"
            value={form.alamat}
            onChange={handleChange}
            required
            minLength={5}
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nomor Kontak
            </label>
            <input
              name="kontak"
              value={form.kontak}
              onChange={handleChange}
              className="w-full border rounded-xl px-3 py-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email Lembaga
            </label>
            <input
              type="email"
              name="email_lembaga"
              value={form.email_lembaga}
              onChange={handleChange}
              className="w-full border rounded-xl px-3 py-2.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Deskripsi Lembaga
          </label>
          <textarea
            name="deskripsi"
            value={form.deskripsi}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold text-slate-800">
          B. Dokumen Legalitas dan Pendukung
        </h3>
        <p className="text-xs text-slate-500">
          Format PDF, JPG, JPEG, PNG. Maksimal 10 MB per file.
          Dokumen dengan tanda * wajib diunggah.
        </p>

        {requiredDocuments.map((doc) => (
          <div
            key={doc.key}
            className="border border-slate-200 rounded-xl p-4 space-y-2"
          >
            <label className="block text-sm font-semibold text-slate-800">
              {doc.label}
              {doc.required || doc.requiredFor ? ' *' : ''}
            </label>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple={Boolean(doc.multiple)}
              onChange={(event) =>
                handleFileChange(doc.key, event)
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
            />

            {selectedFiles[doc.key]?.length > 0 && (
              <p className="text-xs text-blue-700">
                {selectedFiles[doc.key].map((file) => file.name).join(', ')}
              </p>
            )}

            {documents
              .filter((item) => item.jenis_dokumen === doc.key)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 rounded-lg"
                >
                  <span className="text-slate-600 break-all">
                    {item.nama_file_asli} · {item.status_verifikasi}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(item.id)}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              ))}
          </div>
        ))}

        <div className="border border-dashed border-slate-300 rounded-xl p-4">
          <p className="text-xs text-slate-500">
            Foto fasilitas merupakan dokumen pendukung opsional.
          </p>
          <label className="block text-sm font-semibold mt-2 mb-2">
            Foto Bangunan dan Fasilitas Panti
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            onChange={(event) =>
              handleFileChange('foto_verifikasi', event)
            }
            className="block w-full text-sm"
          />
          {selectedFiles.foto_verifikasi?.length > 0 && (
            <p className="text-xs text-blue-700 mt-2">
              {selectedFiles.foto_verifikasi.length} foto dipilih.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 pt-3 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
          >
            Batal
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-60"
        >
          {saving ? 'Mengunggah dan mengirim...' : 'Kirim Pengajuan LKSA'}
        </button>
      </div>
    </form>
  );
}
