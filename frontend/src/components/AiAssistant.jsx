import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  X,
  Maximize2,
  Minimize2,
  FileCheck,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { AdminDocumentReview, UserUploadAiExtractor } from './AiVerification';
import adopsiService from '../api/adopsiService';

const normalizeApplicant = (raw) => {
  const rawId = raw?.id;
  const status = String(raw?.status || '').toLowerCase();
  const displayStatus = {
    diverifikasi: 'Diverifikasi',
    ditolak: 'Ditolak',
    butuh_dokumen_tambahan: 'Butuh Dokumen Tambahan',
    menunggu_tinjauan_manual: 'Menunggu Tinjauan Manual',
    diajukan: 'Diajukan',
  }[status] || (raw?.status || 'Menunggu Verifikasi');

  return {
    ...raw,
    id: `PIPA-2024-${rawId}`,
    rawId,
    applicant: raw?.nama_pemohon || `Pemohon #${rawId}`,
    targetChild: 'Calon Anak Binaan',
    originPanti: 'LKSA Binaan Dinsos',
    rawStatus: status,
    status: displayStatus,
    hasil_ekstraksi_ai: raw?.hasil_ekstraksi_ai ?? null,
    dokumen_ktp: raw?.dokumen_ktp ?? null,
    dokumen_kk: raw?.dokumen_kk ?? null,
    dokumen_pendukung: raw?.dokumen_pendukung ?? null,
  };
};

/**
 * Floating AI Verification Hub.
 * The Admin Review tab must only render real COTA records from the API.
 * It intentionally does not render AdminDocumentReview in demo mode when
 * the API returns an empty list or fails.
 */
