
import React, { useState } from 'react';
import {
  Search,
  X,
  FileText,
  CalendarDays,
  UserRound,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import adopsiService from '../../api/adopsiService';

const STATUS_CONFIG = {
  diajukan: {
    label: 'Pengajuan Diajukan',
    description: 'Pengajuan sudah tercatat dan menunggu pemeriksaan.',
    color: 'bg-blue-100 text-blue-700',
  },
  menunggu_tinjauan_manual: {
    label: 'Menunggu Tinjauan Manual',
    description: 'Berkas sedang menunggu pemeriksaan manual petugas Dinsos.',
    color: 'bg-amber-100 text-amber-800',
  },
  butuh_dokumen_tambahan: {
    label: 'Butuh Dokumen Tambahan',
    description: 'Pemohon perlu melengkapi dokumen yang diminta.',
    color: 'bg-orange-100 text-orange-800',
  },
  diverifikasi: {
    label: 'Terverifikasi',
    description: 'Berkas telah melalui proses verifikasi.',
    color: 'bg-emerald-100 text-emerald-800',
  },
  disetujui: {
    label: 'Disetujui',
    description: 'Pengajuan telah mendapatkan persetujuan.',
    color: 'bg-green-100 text-green-800',
  },
  ditolak: {
    label: 'Ditolak',
    description: 'Pengajuan tidak disetujui. Hubungi Dinsos untuk informasi lebih lanjut.',
    color: 'bg-red-100 text-red-800',
  },
};

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function CotaTrackingModal({ isOpen, onClose }) {
  const [ticketCode, setTicketCode] = useState('');
  const [adoption, setAdoption] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setTicketCode('');
    setAdoption(null);
    setError('');
    setLoading(false);
    onClose?.();
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    setError('');
    setAdoption(null);

    const normalizedCode = ticketCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    // Mendukung format lama PIPA-2024-001
    // dan format alternatif PIPA-REG-001.
    const match = normalizedCode.match(
      /^PIPA-(?:2024|REG)-(\d+)$/
    );

    if (!match) {
      setError(
        'Format kode tidak sesuai. Contoh: PIPA-2024-001'
      );
      return;
    }

    const adoptionId = Number(match[1]);

    if (!Number.isSafeInteger(adoptionId) || adoptionId <= 0) {
      setError('Nomor pengajuan tidak valid.');
      return;
    }

    setLoading(true);

    try {
      // Endpoint ini hanya mengembalikan pengajuan milik
      // pengguna yang sedang login.
      const result = await adopsiService.getMyAdoptionDetail(
        adoptionId
      );

      if (!result || Number(result.id) !== adoptionId) {
        setError(
          'Pengajuan tidak ditemukan atau tidak dapat diakses.'
        );
        return;
      }

      setAdoption(result);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError(
          'Pengajuan tidak ditemukan atau kode bukan milik akun Anda.'
        );
      } else if (err?.response?.status === 401) {
        setError(
          'Sesi login tidak valid. Silakan login kembali.'
        );
      } else {
        setError(
          err?.response?.data?.detail ||
          'Gagal mengambil data pengajuan. Silakan coba kembali.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const status = adoption
    ? STATUS_CONFIG[adoption.status] || {
        label: adoption.status || 'Status Tidak Diketahui',
        description: 'Silakan hubungi Dinsos untuk informasi lebih lanjut.',
        color: 'bg-slate-100 text-slate-700',
      }
    : null;

  const displayedCode = adoption
    ? `PIPA-2024-${String(adoption.id).padStart(3, '0')}`
    : '';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cota-tracking-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-950 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Search size={23} />
            </div>

            <div>
              <h2
                id="cota-tracking-title"
                className="text-lg font-extrabold"
              >
                Lacak Pengajuan COTA
              </h2>
              <p className="text-xs text-blue-100">
                Pelacakan status pengajuan adopsi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup"
            className="rounded-full bg-white/15 p-2 transition hover:bg-white/25"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          <form onSubmit={handleSearch}>
            <label
              htmlFor="cota-ticket-code"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Nomor Pengajuan
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="cota-ticket-code"
                type="text"
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                placeholder="Contoh: PIPA-2024-001"
                disabled={loading}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <button
                type="submit"
                disabled={loading || !ticketCode.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Mencari...
                  </>
                ) : (
                  <>
                    <Search size={17} />
                    Cari Pengajuan
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Masukkan nomor pengajuan yang diberikan setelah
              formulir COTA berhasil dikirim.
            </p>
          </form>

          {/* ERROR */}
          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* HASIL PENCARIAN */}
          {adoption && (
            <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={20}
                  className="text-emerald-600"
                />
                <h3 className="font-extrabold text-slate-900">
                  Pengajuan Ditemukan
                </h3>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-700">
                  NOMOR PENGAJUAN
                </p>

                <p className="mt-1 text-xl font-extrabold tracking-wide text-blue-950">
                  {displayedCode}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <UserRound
                    size={19}
                    className="mt-0.5 text-slate-400"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      Nama Pemohon
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {adoption.nama_pemohon || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={19}
                    className="mt-0.5 text-slate-400"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      Tanggal Pengajuan
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {formatDate(adoption.tanggal_pengajuan)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-blue-700" />
                  <p className="text-sm font-bold text-slate-800">
                    Status Pengajuan
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${status.color}`}
                >
                  {status.label}
                </span>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {status.description}
                </p>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                Informasi ini menampilkan status terakhir yang tercatat
                pada sistem HaloKids.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
