import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  Edit3,
  Save,
  Undo2,
  Sparkles,
  Bot,
  Info,
  Calendar,
  User,
  CreditCard,
  Building,
  Check,
  X
} from 'lucide-react';
import DocumentCanvasPreview from './DocumentCanvasPreview';
import CotaAiResultPanel, { summarizeAiResult } from './CotaAiResultPanel';
import { MOCK_AI_DOCUMENTS, REJECTION_REASONS, REUPLOAD_REASONS } from './mockAiData';
import adopsiService from '../../api/adopsiService';

/**
 * Komponen Review Dokumen COTA & Donasi (Sisi Admin / Pengelola Dinsos)
 * Fitur: Modal pop-up terpusat dengan dark backdrop, tombol close (X),
 * Split-screen review, visual document inspection (zoom/rotate),
 * Data match status comparison, Human-in-the-loop in-place editing,
 * Decision actions (Setujui, Minta Unggah Ulang, Tolak).
 */
export default function AdminDocumentReview({
  isOpen = true,
  onClose,
  isModal = true,
  documents = MOCK_AI_DOCUMENTS,
  selectedApplicant = null,
  onApprove,
  onReupload,
  onReject,
  onReanalyzeAI,
  isAnalyzingAI = false,
  isSavingDecision = false
}) {
  // Modal visibility & close handler
  const [internalOpen, setInternalOpen] = useState(true);
  const isCurrentlyOpen = isOpen !== undefined ? isOpen : internalOpen;

  const handleCloseModal = () => {
    setInternalOpen(false);
    if (onClose) onClose();
  };

  // ESC key listener to close modal
  useEffect(() => {
    if (!isModal || !isCurrentlyOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, isCurrentlyOpen]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!isModal || !isCurrentlyOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isModal, isCurrentlyOpen]);

  // Filter documents: if inspecting a COTA applicant, only show relevant COTA documents
  const filteredDocs = React.useMemo(() => {
    if (selectedApplicant) {
      const cotaDocs = documents.filter((d) => d.kategori && d.kategori.toLowerCase().includes('cota'));
      return cotaDocs.length > 0 ? cotaDocs : documents;
    }
    return documents;
  }, [documents, selectedApplicant]);

  // Document Selection State
  const [docList, setDocList] = useState(filteredDocs);
  const [selectedDocId, setSelectedDocId] = useState(filteredDocs[0]?.id || '');

  useEffect(() => {
    setDocList(filteredDocs);
    if (filteredDocs[0]) {
      setSelectedDocId(filteredDocs[0].id);
    }
  }, [filteredDocs]);

  const activeDoc = docList.find((d) => d.id === selectedDocId) || docList[0];

  // Viewer Controls (Zoom & Rotate)
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  // Human-in-the-Loop: In-place edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [adminCorrectionLog, setAdminCorrectionLog] = useState({});

  // Modals for Actions
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECTION_REASONS[0].id);
  const [customRejectNote, setCustomRejectNote] = useState('');

  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false);
  const [selectedReuploadReasons, setSelectedReuploadReasons] = useState([REUPLOAD_REASONS[0]]);
  const [customReuploadNote, setCustomReuploadNote] = useState('');

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState(null);
  const [reanalyzedResult, setReanalyzedResult] = useState(null);
  const [isLocalReanalyzing, setIsLocalReanalyzing] = useState(false);
  const [selectedActualDocKey, setSelectedActualDocKey] = useState('');
  const [actualPreview, setActualPreview] = useState({ loading: false, url: '', mime: '', error: '' });

  // Dokumen COTA yang tercatat di database. KTP/KK dan supporting dictionary
  // dapat dibuka lewat endpoint admin yang memeriksa autentikasi.
  const actualDocuments = React.useMemo(() => {
    if (!selectedApplicant?.rawId) return [];
    const rows = [];
    const add = (key, label, path, previewable = true) => {
      if (path) rows.push({ key, label, path: String(path), previewable });
    };
    add('ktp', 'KTP Pemohon', selectedApplicant.dokumen_ktp);
    add('kk', 'Kartu Keluarga (KK)', selectedApplicant.dokumen_kk);

    const supporting = selectedApplicant.dokumen_pendukung;
    if (supporting && typeof supporting === 'object' && !Array.isArray(supporting)) {
      Object.entries(supporting).forEach(([key, path]) => {
        add(key, key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), path);
      });
    } else if (Array.isArray(supporting)) {
      supporting.forEach((path, index) => {
        // Daftar lama hanya menyimpan path, belum punya nama key untuk endpoint admin.
        add(`dokumen_pendukung_${index + 1}`, `Dokumen Pendukung ${index + 1}`, path, true);
      });
    }
    return rows;
  }, [selectedApplicant]);
  const actualDocumentSignature = actualDocuments.map((doc) => `${doc.key}:${doc.path}`).join('|');
  const selectedActualDoc = actualDocuments.find((doc) => doc.key === selectedActualDocKey) || actualDocuments[0] || null;

  // Gunakan hasil yang dikirim backend, bukan hasil mock, bila ada pengajuan nyata.
  const liveAiResult = React.useMemo(() => {
    const source = reanalyzedResult ?? selectedApplicant?.hasil_ekstraksi_ai ?? null;
    if (source == null || source === '') return null;
    if (typeof source === 'string') {
      try {
        return JSON.parse(source);
      } catch {
        return { output: source };
      }
    }
    return source;
  }, [reanalyzedResult, selectedApplicant]);

  useEffect(() => {
    setReanalyzedResult(null);
    setSelectedActualDocKey(actualDocuments[0]?.key || '');
  }, [selectedApplicant?.rawId, actualDocumentSignature]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    const loadActualDocument = async () => {
      if (!selectedApplicant?.rawId || !selectedActualDoc) {
        setActualPreview({ loading: false, url: '', mime: '', error: '' });
        return;
      }
      if (!selectedActualDoc.previewable) {
        setActualPreview({
          loading: false,
          url: '',
          mime: '',
          error: 'Format database lama hanya menyimpan daftar path tanpa key dokumen. Dokumen ini perlu dinormalisasi ke objek dokumen_pendukung di backend.',
        });
        return;
      }

      setActualPreview({ loading: true, url: '', mime: '', error: '' });
      try {
        const blob = await adopsiService.getAdminAdoptionDocument(
          selectedApplicant.rawId,
          selectedActualDoc.key
        );
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setActualPreview({ loading: false, url: objectUrl, mime: blob.type || '', error: '' });
      } catch (err) {
        if (cancelled) return;
        setActualPreview({
          loading: false,
          url: '',
          mime: '',
          error: err?.friendlyMessage || err?.message || 'Dokumen tidak dapat dimuat dari backend. Periksa endpoint dan lokasi penyimpanan.',
        });
      }
    };

    loadActualDocument();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedApplicant?.rawId, selectedActualDocKey, actualDocumentSignature]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Switch Active Document
  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setZoomScale(1);
    setRotation(0);
    setIsEditMode(false);
    setEditedFields({});
  };

  // Viewer Control Handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.2, 0.6));
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleResetViewer = () => {
    setZoomScale(1);
    setRotation(0);
  };

  // Current Working Extraction Data (considering admin edits)
  const currentExtraction = {
    ...activeDoc?.hasil_ekstraksi_ai,
    ...(editedFields[activeDoc.id] || {})
  };

  const applicantInput = activeDoc?.data_formulir_pemohon || {};

  // Human-in-the-Loop: Edit Field Handlers
  const handleFieldChange = (key, value) => {
    setEditedFields((prev) => ({
      ...prev,
      [activeDoc.id]: {
        ...(prev[activeDoc.id] || {}),
        [key]: value
      }
    }));
  };

  const handleSaveEdits = () => {
    setIsEditMode(false);
    // Log the correction
    setAdminCorrectionLog((prev) => ({
      ...prev,
      [activeDoc.id]: {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        editor: 'Verifikator Tim PIPA (Dinsos)'
      }
    }));

    // Update activeDoc status to reflect manual correction
    setDocList((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? {
              ...d,
              status: 'menunggu_tinjauan_manual',
              catatan_ai: `${d.catatan_ai} [KOREKSI MANUAL: Data telah dikoreksi oleh admin Dinsos].`
            }
          : d
      )
    );

    showToast('Koreksi data berhasil disimpan! Status pencocokan telah diperbarui.', 'success');
  };

  const handleCancelEdits = () => {
    setIsEditMode(false);
    setEditedFields((prev) => {
      const copy = { ...prev };
      delete copy[activeDoc.id];
      return copy;
    });
  };

  // Actions. A real application must be saved by the parent/backend before the UI
  // reports success; local state is only a view update after a successful response.
  const getSelectedApplicationId = () => {
    const raw = selectedApplicant?.rawId ?? selectedApplicant?.id;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleApproveDocument = async () => {
    if (!activeDoc) return;
    try {
      const targetId = getSelectedApplicationId();
      if (onApprove) {
        await onApprove(activeDoc);
      } else if (targetId) {
        await adopsiService.updateAdoptionStatus(targetId, 'diverifikasi');
      } else {
        throw new Error('ID pengajuan database tidak tersedia.');
      }

      setDocList((prev) => prev.map((doc) =>
        doc.id === activeDoc.id
          ? { ...doc, status: 'diverifikasi', skor_confidence: Math.max(Number(doc.skor_confidence) || 0, 98) }
          : doc
      ));
      showToast(`Keputusan persetujuan berhasil disimpan untuk ${selectedApplicant?.applicant || 'pengajuan ini'}.`, 'success');
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menyimpan persetujuan ke backend.', 'danger');
    }
  };

  const handleSubmitReupload = async () => {
    if (!activeDoc) return;
    const reasons = selectedReuploadReasons.join('; ');
    const note = customReuploadNote ? ` Catatan: ${customReuploadNote}` : '';
    try {
      const targetId = getSelectedApplicationId();
      if (onReupload) {
        await onReupload(activeDoc, { reasons: selectedReuploadReasons, note: customReuploadNote });
      } else if (targetId) {
        await adopsiService.updateAdoptionStatus(targetId, 'butuh_dokumen_tambahan');
      } else {
        throw new Error('ID pengajuan database tidak tersedia.');
      }

      setDocList((prev) => prev.map((doc) =>
        doc.id === activeDoc.id
          ? { ...doc, status: 'butuh_dokumen_tambahan', catatan_ai: `Permintaan unggah ulang: ${reasons}.${note}` }
          : doc
      ));
      setIsReuploadModalOpen(false);
      showToast('Permintaan unggah ulang berhasil disimpan.', 'warning');
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menyimpan permintaan unggah ulang.', 'danger');
    }
  };

  const handleSubmitReject = async () => {
    if (!activeDoc) return;
    const selectedObj = REJECTION_REASONS.find((reason) => reason.id === selectedRejectReason);
    try {
      const targetId = getSelectedApplicationId();
      if (onReject) {
        await onReject(activeDoc, { reason: selectedObj, note: customRejectNote });
      } else if (targetId) {
        await adopsiService.updateAdoptionStatus(targetId, 'ditolak');
      } else {
        throw new Error('ID pengajuan database tidak tersedia.');
      }

      setDocList((prev) => prev.map((doc) =>
        doc.id === activeDoc.id
          ? { ...doc, status: 'ditolak', catatan_ai: `Dokumen ditolak: ${selectedObj?.label || 'alasan tidak ditentukan'}. Catatan: ${customRejectNote}` }
          : doc
      ));
      setIsRejectModalOpen(false);
      showToast('Keputusan penolakan berhasil disimpan.', 'danger');
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menyimpan penolakan ke backend.', 'danger');
    }
  };

  const handleReanalyzeAI = async () => {
    try {
      const targetId = getSelectedApplicationId();
      if (onReanalyzeAI) {
        setIsLocalReanalyzing(true);
        const response = await onReanalyzeAI();
        if (response?.hasil_ekstraksi_ai !== undefined) {
          setReanalyzedResult(response.hasil_ekstraksi_ai);
        }
        showToast('Respons analisis ulang berhasil diterima dari backend.', 'success');
      } else if (targetId) {
        setIsLocalReanalyzing(true);
        const response = await adopsiService.reanalyzeAdoptionAI(targetId);
        setReanalyzedResult(response?.hasil_ekstraksi_ai ?? null);
        showToast('Analisis ulang selesai dan hasil AI dimuat.', 'success');
      } else {
        throw new Error('Pilih pengajuan dari backend sebelum menjalankan analisis AI.');
      }
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Analisis ulang AI gagal. Periksa log backend.', 'danger');
    } finally {
      setIsLocalReanalyzing(false);
    }
  };

  // Helper to determine match status for a field
  const getFieldComparison = (key, aiVal, userVal) => {
    const strAi = String(aiVal || '').trim().toLowerCase();
    const strUser = String(userVal || '').trim().toLowerCase();

    // Special rule checks for age
    if (key === 'usia') {
      const num = Number(aiVal);
      const isLegalAge = num >= 30 && num <= 55;
      return {
        isMatch: strAi === strUser && isLegalAge,
        label: isLegalAge ? 'Sesuai Batas Usia (30-55 Thn)' : 'Tidak Sesuai Permensos',
        color: isLegalAge ? 'emerald' : 'rose'
      };
    }

    // Special rule check for marriage duration
    if (key === 'durasi_nikah_tahun') {
      const dur = Number(aiVal);
      const isLegalMarriage = dur >= 5;
      return {
        isMatch: isLegalMarriage,
        label: isLegalMarriage ? '>= 5 Tahun (Lolos Permensos)' : '< 5 Tahun (Belum Memenuhi)',
        color: isLegalMarriage ? 'emerald' : 'amber'
      };
    }

    if (!aiVal || !userVal) {
      return { isMatch: false, label: 'Data Kosong / Tidak Terbaca', color: 'slate' };
    }

    if (strAi === strUser) {
      return { isMatch: true, label: 'Cocok 100%', color: 'emerald' };
    }

    // Levenshtein similarity / typo check
    return { isMatch: false, label: 'Terdapat Selisih / Typo AI', color: 'amber' };
  };

  // Grouped fields based on document type
  const getFieldsToCompare = () => {
    if (activeDoc.tipe_dokumen === 'ktp_cota') {
      return [
        { key: 'nik', label: 'Nomor Induk Kependudukan (NIK)', icon: CreditCard },
        { key: 'nama_lengkap', label: 'Nama Lengkap Sesuai KTP', icon: User },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir', icon: Calendar },
        { key: 'usia', label: 'Usia Pemohon COTA (Aturan PIPA)', icon: Info },
        { key: 'status_perkawinan', label: 'Status Perkawinan', icon: FileText },
        { key: 'alamat', label: 'Alamat Domisili KTP', icon: Building }
      ];
    } else if (activeDoc.tipe_dokumen === 'kk_cota') {
      return [
        { key: 'nomor_kk', label: 'Nomor Kartu Keluarga (KK)', icon: FileText },
        { key: 'kepala_keluarga', label: 'Nama Kepala Keluarga', icon: User },
        { key: 'nik_kepala_keluarga', label: 'NIK Kepala Keluarga', icon: CreditCard },
        { key: 'nama_istri', label: 'Nama Istri Terdaftar', icon: User },
        { key: 'status_perkawinan', label: 'Status Hubungan Perkawinan', icon: FileText },
        { key: 'alamat_kk', label: 'Alamat Terdaftar KK', icon: Building }
      ];
    } else if (activeDoc.tipe_dokumen === 'akta_nikah_cota') {
      return [
        { key: 'nomor_akta_nikah', label: 'Nomor Register Akta Nikah', icon: FileText },
        { key: 'nama_suami', label: 'Nama Suami (Pemohon COTA)', icon: User },
        { key: 'nama_istri', label: 'Nama Istri (Pemohon COTA)', icon: User },
        { key: 'tanggal_nikah', label: 'Tanggal Akad Pernikahan', icon: Calendar },
        { key: 'durasi_nikah_tahun', label: 'Durasi Pernikahan (Tahun)', icon: Info },
        { key: 'kua_penerbit', label: 'KUA / Disdukcapil Penerbit', icon: Building }
      ];
    } else {
      // Donasi documents
      return [
        { key: 'bank_pengirim', label: 'Bank / Sumber Pengirim', icon: Building },
        { key: 'nama_pengirim', label: 'Nama Rekening Pengirim', icon: User },
        { key: 'nominal_terformat', label: 'Nominal Donasi Terverifikasi', icon: CreditCard },
        { key: 'nomor_rekening_tujuan', label: 'Nomor Rekening Dinsos Tujuan', icon: CreditCard },
        { key: 'tanggal_transaksi', label: 'Tanggal & Waktu Transaksi', icon: Calendar },
        { key: 'nomor_referensi', label: 'Kode Referensi Transaksi', icon: FileText }
      ];
    }
  };

  const fields = getFieldsToCompare();
  const effectiveStatus = selectedApplicant?.rawId
    ? String(selectedApplicant.rawStatus || '').toLowerCase()
    : activeDoc.status;
  const isPendingManual = effectiveStatus === 'menunggu_tinjauan_manual';
  const isApproved = effectiveStatus === 'diverifikasi';
  const isRejected = effectiveStatus === 'ditolak';

  if (!isCurrentlyOpen && isModal) return null;

  const dialogContent = (
    <div
      className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative w-full ${
        isModal ? 'max-w-7xl max-h-[92vh] h-[880px]' : 'h-[78vh] min-h-[560px] rounded-2xl'
      }`}
      onClick={(e) => isModal && e.stopPropagation()}
    >
      {/* ----------------- TOP BAR: DOCUMENT SWITCHER & STATUS SUMMARY (FIXED AT TOP) ----------------- */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 border-b border-blue-950/40 shrink-0 relative">
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${isModal ? 'pr-12' : ''}`}>
          {/* Left Title & Badge */}
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30">
              <Bot size={22} className="text-cyan-400" />
            </span>
            <div>
              <h2 id="modal-ai-review-title" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                AI Agentic Verifikasi Berkas
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40">
                  Super Admin / Dinsos PIPA
                </span>
              </h2>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {selectedApplicant ? (
                  <span>
                    Pemohon: <strong className="text-cyan-300 font-semibold">{selectedApplicant.applicant}</strong> • Calon Anak Asuh: <strong className="text-cyan-300 font-semibold">{selectedApplicant.targetChild}</strong> <span className="text-white/60">({selectedApplicant.id})</span>
                  </span>
                ) : (
                  'Inspeksi split-screen hasil ekstraksi OCR & validasi otomatis regulasi COTA/Donasi'
                )}
              </p>
            </div>
          </div>

          {/* Untuk pengajuan nyata, daftar tombol berasal dari dokumen yang tersimpan di database. */}
          {selectedApplicant?.rawId ? (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {actualDocuments.map((doc) => (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => setSelectedActualDocKey(doc.key)}
                  className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 border ${
                    selectedActualDoc?.key === doc.key
                      ? 'bg-white text-blue-950 font-bold shadow-md border-white ring-2 ring-cyan-400'
                      : 'bg-white/10 text-white/90 hover:bg-white/20 border-white/15'
                  }`}
                >
                  <FileText size={14} className={selectedActualDoc?.key === doc.key ? 'text-blue-700' : 'text-cyan-300'} />
                  <span>{doc.label}</span>
                </button>
              ))}
              {actualDocuments.length === 0 && <span className="text-[11px] text-blue-100">Tidak ada path dokumen pada record ini.</span>}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {docList.map((doc) => {
                const isSelected = doc.id === activeDoc.id;
                const isDocManual = doc.status === 'menunggu_tinjauan_manual';
                const isDocOk = doc.status === 'diverifikasi';
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 border ${
                      isSelected ? 'bg-white text-blue-950 font-bold shadow-md border-white ring-2 ring-cyan-400' : 'bg-white/10 text-white/90 hover:bg-white/20 border-white/15'
                    }`}
                  >
                    <FileText size={14} className={isSelected ? 'text-blue-700' : 'text-cyan-300'} />
                    <span className="truncate max-w-[120px] sm:max-w-[140px]">{doc.nama_dokumen}</span>
                    {isDocOk && <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950" title="Diverifikasi" />}
                    {isDocManual && <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-950" title="Perlu Review" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prominent Close Button (X) at Top Right Corner */}
        {isModal && (
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Tutup Pop-up"
            title="Tutup (ESC)"
            className="absolute top-4 sm:top-5 right-4 sm:right-5 w-9 h-9 rounded-full bg-white/15 hover:bg-rose-600 text-white flex items-center justify-center transition-all duration-200 shadow-md ring-1 ring-white/20 hover:scale-105 active:scale-95 group shrink-0"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
          </button>
        )}

        {/* Active Document Metadata Ribbon */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-blue-100 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-white/10 px-2.5 py-1 rounded-md font-mono text-cyan-200">
              ID: {selectedApplicant?.rawId ? `PENGAJUAN-${selectedApplicant.rawId}` : activeDoc.id}
            </span>
            <span className="text-blue-200/90">Kategori: <strong>{selectedApplicant?.rawId ? (selectedActualDoc?.label || 'Dokumen COTA') : activeDoc.kategori}</strong></span>
            <span>{selectedApplicant?.rawId ? 'Sumber: Backend/MySQL' : `Diunggah: ${activeDoc.tanggal_unggah}`}</span>
            <span>{selectedApplicant?.rawId ? `Berkas: ${selectedActualDoc?.path?.split(/[\\/]/).pop() || '-'}` : `Ukuran: ${activeDoc.ukuran_file}`}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-blue-200">{selectedApplicant?.rawId ? 'Keterbacaan OCR:' : 'Confidence OCR:'}</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-white/10 text-white border border-white/20">
              <Sparkles size={12} className={activeDoc.skor_confidence >= 85 ? 'text-emerald-400' : 'text-amber-400'} />
              <span>{selectedApplicant?.rawId
                ? (() => {
                    if (!liveAiResult) return '—';
                    const explicit = liveAiResult.confidence ?? liveAiResult.confidence_score;
                    if (explicit != null) return explicit;
                    const pct = summarizeAiResult(liveAiResult).percent;
                    return pct == null ? '—' : `${pct}%`;
                  })()
                : `${activeDoc.skor_confidence}%`}</span>
            </div>

            {/* Status Pill */}
            {isApproved && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 size={12} /> DIVERIFIKASI SAH
              </span>
            )}
            {isPendingManual && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <AlertTriangle size={12} /> PERLU TINJAUAN MANUAL
              </span>
            )}
            {isRejected && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <XCircle size={12} /> DITOLAK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3 text-xs sm:text-sm font-semibold flex items-center justify-between px-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toastMessage.type === 'warning'
              ? 'bg-amber-500 text-slate-900'
              : toastMessage.type === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="opacity-80 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ----------------- SPLIT-SCREEN MAIN WORKSPACE ----------------- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 bg-slate-50 overflow-hidden">
        
        {/* ================= SISI KIRI: DOKUMEN VIEWER CANVAS (5 COLS) ================= */}
        <div className="lg:col-span-5 bg-slate-900 text-white flex flex-col border-b lg:border-b-0 lg:border-r border-slate-700/60 relative overflow-hidden">
          
          {/* Canvas Toolbar */}
          <div className="shrink-0 bg-slate-950/80 backdrop-blur p-2.5 px-4 flex items-center justify-between border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1 text-slate-300 font-medium">
              <Eye size={15} className="text-cyan-400" />
              <span>Preview Berkas Fisik</span>
            </div>

            {/* Toolbar Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomIn}
                title="Perbesar (Zoom In)"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={handleZoomOut}
                title="Perkecil (Zoom Out)"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <ZoomOut size={15} />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-400">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={handleRotateCcw}
                title="Putar 90° Berlawanan Arah Jarum Jam"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={handleRotateCw}
                title="Putar 90° Searah Jarum Jam"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RotateCw size={15} />
              </button>
              <button
                onClick={handleResetViewer}
                title="Reset Tampilan (100% Normal)"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition ml-1"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Bounding box controls are only for the illustrative sample canvas. */}
          {!selectedApplicant?.rawId && (
          <div className="shrink-0 px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Visualisasi Bounding Box AI OCR:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBoundingBoxes}
                onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span className={`font-semibold ${showBoundingBoxes ? 'text-cyan-400' : 'text-slate-500'}`}>
                {showBoundingBoxes ? 'Aktif (Highlight Teks)' : 'Non-aktif'}
              </span>
            </label>
          </div>
          )}

          {/* Document Canvas Stage: real applicants load the protected backend file; only the demo uses a generated sample canvas. */}
          <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/50">
            {selectedApplicant?.rawId ? (
              <div className="w-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-center">
                {actualPreview.loading ? (
                  <div className="text-sm text-cyan-100 flex items-center gap-2"><RefreshCw size={18} className="animate-spin" /> Memuat berkas asli dari backend...</div>
                ) : actualPreview.url ? (
                  actualPreview.mime.includes('pdf') || selectedActualDoc?.path?.toLowerCase().endsWith('.pdf') ? (
                    <iframe title={selectedActualDoc?.label || 'Dokumen COTA'} src={actualPreview.url} className="w-full h-[68vh] min-h-[420px] rounded-lg bg-white" />
                  ) : actualPreview.mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(selectedActualDoc?.path || '') ? (
                    <img
                      src={actualPreview.url}
                      alt={selectedActualDoc?.label || 'Dokumen COTA'}
                      style={{ transform: `scale(${zoomScale}) rotate(${rotation}deg)`, transformOrigin: 'center center', maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain' }}
                      className="rounded-lg shadow-2xl"
                    />
                  ) : (
                    <a href={actualPreview.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-3 font-bold text-blue-800">Buka / unduh dokumen</a>
                  )
                ) : (
                  <div className="max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-200">
                    <FileText size={30} className="mx-auto mb-3 text-cyan-300" />
                    <p className="font-bold text-white">Pratinjau berkas asli belum tersedia</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{actualPreview.error || 'Pilih dokumen dari daftar atas atau periksa apakah path file tersimpan pada pengajuan.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <DocumentCanvasPreview
                previewType={activeDoc.preview_type}
                scale={zoomScale}
                rotation={rotation}
                showBoundingBoxes={showBoundingBoxes}
                documentData={{ ...activeDoc, hasil_ekstraksi_ai: currentExtraction }}
              />
            )}
          </div>

          {/* Footer Canvas: File Tip */}
          <div className="shrink-0 p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            {selectedApplicant?.rawId ? (
              <>
                <span className="truncate" title={selectedActualDoc?.path || ''}>{selectedActualDoc?.path || 'Belum ada berkas dipilih'}</span>
                <span className="text-cyan-400 font-mono shrink-0 ml-3">{actualPreview.mime || (actualPreview.loading ? 'memuat…' : '—')}</span>
              </>
            ) : (
              <>
                <span>Resolusi Asli: 2400 x 1500 px • 300 DPI</span>
                <span className="text-cyan-400 font-mono">Tersertifikasi AI Guard Dinsos</span>
              </>
            )}
          </div>
        </div>

        {/* ================= SISI KANAN: PANEL EKSTRAKSI & HUMAN-IN-THE-LOOP (7 COLS) ================= */}
        <div className="lg:col-span-7 flex flex-col bg-white overflow-hidden">

          {/* Hasil AI resmi dari MySQL/backend, ditampilkan terbaca (bukan JSON mentah). */}
          {selectedApplicant?.rawId ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Bot size={17} className="text-indigo-700" /> Hasil Analisis AI
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Pengajuan database #{selectedApplicant.rawId} • {selectedApplicant.applicant || 'Pemohon'}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${liveAiResult ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-amber-100 border-amber-200 text-amber-800'}`}>
                  {liveAiResult ? 'HASIL AI TERSEDIA' : 'BELUM ADA HASIL AI'}
                </span>
              </div>

              {liveAiResult && (liveAiResult.documents || liveAiResult.anomalies || liveAiResult.agent) ? (
                <CotaAiResultPanel
                  result={liveAiResult}
                  selectedDocumentKey={selectedActualDoc?.key}
                  onSelectDocument={setSelectedActualDocKey}
                />
              ) : liveAiResult ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <strong>Format hasil AI tidak dikenali.</strong> Tekan “Analisis Ulang AI” untuk membuat ulang hasilnya.
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-2 text-[10px] text-slate-700">{JSON.stringify(liveAiResult, null, 2)}</pre>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  Belum ada hasil AI untuk pengajuan ini. Tekan “Analisis Ulang AI” setelah memastikan berkas tersimpan dan dapat dibaca backend.
                </div>
              )}
            </div>
          ) : (
            <>
          {/* Alert Header if Manual Review Needed */}
          {isPendingManual && (
            <div className="shrink-0 bg-amber-50 border-b border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <h4 className="font-bold text-amber-900 text-sm">
                    Perhatian Verifikator: Dokumen Memerlukan Tinjauan Manual
                  </h4>
                  <p className="text-amber-800 mt-1 leading-relaxed">
                    {activeDoc.catatan_ai}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
                      Tindakan Admin: Periksa selisih data atau gunakan tombol 'Edit Hasil Ekstraksi' untuk mengoreksi typo bacaan OCR.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Correction Notice if edited */}
          {adminCorrectionLog[activeDoc.id] && (
            <div className="shrink-0 bg-blue-50 border-b border-blue-200 p-2.5 px-4 text-xs flex items-center justify-between text-blue-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-600" />
                <span>
                  <strong>Data Dikoreksi Manual:</strong> Oleh {adminCorrectionLog[activeDoc.id].editor} pukul {adminCorrectionLog[activeDoc.id].timestamp}
                </span>
              </div>
              <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded font-bold text-blue-800">
                Terverifikasi Override
              </span>
            </div>
          )}

          {/* Section Subheader & Inline Edit Toggle */}
          <div className="shrink-0 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Komparasi Data: Ekstraksi AI vs Input Formulir Pemohon
              </h3>
              <p className="text-xs text-slate-500">
                Kolom kiri menampilkan bacaan model Single-Agent AI. Kolom kanan menampilkan isian pemohon.
              </p>
            </div>

            {/* In-place Edit Button */}
            {!isEditMode ? (
              <button
                onClick={() => setIsEditMode(true)}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-700 shadow-sm transition"
              >
                <Edit3 size={14} className="text-blue-600" />
                <span>Edit / Koreksi Typo AI</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdits}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition"
                >
                  <Save size={14} />
                  <span>Simpan Koreksi</span>
                </button>
                <button
                  onClick={handleCancelEdits}
                  className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-700 transition"
                >
                  <Undo2 size={14} />
                  <span>Batal</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= DATA COMPARISON GRID ================= */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1 border-b border-slate-200">
              <div className="col-span-4 sm:col-span-3">Nama Field / Aturan</div>
              <div className="col-span-4 sm:col-span-4">Hasil Ekstraksi AI (OCR/NLP)</div>
              <div className="col-span-4 sm:col-span-5">Data Formulir Pemohon</div>
            </div>

            {fields.map(({ key, label, icon: FieldIcon }) => {
              const aiVal = currentExtraction[key];
              const userVal = applicantInput[key];
              const comp = getFieldComparison(key, aiVal, userVal);

              const isMatch = comp.isMatch;

              return (
                <div
                  key={key}
                  className={`p-3 rounded-xl border transition-all text-xs ${
                    isMatch
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : 'bg-amber-50/70 border-amber-300 shadow-sm'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Kolom 1: Field Label & Match Badge */}
                    <div className="col-span-12 sm:col-span-3">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <FieldIcon size={14} className="text-slate-500 shrink-0" />
                        <span className="truncate" title={label}>{label}</span>
                      </div>
                      
                      {/* Match Status Badge */}
                      <div className="mt-1">
                        {isMatch ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            {comp.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle size={11} className="text-amber-600" />
                            {comp.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kolom 2: Hasil Ekstraksi AI (Bisa diedit saat edit mode) */}
                    <div className="col-span-12 sm:col-span-4">
                      <span className="text-[10px] text-slate-400 block sm:hidden font-semibold">Hasil AI:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={aiVal || ''}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border-2 border-blue-500 bg-white text-slate-900 font-medium focus:outline-none ring-2 ring-blue-200"
                        />
                      ) : (
                        <div
                          className={`font-semibold p-2 rounded-lg border ${
                            isMatch
                              ? 'bg-emerald-100/60 text-emerald-950 border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                          }`}
                        >
                          {aiVal !== undefined && aiVal !== null ? String(aiVal) : '-'}
                        </div>
                      )}
                    </div>

                    {/* Kolom 3: Data Formulir Pemohon */}
                    <div className="col-span-12 sm:col-span-5">
                      <span className="text-[10px] text-slate-400 block sm:hidden font-semibold">Formulir Pemohon:</span>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium flex items-center justify-between">
                        <span className="truncate">
                          {userVal !== undefined && userVal !== null ? String(userVal) : '-'}
                        </span>
                        {isMatch ? (
                          <Check size={14} className="text-emerald-600 shrink-0 ml-2" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-600 shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Legal Rule Assessment Box (Permensos No. 110/2009) */}
            {activeDoc.validasi_legalitas && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs">
                <h4 className="font-bold text-blue-950 flex items-center gap-1.5 mb-2">
                  <ShieldCheck size={16} className="text-blue-700" />
                  Kepatuhan Standar Peraturan Menteri Sosial RI (Permensos No. 110/HUK/2009):
                </h4>
                <div className="space-y-1.5">
                  {Object.entries(activeDoc.validasi_legalitas).map(([ruleKey, ruleVal]) => (
                    <div key={ruleKey} className="flex items-start justify-between bg-white/80 p-2 rounded-lg border border-blue-100">
                      <div>
                        <span className="font-semibold text-slate-800">{ruleVal.aturan}</span>
                        <p className="text-[11px] text-slate-600">{ruleVal.detail}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          ruleVal.status === 'lolos'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ruleVal.status === 'perlu_tinjauan'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ruleVal.status === 'lolos' ? '✓ MEMENUHI' : ruleVal.status === 'perlu_tinjauan' ? '⚠️ TINJAU' : '✗ TIDAK LOLOS'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

            </>
          )}

          {/* ================= ACTION VERIFICATION BAR (BOTTOM) ================= */}
          <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 w-full sm:w-auto">
              <span>Status Keputusan: </span>
              <strong className="text-slate-800 uppercase">{String(selectedApplicant?.rawId ? (selectedApplicant.rawStatus || selectedApplicant.status) : activeDoc.status || 'tidak diketahui').replace(/_/g, ' ')}</strong>
            </div>

            {/* Verification Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Button: Analisis Ulang AI */}
              <button
                onClick={handleReanalyzeAI}
                disabled={isAnalyzingAI || isLocalReanalyzing || isSavingDecision}
                title="Picu ulang analisis AI pada backend"
                className="text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 border border-slate-300 shadow-sm transition"
              >
                <Bot size={15} className="text-blue-600" />
                <span>{(isAnalyzingAI || isLocalReanalyzing) ? 'Menganalisis...' : 'Analisis Ulang AI'}</span>
              </button>

              {/* Button: Tolak Pengajuan */}
              <button
                onClick={() => setIsRejectModalOpen(true)}
                disabled={isRejected || isSavingDecision}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                  isRejected
                    ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-sm'
                }`}
              >
                <XCircle size={15} />
                <span>Tolak Dokumen</span>
              </button>

              {/* Button: Minta Unggah Ulang / Tambahan */}
              <button
                onClick={() => setIsReuploadModalOpen(true)}
                disabled={isSavingDecision}
                className="text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 shadow-sm transition"
              >
                <RefreshCw size={14} />
                <span>Minta Unggah Ulang</span>
              </button>

              {/* Button: Setujui Dokumen */}
              <button
                onClick={handleApproveDocument}
                disabled={isApproved || isSavingDecision}
                className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm ${
                  isApproved
                    ? 'bg-emerald-200 text-emerald-800 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{isApproved ? 'Telah Disetujui ✓' : 'Setujui Dokumen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: TOLAK DOKUMEN (FORMAL DINSOS) ================= */}
      {isRejectModalOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <XCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Penolakan Dokumen Resmi Dinsos
                </h3>
                <p className="text-xs text-slate-500">
                  Keputusan ini akan dicatat dalam BAP Sidang PIPA dan diteruskan ke pemohon.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pilih Klausul / Alasan Penolakan Berdasarkan Regulasi:
                </label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`block p-2.5 rounded-xl border cursor-pointer transition ${
                        selectedRejectReason === reason.id
                          ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400 text-rose-950'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="rejectReason"
                          checked={selectedRejectReason === reason.id}
                          onChange={() => setSelectedRejectReason(reason.id)}
                          className="mt-0.5 accent-rose-600"
                        />
                        <div>
                          <strong className="block text-slate-900">{reason.label}</strong>
                          <span className="text-[11px] text-slate-500">{reason.regulasi}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Tambahan untuk Pemohon (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="Contoh: Berdasarkan data KTP, usia pemohon 28 tahun belum genap 30 tahun sesuai aturan PIPA..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30"
              >
                Konfirmasi Tolak Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MINTA UNGGAH ULANG / DOKUMEN TAMBAHAN ================= */}
      {isReuploadModalOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsReuploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Minta Unggah Ulang / Dokumen Tambahan
                </h3>
                <p className="text-xs text-slate-500">
                  Kirimkan arahan perbaikan berkas kepada pemohon tanpa membatalkan tiket pendaftaran.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Pilih Masalah Dokumen yang Ditemukan (Checklist):
                </label>
                <div className="space-y-1.5">
                  {REUPLOAD_REASONS.map((reason) => {
                    const isChecked = selectedReuploadReasons.includes(reason);
                    return (
                      <label
                        key={reason}
                        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReuploadReasons((prev) => [...prev, reason]);
                            } else {
                              setSelectedReuploadReasons((prev) => prev.filter((r) => r !== reason));
                            }
                          }}
                          className="mt-0.5 accent-amber-600"
                        />
                        <span>{reason}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Instruksi Khusus untuk Pemohon:
                </label>
                <textarea
                  rows={2}
                  value={customReuploadNote}
                  onChange={(e) => setCustomReuploadNote(e.target.value)}
                  placeholder="Misal: Harap foto ulang KTP di tempat terang tanpa pantulan flash..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsReuploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReupload}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
              >
                Kirim Permintaan ke Pemohon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden animate-in fade-in"
        onClick={handleCloseModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ai-review-title"
      >
        {dialogContent}
      </div>
    );
  }

  return dialogContent;
}