export default function AiAssistant({
  isLoggedIn = true,
  currentUser = null,
  onOpenAdopsi,
  onOpenLapor,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('admin-review');
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const selectedApplicant = useMemo(
    () => applications.find((app) => String(app.rawId) === String(selectedApplicationId)) || null,
    [applications, selectedApplicationId]
  );

  const loadApplications = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoadingApplications(true);
    else setIsRefreshing(true);
    setApplicationError('');
    setNotice('');

    try {
      const response = await adopsiService.getAdminAdoptions();
      if (!Array.isArray(response)) {
        throw new Error('Format antrean pengajuan adopsi dari backend bukan array.');
      }

      const mapped = response.map(normalizeApplicant);
      setApplications(mapped);
      setSelectedApplicationId((currentId) => {
        if (mapped.some((app) => String(app.rawId) === String(currentId))) return currentId;
        return mapped.length ? String(mapped[0].rawId) : '';
      });
    } catch (error) {
      setApplicationError(
        error?.friendlyMessage || error?.response?.data?.detail || error?.message ||
        'Gagal mengambil antrean pengajuan dari backend.'
      );
      // Do not replace a failed API response with mock documents.
      setApplications([]);
      setSelectedApplicationId('');
    } finally {
      setIsLoadingApplications(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'admin-review') {
      loadApplications();
    }
  }, [isOpen, activeTab, loadApplications]);

  const updateSelectedApplication = useCallback((rawId, patch) => {
    setApplications((current) => current.map((app) =>
      String(app.rawId) === String(rawId) ? { ...app, ...patch } : app
    ));
  }, []);

  const handleReanalyzeAI = useCallback(async () => {
    if (!selectedApplicant?.rawId) {
      throw new Error('Pilih pengajuan COTA dari backend terlebih dahulu.');
    }
    setActionLoading(true);
    setNotice('');
    try {
      const result = await adopsiService.reanalyzeAdoptionAI(selectedApplicant.rawId);
      updateSelectedApplication(selectedApplicant.rawId, {
        rawStatus: String(result?.status || selectedApplicant.rawStatus || '').toLowerCase(),
        status: normalizeApplicant({ id: selectedApplicant.rawId, status: result?.status || selectedApplicant.rawStatus }).status,
        hasil_ekstraksi_ai: result?.hasil_ekstraksi_ai ?? null,
      });
      setNotice('Analisis ulang selesai. Hasil di bawah berasal dari respons backend.');
      return result;
    } catch (error) {
      setApplicationError(
        error?.friendlyMessage || error?.response?.data?.detail || error?.message ||
        'Analisis ulang AI gagal.'
      );
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [selectedApplicant, updateSelectedApplication]);

  const handleUpdateStatus = useCallback(async (newStatus) => {
    if (!selectedApplicant?.rawId) {
      throw new Error('ID pengajuan database tidak tersedia.');
    }
    setActionLoading(true);
    setNotice('');
    try {
      const saved = await adopsiService.updateAdoptionStatus(selectedApplicant.rawId, newStatus);
      const rawStatus = String(saved?.status || newStatus).toLowerCase();
      const updated = normalizeApplicant({
        ...selectedApplicant,
        id: selectedApplicant.rawId,
        status: rawStatus,
      });
      updateSelectedApplication(selectedApplicant.rawId, {
        rawStatus: updated.rawStatus,
        status: updated.status,
      });
      setNotice(`Status pengajuan berhasil disimpan: ${updated.status}.`);
      return saved;
    } catch (error) {
      setApplicationError(
        error?.friendlyMessage || error?.response?.data?.detail || error?.message ||
        'Gagal menyimpan keputusan verifikasi ke backend.'
      );
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [selectedApplicant, updateSelectedApplication]);

  if (!isLoggedIn) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[990] group flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white rounded-full shadow-2xl hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-white/80"
          title="Buka AI Assistant & Verifikasi Berkas HaloKids"
        >
          <div className="relative">
            <Bot size={26} className="text-cyan-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
          </div>
          <div className="hidden sm:flex flex-col text-left pr-2">
            <span className="text-[11px] font-black tracking-wider uppercase text-cyan-200">AI Verification Hub</span>
            <span className="text-xs font-bold text-white leading-tight">AI Assistant &amp; Verifikasi</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden animate-in fade-in"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="HaloKids AI Assistant & Verifikasi Berkas"
        >
          <div
            className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 relative ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[92vh] h-[860px]'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-3.5 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/30 text-cyan-300 rounded-xl ring-1 ring-cyan-400/30"><Bot size={22} /></div>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                    HaloKids AI Assistant &amp; Verifikasi Berkas
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40">Single-Agent Engine</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 hidden sm:block">Modul inspeksi OCR COTA &amp; Donasi berdasarkan PRD Dinas Sosial Kabupaten</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" onClick={() => setIsFullscreen((value) => !value)} className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition" title={isFullscreen ? 'Perkecil' : 'Layar Penuh'}>
                  {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-rose-600 hover:text-white text-slate-300 transition" title="Tutup (ESC)" aria-label="Tutup"><X size={19} /></button>
              </div>
            </div>

            <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={() => setActiveTab('admin-review')} className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'admin-review' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-300'}`}>
                  <FileCheck size={15} /><span>1. Review Dokumen (Sisi Admin)</span>
                </button>
                <button type="button" onClick={() => setActiveTab('user-upload')} className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition ${activeTab === 'user-upload' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-300'}`}>
                  <Upload size={15} /><span>2. Upload &amp; Status AI (Sisi Pemohon)</span>
                </button>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                {isLoadingApplications ? <RefreshCw size={14} className="animate-spin text-blue-600" /> : <span className={`w-2 h-2 rounded-full ${applicationError ? 'bg-rose-500' : 'bg-emerald-500'}`} />}
                <span>{isLoadingApplications ? 'Memuat antrean COTA...' : applicationError ? 'Koneksi backend bermasalah' : `Backend tersambung • ${applications.length} pengajuan COTA`}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100">
              {activeTab === 'admin-review' && (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText size={17} className="text-blue-700" /> Pengajuan COTA dari database</div>
                    <select
                      aria-label="Pilih pengajuan COTA"
                      className="min-w-[240px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      value={selectedApplicationId}
                      onChange={(event) => setSelectedApplicationId(event.target.value)}
                      disabled={isLoadingApplications || applications.length === 0}
                    >
                      {applications.length === 0 && <option value="">Tidak ada pengajuan</option>}
                      {applications.map((app) => (
                        <option key={app.rawId} value={String(app.rawId)}>
                          #{app.rawId} — {app.applicant} — {app.status}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => loadApplications(true)} disabled={isLoadingApplications || isRefreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
                      <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Muat ulang
                    </button>
                  </section>

                  {applicationError && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                      <div><strong>Data backend belum berhasil dimuat.</strong><p className="mt-1 text-xs">{applicationError}</p></div>
                    </div>
                  )}

                  {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}

                  {isLoadingApplications ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600"><RefreshCw size={20} className="mx-auto mb-2 animate-spin text-blue-600" />Memuat pengajuan dari backend...</div>
                  ) : selectedApplicant ? (
                    <AdminDocumentReview
                      key={selectedApplicant.rawId}
                      isOpen
                      isModal={false}
                      selectedApplicant={selectedApplicant}
                      onReanalyzeAI={handleReanalyzeAI}
                      isAnalyzingAI={actionLoading}
                      isSavingDecision={actionLoading}
                      onApprove={() => handleUpdateStatus('diverifikasi')}
                      onReject={() => handleUpdateStatus('ditolak')}
                      onReupload={() => handleUpdateStatus('butuh_dokumen_tambahan')}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <FileText size={30} className="mx-auto mb-3 text-slate-400" />
                      <h3 className="font-bold text-slate-800">Belum ada pengajuan COTA untuk ditinjau</h3>
                      <p className="mt-1 text-sm text-slate-500">Panel tidak menampilkan data contoh. Setelah pengajuan tersedia di MySQL, tekan “Muat ulang”.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'user-upload' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <UserUploadAiExtractor />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
