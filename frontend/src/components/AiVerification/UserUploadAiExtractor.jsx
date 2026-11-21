import React, { useState } from 'react';
import {
  Upload,
  Bot,
  AlertTriangle,
  FileText,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { MOCK_AI_DOCUMENTS } from './mockAiData';

/**
 * Komponen Status Ekstraksi di Sisi Pemohon / User (Form Upload COTA & Donasi)
 * Menangani alur:
 * 1. Upload File / Pilih Sampel
 * 2. Loading State Animasi: "AI sedang membaca & memvalidasi berkas..."
 * 3. Hasil Ekstraksi:
 *    - Sukses Terbaca: Ringkasan data terdeteksi untuk konfirmasi pemohon
 *    - Gambar Buram / Tidak Jelas: Peringatan ramah & opsi tetap melanjutkan verifikasi manual Dinsos
 */
export default function UserUploadAiExtractor({
  defaultCategory = 'cota', // 'cota' | 'donasi'
  onExtractionComplete,
  onFinalSubmit
}) {
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  // Upload & Process States: 'idle' | 'scanning' | 'completed'
  const [processState, setProcessState] = useState('idle');
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState(null);
  const [isConfirmedByUser, setIsConfirmedByUser] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Scanning animation steps
  const SCAN_STEPS = [
    { label: 'Mengunggah & mengenkripsi citra dokumen...', progress: 25 },
    { label: 'Single-Agent AI OCR sedang membaca teks & field dokumen...', progress: 65 },
    { label: 'AI Entity Extraction & validasi aturan legalitas Dinsos...', progress: 95 }
  ];

  const handleReset = () => {
    setProcessState('idle');
    setScanStepIndex(0);
    setCurrentResult(null);
    setIsConfirmedByUser(false);
    setUploadedFileName('');
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    handleReset();
  };

  // Trigger simulated AI scanning workflow
  const triggerAiScan = (mockTargetId, customFileName) => {
    const targetDoc =
      MOCK_AI_DOCUMENTS.find((d) => d.id === mockTargetId) || MOCK_AI_DOCUMENTS[0];

    setUploadedFileName(customFileName || targetDoc.nama_dokumen);
    setProcessState('scanning');
    setScanStepIndex(0);

    // Step 1
    setTimeout(() => {
      setScanStepIndex(1);
    }, 900);

    // Step 2
    setTimeout(() => {
      setScanStepIndex(2);
    }, 1900);

    // Step 3: Complete
    setTimeout(() => {
      setProcessState('completed');
      setCurrentResult(targetDoc);
      if (onExtractionComplete) {
        onExtractionComplete(targetDoc);
      }
    }, 2900);
  };

  // Real File Upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Based on user choice, pick best matching mock or simulate low confidence if name contains "blur"/"buram"
    const isBuram = file.name.toLowerCase().includes('buram') || file.name.toLowerCase().includes('blur');
    let targetId = 'DOC-COTA-KTP-001';

    if (selectedCategory === 'donasi') {
      targetId = isBuram ? 'DOC-DONASI-TRF-102' : 'DOC-DONASI-TRF-101';
    } else {
      targetId = isBuram ? 'DOC-COTA-KK-002' : 'DOC-COTA-KTP-001';
    }

    triggerAiScan(targetId, file.name);
  };

  // Is extraction high confidence?
  const isHighConfidence =
    currentResult && currentResult.status === 'diverifikasi' && currentResult.skor_confidence >= 80;
  const isLowConfidence =
    currentResult && (currentResult.status === 'menunggu_tinjauan_manual' || currentResult.skor_confidence < 80);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 backdrop-blur">
              <Bot size={24} className="text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Asisten AI Verifikasi Berkas Mandiri
              </h3>
              <p className="text-xs text-blue-100/90 mt-0.5">
                AI Single-Agent akan otomatis membaca NIK, nama, dan detail berkas Anda secara real-time.
              </p>
            </div>
          </div>

          {/* Category Switcher Pill */}
          <div className="inline-flex p-1 bg-blue-950/40 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => handleSelectCategory('cota')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedCategory === 'cota'
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Adopsi COTA
            </button>
            <button
              onClick={() => handleSelectCategory('donasi')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedCategory === 'donasi'
                  ? 'bg-white text-blue-950 shadow-sm'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Bukti Donasi
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* ================= 1. STATE: IDLE (UPLOAD ZONE) ================= */}
        {processState === 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">
                Kategori Berkas: {selectedCategory === 'cota' ? 'Dokumen Legalitas Calon Orang Tua' : 'Bukti Pembayaran / Transfer'}
              </span>
              <span className="text-slate-400">Format: JPG, PNG, PDF (Maks. 5MB)</span>
            </div>

            {/* Drag & Drop Card */}
            <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center relative cursor-pointer group">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center mb-3 transition shadow-inner">
                <Upload size={30} className="group-hover:-translate-y-1 transition-transform" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Pilih atau Tarik Berkas ke Sini
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Unggah scan foto <strong>{selectedCategory === 'cota' ? 'KTP / Kartu Keluarga / Akta Nikah' : 'Resi Transfer / Struk Bank'}</strong> Anda. AI akan langsung memvalidasi kecocokan data.
              </p>
              <div className="mt-4">
                <span className="inline-block bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition">
                  Pilih File dari Perangkat
                </span>
              </div>
            </div>

            {/* Quick Demo Sample Buttons */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Atau Coba Cepat dengan Sampel Dokumen AI:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedCategory === 'cota' ? (
                  <>
                    <button
                      onClick={() => triggerAiScan('DOC-COTA-KTP-001', 'KTP_Suami_Hendra_Pratama.jpg')}
                      className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left transition flex items-center justify-between"
                    >
                      <div>
                        <strong className="block text-emerald-950">Sampel KTP Valid (98.6% Akurasi)</strong>
                        <span className="text-[11px] text-emerald-700">Simulasi bacaan jelas &amp; lolos syarat usia</span>
                      </div>
                      <ArrowRight size={16} className="text-emerald-600 shrink-0" />
                    </button>
                    <button
                      onClick={() => triggerAiScan('DOC-COTA-KK-002', 'Akta_Buku_Nikah_Kemenag.jpg')}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition flex items-center justify-between"
                    >
                      <div>
                        <strong className="block text-amber-950">Sampel Akta Nikah (Ada Glare/Typo)</strong>
                        <span className="text-[11px] text-amber-700">Simulasi deteksi koreksi manual</span>
                      </div>
                      <ArrowRight size={16} className="text-amber-600 shrink-0" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => triggerAiScan('DOC-DONASI-TRF-101', 'Bukti_Transfer_BSI_2500000.png')}
                      className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left transition flex items-center justify-between"
                    >
                      <div>
                        <strong className="block text-emerald-950">Sampel Transfer BSI Sah (Rp 2.500.000)</strong>
                        <span className="text-[11px] text-emerald-700">Simulasi struk mobile banking jelas</span>
                      </div>
                      <ArrowRight size={16} className="text-emerald-600 shrink-0" />
                    </button>
                    <button
                      onClick={() => triggerAiScan('DOC-DONASI-TRF-102', 'Struk_ATM_Buram_Terpotong.jpg')}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-left transition flex items-center justify-between"
                    >
                      <div>
                        <strong className="block text-amber-950">Sampel Struk Buram / Terpotong (62%)</strong>
                        <span className="text-[11px] text-amber-700">Simulasi fallback notifikasi ramah Dinsos</span>
                      </div>
                      <ArrowRight size={16} className="text-amber-600 shrink-0" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. STATE: SCANNING ANIMATION ================= */}
        {processState === 'scanning' && (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6">
            {/* Visual Radar Scanning Graphic */}
            <div className="relative w-48 h-32 bg-slate-900 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl flex items-center justify-center">
              <FileText size={48} className="text-slate-600 opacity-60" />
              
              {/* Laser Line Moving Up and Down */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-[bounce_2s_infinite]" />

              <div className="absolute bottom-2 inset-x-0 text-center">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded">
                  AI OCR Scanner Active
                </span>
              </div>
            </div>

            {/* Status Text & Progress Bar */}
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-sm sm:text-base">
                <RefreshCw size={18} className="animate-spin text-blue-600" />
                <span>AI sedang membaca &amp; memvalidasi berkas...</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${SCAN_STEPS[scanStepIndex].progress}%` }}
                />
              </div>

              {/* Active Step Indicator */}
              <p className="text-xs text-slate-500 font-medium">
                {SCAN_STEPS[scanStepIndex].label}
              </p>

              <div className="text-[11px] text-slate-400 font-mono">
                Berkas: {uploadedFileName}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. STATE: COMPLETED ================= */}
        {processState === 'completed' && currentResult && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* ---------------- SCENARIO A: HIGH CONFIDENCE / SUKSES TERBACA ---------------- */}
            {isHighConfidence && (
              <div className="space-y-4">
                {/* Summary Card Grid */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText size={15} className="text-blue-600" />
                      Ringkasan Data Terdeteksi AI
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      File: {uploadedFileName}
                    </span>
                  </div>

                  {/* Field Summary Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedCategory === 'cota' ? (
                      <>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">NIK Pemohon</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {currentResult.hasil_ekstraksi_ai?.nik}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">Nama Lengkap</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {currentResult.hasil_ekstraksi_ai?.nama_lengkap}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">Tempat &amp; Tgl Lahir</span>
                          <span className="font-medium text-slate-800">
                            {currentResult.hasil_ekstraksi_ai?.tempat_lahir}, {currentResult.hasil_ekstraksi_ai?.tanggal_lahir}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">Usia Terdeteksi</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {currentResult.hasil_ekstraksi_ai?.usia} Tahun
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              ✓ Syarat Permensos Lolos (30-55 Thn)
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2">
                          <span className="text-slate-400 block text-[10px] font-semibold">Alamat KTP</span>
                          <span className="font-medium text-slate-800">
                            {currentResult.hasil_ekstraksi_ai?.alamat}, {currentResult.hasil_ekstraksi_ai?.kelurahan_desa}, {currentResult.hasil_ekstraksi_ai?.kecamatan}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">Nominal Terdeteksi</span>
                          <span className="font-bold text-teal-800 text-base">
                            {currentResult.hasil_ekstraksi_ai?.nominal_terformat}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-semibold">Bank Pengirim</span>
                          <span className="font-bold text-slate-900">
                            {currentResult.hasil_ekstraksi_ai?.bank_pengirim}
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2">
                          <span className="text-slate-400 block text-[10px] font-semibold">Rekening Dinsos Tujuan</span>
                          <span className="font-medium text-slate-800">
                            {currentResult.hasil_ekstraksi_ai?.nomor_rekening_tujuan} ({currentResult.hasil_ekstraksi_ai?.nama_penerima})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* User Confirmation Checkbox */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={isConfirmedByUser}
                      onChange={(e) => setIsConfirmedByUser(e.target.checked)}
                      className="mt-0.5 rounded accent-blue-600 w-4 h-4"
                    />
                    <span>
                      <strong>Konfirmasi Pemohon:</strong> Saya telah memeriksa ringkasan data di atas dan menyatakan bahwa pembacaan AI telah sesuai dengan kartu identitas / dokumen asli saya.
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="text-xs px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Ganti Dokumen
                  </button>

                  <button
                    onClick={() => {
                      if (!isConfirmedByUser) {
                        alert('Silakan centang kotak konfirmasi sebelum melanjutkan.');
                        return;
                      }
                      if (onFinalSubmit) onFinalSubmit(currentResult);
                      alert('Data ekstraksi AI berhasil disimpan! Melanjutkan ke tahapan berikutnya.');
                    }}
                    disabled={!isConfirmedByUser}
                    className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-md ${
                      isConfirmedByUser
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 ring-2 ring-blue-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Lanjut &amp; Simpan Data</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- SCENARIO B: GAMBAR BURAM / LOW CONFIDENCE FALLBACK ---------------- */}
            {isLowConfidence && (
              <div className="space-y-4">
                {/* Friendly Empathetic Warning Alert */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle size={22} />
                  </div>
                  <div className="text-xs flex-1">
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      Dokumen Kurang Jelas atau Terpotong
                    </h4>
                    <p className="text-amber-900 mt-1.5 leading-relaxed font-medium">
                      Dokumen kurang jelas atau terpotong. Anda tetap dapat melanjutkan, namun berkas akan ditinjau secara manual oleh petugas Dinsos.
                    </p>
                    <div className="mt-2.5 p-2 bg-amber-100/80 rounded-lg text-amber-950 border border-amber-200/80 text-[11px]">
                      <strong>Catatan Deteksi AI:</strong> {currentResult.catatan_ai}
                    </div>
                  </div>
                </div>

                {/* Detected Partial Preview */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Sebagian Data yang Sempat Terbaca:</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                      Skor Akurasi Rendah ({currentResult.skor_confidence}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(currentResult.hasil_ekstraksi_ai || {}).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">{k.replace(/_/g, ' ')}</span>
                        <span className="font-mono font-medium text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Two Clear Choices for the User */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto text-xs px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <RefreshCw size={14} />
                    <span>Unggah Ulang Foto yang Lebih Jelas (Direkomendasikan)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onFinalSubmit) onFinalSubmit(currentResult);
                      alert('Berkas Anda telah ditandai untuk Verifikasi Manual oleh Tim Dinsos. Melanjutkan...');
                    }}
                    className="w-full sm:w-auto text-xs px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>Tetap Lanjutkan (Verifikasi Manual Dinsos)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
