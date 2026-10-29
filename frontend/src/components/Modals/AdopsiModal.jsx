import React, { useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  UserCheck,
  Upload,
  Search,
  Sparkles,
  ShieldCheck,
  Clock,
  Building2,
  FileCheck,
  AlertTriangle,
  Calendar,
  Lock,
  ChevronRight,
  Heart,
  BadgeCheck,
  Bot
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { adopsiService } from '../../api';

// Berkas COTA bertipe: tiap jenis dokumen diunggah ke backend (Supabase) dan path aslinya
// dikirim ke pengajuan. Sebelumnya form mengirim path contoh (ktp_sample.jpg) tanpa unggahan.
const REQUIRED_DOC_SLOTS = [
  ['ktp', 'KTP Pemohon (Suami/Istri)'],
  ['kk', 'Kartu Keluarga (KK)'],
  ['akta_kelahiran', 'Akta Kelahiran'],
  ['buku_nikah', 'Buku / Akta Nikah'],
  ['skck', 'SKCK Kepolisian'],
  ['surat_sehat', 'Surat Keterangan Sehat (Jasmani, Jiwa & Bebas Narkoba)'],
];

const OPTIONAL_DOC_SLOTS = [
  ['surat_penghasilan', 'Surat Penghasilan / Slip Gaji'],
  ['surat_kesehatan_jiwa', 'Surat Kesehatan Jiwa'],
  ['pernyataan_resmi', 'Surat Pernyataan Resmi'],
];

function UploadSlot({ label, file, required, onPick, onClear }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0b1f5c' }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {file ? (
          <>
            <span title={file.name} style={{ fontSize: '0.75rem', color: '#334155', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📄 {file.name}
            </span>
            <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              Siap diunggah
            </span>
            <button type="button" onClick={onClear} style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
              Hapus
            </button>
          </>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Belum dipilih</span>
        )}
        <label style={{ background: '#1d4ed8', color: '#ffffff', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
          {file ? 'Ganti' : '+ Pilih File'}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={onPick} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}

export default function AdopsiModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Active Tab: 'panduan' | 'kelayakan' | 'formulir' | 'lacak'
  const [activeTab, setActiveTab] = useState('panduan');

  // -------------------------------------------------------------------
  // STATE TAB 2: ELIGIBILITY CHECKER (FILTER AUTOMATION)
  // -------------------------------------------------------------------
  const [usiamin, setUsiamin] = useState(32);
  const [lamaMenikah, setLamaMenikah] = useState(6);
  const [jumlahAnak, setJumlahAnak] = useState(0);
  const [adaPersetujuan, setAdaPersetujuan] = useState('ya');
  const [adaSuratMedis, setAdaSuratMedis] = useState('ya');

  // Eligibility evaluation logic (PRD Sec 3.2: 30-55 y/o, menikah >= 5 thn)
  const isUsiaValid = usiamin >= 30 && usiamin <= 55;
  const isMenikahValid = lamaMenikah >= 5;
  const isAnakValid = jumlahAnak <= 1;
  const isOverallEligible = isUsiaValid && isMenikahValid && isAnakValid && adaPersetujuan === 'ya' && adaSuratMedis === 'ya';

  // -------------------------------------------------------------------
  // STATE TAB 3: FORMULIR PENGAJUAN COTA (PROFILING & UPLOADS)
  // -------------------------------------------------------------------
  const [formData, setFormData] = useState({
    namaSuami: '',
    namaIstri: '',
    nikSuami: '',
    nikIstri: '',
    noWa: '',
    email: '',
    pekerjaan: '',
    penghasilan: 'Rp 10.000.000 - Rp 20.000.000',
    alamat: '',
    kecamatan: 'Kec. Cibinong',
    pantiTujuan: 'Panti Balita Tunas Bangsa',
    tanggalLahirSuami: '',
    tanggalPernikahan: ''
  });

  // File asli per jenis dokumen (dikirim ke backend saat submit)
  const [docFiles, setDocFiles] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Dokumen harus kosong saat formulir pertama kali dibuka
  const [uploadedDocs, setUploadedDocs] = useState({
    identitas: [],
    medis: [],
    finansial: [],
    pernyataan: [],
    tambahan: []
  });

  // AI belum memproses dokumen apa pun
  const [aiStatus, setAiStatus] = useState({
    processing: false,
    extractedName: '',
    ocrConfidence: null,
    statusMessage: 'Belum ada dokumen yang diunggah.'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // -------------------------------------------------------------------
  // STATE TAB 4: TRACKING TICKET STATUS
  // -------------------------------------------------------------------
  const [searchTicketCode, setSearchTicketCode] = useState('PIPA-2024-012');
  const [activeTrackingResult, setActiveTrackingResult] = useState({
    id: 'PIPA-2024-012',
    applicant: 'Bpk. Hendra & Ibu Siska',
    targetChild: 'Ahmad Faiz (3 Thn)',
    originPanti: 'Panti Balita Tunas Bangsa',
    dateSubmitted: '02 Oktober 2024',
    currentStepIndex: 3, // 1 to 5
    statusLabel: 'Sidang Rekomendasi Tim PIPA Dinsos',
    peksosAssigned: 'Ns. Ratna Juwita, S.Tr.Sos (Peksos Utama)',
    notes: 'Home Visit & Asesmen Kesediaan Keluarga telah lolos dengan skor Sangat Layak. Saat ini menunggu keputusan Sidang Tim PIPA Dinsos.'
  });

  // Sample database tickets for tracking demo
  const sampleTickets = {
    'PIPA-2024-012': {
      id: 'PIPA-2024-012',
      applicant: 'Bpk. Hendra & Ibu Siska',
      targetChild: 'Ahmad Faiz (3 Thn)',
      originPanti: 'Panti Balita Tunas Bangsa',
      dateSubmitted: '02 Oktober 2024',
      currentStepIndex: 3,
      statusLabel: 'Verifikasi Sidang PIPA Dinsos',
      peksosAssigned: 'Dra. Endang Wulandari (Peksos Dinsos)',
      notes: 'Berkas administrasi & laporan Home Visit telah diverifikasi lengkap. Tinggal pelaksanaan Sidang Rekomendasi PIPA.'
    },
    'PIPA-2024-009': {
      id: 'PIPA-2024-009',
      applicant: 'Bpk. Dr. Ridwan & Ibu Elena',
      targetChild: 'Siti Nurhaliza (6 Thn)',
      originPanti: 'LKSA Kasih Bunda Mandiri',
      dateSubmitted: '15 September 2024',
      currentStepIndex: 5,
      statusLabel: 'SK Pengangkatan Anak Terbit (Disetujui Resmi)',
      peksosAssigned: 'Bpk. Sugeng Rahardjo, M.Si',
      notes: 'Penetapan Pengadilan Negeri telah terbit. Proses adopsi legal COTA dinyatakan Selesai & Sah secara Hukum Negara.'
    }
  };

  const handleFileUpload = async (categoryKey, event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Validasi file sebelum ditambahkan ke daftar
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    const validFiles = files.filter((file) => {
      const validType = allowedTypes.includes(file.type);
      const validSize = file.size <= 10 * 1024 * 1024;

      if (!validType || !validSize) {
        alert(
          `${file.name}: format harus PDF/JPG/PNG dan ukuran maksimal 10 MB.`
        );
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    // Tampilkan status unggahan, bukan klaim sudah terverifikasi
    const newDocs = validFiles.map((file) => ({
      name: file.name,
      status: 'Menunggu verifikasi',
      confidence: null
    }));

    setUploadedDocs((prev) => ({
      ...prev,
      [categoryKey]: [...prev[categoryKey], ...newDocs]
    }));

    setAiStatus({
      processing: false,
      extractedName: '',
      ocrConfidence: null,
      statusMessage:
        'Dokumen berhasil dipilih. Hasil verifikasi AI belum tersedia.'
    });

    // Reset agar file yang sama dapat dipilih kembali
    event.target.value = '';
  };

  const handleSlotFile = (key, event) => {
    const file = (event.target.files || [])[0];
    event.target.value = '';
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const validType = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || ['pdf', 'jpg', 'jpeg', 'png'].includes(ext);
    if (!validType || file.size > 10 * 1024 * 1024) {
      alert(`${file.name}: format harus PDF/JPG/PNG dan ukuran maksimal 10 MB.`);
      return;
    }

    const next = { ...docFiles, [key]: file };
    setDocFiles(next);
    setSubmitError('');
    const ready = REQUIRED_DOC_SLOTS.filter(([k]) => next[k]).length;
    setAiStatus({
      processing: false,
      extractedName: '',
      ocrConfidence: null,
      statusMessage: `${ready} dari ${REQUIRED_DOC_SLOTS.length} berkas wajib sudah dipilih. AI membaca berkas setelah pengajuan dikirim.`
    });
  };

  const clearSlotFile = (key) => {
    setDocFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.namaSuami || !formData.namaIstri || !formData.noWa) {
      alert('Mohon lengkapi Nama Suami, Nama Istri, dan Nomor WhatsApp aktif!');
      return;
    }
    if (!formData.tanggalLahirSuami || !formData.tanggalPernikahan) {
      setSubmitError('Isi tanggal lahir suami dan tanggal pernikahan sesuai KTP / buku nikah.');
      return;
    }
    const missing = REQUIRED_DOC_SLOTS.filter(([key]) => !docFiles[key]).map(([, label]) => label);
    if (missing.length > 0) {
      setSubmitError(`Berkas wajib belum dipilih: ${missing.join(', ')}.`);
      return;
    }

    setIsSubmitting(true);

    let generatedTicket = '';

    try {
      // 1) Unggah berkas asli ke backend (Supabase Storage) dan ambil path-nya
      const ktpKk = await adopsiService.uploadKtpDanKk(docFiles.ktp, docFiles.kk);
      if (!ktpKk?.dokumen_ktp || !ktpKk?.dokumen_kk) {
        throw new Error('Server tidak mengembalikan path KTP/KK. Berkas belum tersimpan.');
      }

      const awal = await adopsiService.uploadDokumenAwal({
        aktaKelahiran: docFiles.akta_kelahiran,
        bukuNikah: docFiles.buku_nikah,
        skck: docFiles.skck,
        suratSehat: docFiles.surat_sehat
      });
      const dokumenPendukung = { ...(awal?.dokumen_pendukung || {}) };

      for (const [key] of OPTIONAL_DOC_SLOTS) {
        if (docFiles[key]) {
          const extra = await adopsiService.uploadDokumenTambahan(key, docFiles[key]);
          if (extra?.file) dokumenPendukung[key] = extra.file;
        }
      }

      // 2) Kirim pengajuan dengan path berkas yang benar-benar ada
      const payload = {
        nik_pemohon: formData.nikSuami,
        nama_pemohon: `${formData.namaSuami} & ${formData.namaIstri}`,
        tanggal_lahir_pemohon: formData.tanggalLahirSuami,
        tanggal_pernikahan: formData.tanggalPernikahan,
        nomor_kontak: formData.noWa,
        alamat: `${formData.alamat}, ${formData.kecamatan}`,
        panti_id: 1,
        status_pernikahan: 'menikah',
        lama_menikah_tahun: lamaMenikah,
        alasan_adopsi: `Permohonan resmi pengangkatan anak melalui HaloKids Dinsos untuk ${formData.pantiTujuan}`,
        dokumen_ktp: ktpKk.dokumen_ktp,
        dokumen_kk: ktpKk.dokumen_kk,
        dokumen_pendukung: dokumenPendukung
      };
      const apiRes = await adopsiService.submitAdopsi(payload);
      if (!apiRes?.id) {
        throw new Error('Server tidak mengembalikan nomor pengajuan.');
      }
      generatedTicket = `PIPA-2024-${apiRes.id}`;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('halokids:data_updated', { detail: { type: 'adopsi' } }));
      }
    } catch (apiErr) {
      // Jangan pura-pura sukses: tampilkan penyebab sebenarnya kepada pemohon.
      const eligibilityErrors = apiErr?.response?.data?.detail?.eligibility?.errors;
      setSubmitError(
        Array.isArray(eligibilityErrors) && eligibilityErrors.length > 0
          ? `Belum memenuhi syarat awal: ${eligibilityErrors.join(' ')}`
          : apiErr?.friendlyMessage || apiErr?.message || 'Pengajuan gagal dikirim. Coba lagi.'
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setSubmittedTicket(generatedTicket);

    // Trigger Confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err) { }

    // Auto update tracking view to show newly created ticket
    setActiveTrackingResult({
      id: generatedTicket,
      applicant: `Bpk. ${formData.namaSuami} & Ibu ${formData.namaIstri}`,
      targetChild: 'Calon Anak Asuh (Pilihan ' + formData.pantiTujuan + ')',
      originPanti: formData.pantiTujuan,
      dateSubmitted: 'Hari ini (Terkirim ke Dinsos)',
      currentStepIndex: 1,
      statusLabel: 'Diajukan / Menunggu Verifikasi AI & Berkas Dinsos',
      peksosAssigned: 'Tim Peksos Dinsos Kabupaten (Dalam Penugasan)',
      notes: 'Permohonan COTA resmi telah berhasil dikirim. AI Agent sedang memvalidasi kesesuaian berkas dengan database Dinsos.'
    });
  };

  const handleSearchTicket = (e) => {
    e.preventDefault();
    const cleanCode = searchTicketCode.trim().toUpperCase();
    if (sampleTickets[cleanCode]) {
      setActiveTrackingResult(sampleTickets[cleanCode]);
    } else {
      setActiveTrackingResult({
        id: cleanCode,
        applicant: 'Bpk. Wahyu & Ibu Pertiwi',
        targetChild: 'Anak Asuh Panti Balita',
        originPanti: 'Panti Balita Tunas Bangsa',
        dateSubmitted: '05 Oktober 2024',
        currentStepIndex: 2,
        statusLabel: 'Home Visit & Asesmen Peksos',
        peksosAssigned: 'Ns. Ratna Juwita, S.Tr.Sos',
        notes: 'Berkas pendaftaran awal terverifikasi. Tim Peksos dijadwalkan melakukan kunjungan ke rumah pemohon minggu ini.'
      });
    }
  };

  const syaratUtama = [
    "Berusia minimal 30 (tiga puluh) tahun dan maksimal 55 (lima puluh lima) tahun.",
    "Berstatus menikah sah secara hukum sekurang-kurangnya 5 (lima) tahun.",
    "Tidak atau belum mempunyai anak atau hanya memiliki 1 (satu) orang anak.",
    "Memperoleh persetujuan tertulis dari suami/istri secara syah.",
    "Surat Keterangan Kesehatan Jiwa & Bebas Narkoba dari Dokter Rumah Sakit Pemerintah.",
    "Surat Keterangan Kemampuan Ekonomi dari instansi/pekerjaan resmi & SKCK Kepolisian."
  ];

  const tahapanAdopsiList = [
    { step: "1", title: "Masukan Data Terstruktur & Profiling COTA", desc: "Pemohon mengisi formulir profiling data diri dan melakukan upload 5 kategori dokumen fisik." },
    { step: "2", title: "Validasi AI OCR & Verifikasi Dinsos", desc: "Sistem Single-Agent AI melakukan OCR & NLP ekstraksi berkas, diikuti verifikasi manual Admin Dinsos." },
    { step: "3", title: "Home Visit & Assesment Peksos", desc: "Pekerja Sosial Profesional (Peksos) melakukan kunjungan ke rumah pemohon untuk asesmen kesiapan keluarga." },
    { step: "4", title: "Sidang Rekomendasi Tim PIPA", desc: "Sidang Tim Pertimbangan Perizinan Pengangkatan Anak (PIPA) menerbitkan izin pengasuhan sementara." },
    { step: "5", title: "Pengasuhan Sementara & Penetapan Pengadilan", desc: "Masa uji coba pengasuhan 6 bulan dilanjutkan penetapan sah Pengadilan Negeri." }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(11, 31, 92, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '980px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Header Modal */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Heart size={24} color="#60a5fa" fill="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Modul Adopsi Resmi (Alur COTA)
                </h3>
                <span style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '20px'
                }}>
                  PERMENSOS RI
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#bfdbfe', margin: 0, marginTop: '2px' }}>
                Sistem Informasi Pengajuan &amp; Verifikasi Legalitas Orang Tua Angkat Dinas Sosial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Multi-Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1.25rem',
          gap: '0.65rem',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('panduan')}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: activeTab === 'panduan' ? '1px solid #bfdbfe' : '1px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'panduan' ? '#ffffff' : 'transparent',
              color: activeTab === 'panduan' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'panduan' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <FileText size={18} /> 1. Panduan &amp; Syarat
          </button>

          <button
            onClick={() => setActiveTab('kelayakan')}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: activeTab === 'kelayakan' ? '1px solid #fde68a' : '1px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'kelayakan' ? '#ffffff' : 'transparent',
              color: activeTab === 'kelayakan' ? '#b45309' : '#64748b',
              boxShadow: activeTab === 'kelayakan' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Sparkles size={18} color={activeTab === 'kelayakan' ? '#d97706' : '#94a3b8'} /> 2. Cek Kelayakan (Filter)
          </button>

          <button
            onClick={() => setActiveTab('formulir')}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: activeTab === 'formulir' ? '1px solid #bfdbfe' : '1px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'formulir' ? '#ffffff' : 'transparent',
              color: activeTab === 'formulir' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'formulir' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <UserCheck size={18} /> 3. Formulir Pengajuan COTA
          </button>

          <button
            onClick={() => setActiveTab('lacak')}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '12px',
              border: activeTab === 'lacak' ? '1px solid #bfdbfe' : '1px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: activeTab === 'lacak' ? '#ffffff' : 'transparent',
              color: activeTab === 'lacak' ? '#1d4ed8' : '#64748b',
              boxShadow: activeTab === 'lacak' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Search size={18} /> 4. Lacak Status Pengajuan
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          background: '#f8fafc'
        }}>

          {/* =================================================================== */}
          {/* TAB 1: PANDUAN & PROSEDUR ADOPSI                                    */}
          {/* =================================================================== */}
          {activeTab === 'panduan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Box Info Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <ShieldCheck size={28} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', margin: 0 }}>
                    Alur Resmi Pengangkatan Anak (COTA) Berdasarkan Permensos No. 110/HUK/2009
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#1e3a8a', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                    Setiap proses adopsi anak wajib melalui pengawasan resmi Dinas Sosial dan penetapan Pengadilan Negeri untuk menjamin keabsahan hukum serta kepentingan terbaik bagi tumbuh kembang anak.
                  </p>
                </div>
              </div>

              {/* Syarat Utama Checklist */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="#1d4ed8" /> Persyaratan Legalitas COTA (Calon Orang Tua Angkat)
                </h4>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  gap: '0.85rem'
                }}>
                  {syaratUtama.map((syarat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}>
                      <span style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        marginTop: '1px'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ lineHeight: 1.4 }}>{syarat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5 Tahapan Prosedur */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.85rem' }}>
                  5 Tahapan Prosedur Legalitas Adopsi Resmi:
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {tahapanAdopsiList.map((item) => (
                    <div
                      key={item.step}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '1rem',
                        alignItems: 'flex-start',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{
                        background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        flexShrink: 0,
                        boxShadow: '0 3px 6px rgba(29,78,216,0.3)'
                      }}>
                        {item.step}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#0b1f5c', display: 'block', marginBottom: '2px' }}>
                          {item.title}
                        </strong>
                        <span style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning Notice Box */}
              <div style={{
                background: '#fffbebf5',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.825rem',
                color: '#92400e',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Peringatan Hukum:</strong> Adopsi anak secara ilegal tanpa rekomendasi Tim PIPA Dinsos &amp; Penetapan Pengadilan Negeri dapat diancam sanksi pidana berdasarkan Undang-Undang Perlindungan Anak.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setActiveTab('kelayakan')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  Mulai Cek Kelayakan COTA <ArrowRight size={18} />
                </button>
              </div>

            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: ELEIGIBILITY CHECKER (FILTER AUTOMATION REQ #3.2)             */}
          {/* =================================================================== */}
          {activeTab === 'kelayakan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="#d97706" /> Filter Kelayakan Otomatis Syarat Hukum COTA
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, marginBottom: '1.25rem' }}>
                  Sistem akan menguji kelayakan awal data Anda sesuai dengan ketentuan syarat usia dan pernikahan legal Republik Indonesia.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

                  {/* Field 1: Usia Pemohon */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Usia Pemohon Termuda (Suami/Istri):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        value={usiamin}
                        onChange={(e) => setUsiamin(Number(e.target.value))}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${isUsiaValid ? '#cbd5e1' : '#fca5a5'}`,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          width: '100px',
                          background: isUsiaValid ? '#ffffff' : '#fef2f2'
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tahun (Syarat: 30 - 55 Thn)</span>
                    </div>
                  </div>

                  {/* Field 2: Lama Menikah */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Lama Pernikahan Sah Hukum:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        value={lamaMenikah}
                        onChange={(e) => setLamaMenikah(Number(e.target.value))}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: `1px solid ${isMenikahValid ? '#cbd5e1' : '#fca5a5'}`,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          width: '100px',
                          background: isMenikahValid ? '#ffffff' : '#fef2f2'
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tahun (Syarat: Minimal 5 Thn)</span>
                    </div>
                  </div>

                  {/* Field 3: Jumlah Anak */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Jumlah Anak Kandung/Angkat Saat Ini:
                    </label>
                    <input
                      type="number"
                      value={jumlahAnak}
                      onChange={(e) => setJumlahAnak(Number(e.target.value))}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${isAnakValid ? '#cbd5e1' : '#fca5a5'}`,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        width: '100%',
                        background: isAnakValid ? '#ffffff' : '#fef2f2'
                      }}
                    />
                  </div>

                  {/* Field 4: Persetujuan Suami Istri */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Persetujuan Tertulis Suami &amp; Istri:
                    </label>
                    <select
                      value={adaPersetujuan}
                      onChange={(e) => setAdaPersetujuan(e.target.value)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        width: '100%',
                        background: '#ffffff'
                      }}
                    >
                      <option value="ya">Ya, Ada Persetujuan Tertulis Kedua Belah Pihak</option>
                      <option value="tidak">Belum Ada Persetujuan Tertulis</option>
                    </select>
                  </div>

                </div>

                {/* Live Real-time Evaluation Result Card */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: `2px solid ${isOverallEligible ? '#22c55e' : '#ef4444'}`,
                  background: isOverallEligible ? '#f0fdf4' : '#fef2f2',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  {isOverallEligible ? (
                    <BadgeCheck size={32} color="#16a34a" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={32} color="#dc2626" style={{ flexShrink: 0 }} />
                  )}

                  <div>
                    <h5 style={{ fontSize: '1rem', fontWeight: 800, color: isOverallEligible ? '#15803d' : '#b91c1c', margin: 0 }}>
                      {isOverallEligible
                        ? '🟢 LOLOS FILTER KELAYAKAN AWAL COTA (Dapat Melanjutkan Pendaftaran)'
                        : '🔴 BELUM MEMENUHI KELAYAKAN HUKUM AWAL COTA'}
                    </h5>

                    <p style={{ fontSize: '0.85rem', color: isOverallEligible ? '#166534' : '#991b1b', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      {isOverallEligible
                        ? 'Kriteria usia pemohon, durasi pernikahan, serta kesepakatan tertulis telah sesuai dengan syarat Peraturan Menteri Sosial RI. Silakan isi Formulir Pengajuan COTA Resmi.'
                        : 'Terdapat kriteria yang belum sesuai: ' +
                        (!isUsiaValid ? 'Usia wajib 30-55 thn; ' : '') +
                        (!isMenikahValid ? 'Usia pernikahan wajib minimal 5 thn; ' : '') +
                        (!isAnakValid ? 'Maksimal memiliki 1 anak; ' : '') +
                        (adaPersetujuan !== 'ya' ? 'Memerlukan persetujuan tertulis suami/istri; ' : '')
                      }
                    </p>

                    {isOverallEligible && (
                      <button
                        onClick={() => setActiveTab('formulir')}
                        className="btn btn-primary"
                        style={{ marginTop: '0.85rem', padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        Lanjut ke Formulir Pengajuan COTA <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: FORMULIR PENGAJUAN COTA (PROFILING & 5 UPLOAD CATEGORIES)     */}
          {/* =================================================================== */}
          {activeTab === 'formulir' && (
            <div>
              {submittedTicket ? (
                /* Success Screen After Submit */
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #22c55e',
                  borderRadius: '16px',
                  padding: '2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={36} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Permohonan Adopsi COTA Resmi Berhasil Terkirim!
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                      Berkas Anda telah masuk ke Sistem Informasi Dinsos dan dikualifikasi oleh AI OCR Agent.
                    </p>
                  </div>

                  {/* Ticket Code Box */}
                  <div style={{
                    background: '#eff6ff',
                    border: '2px dashed #3b82f6',
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    margin: '0.5rem 0'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                      Nomor Tiket Registrasi PIPA / COTA:
                    </span>
                    <strong style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0b1f5c', letterSpacing: '0.05em' }}>
                      {submittedTicket}
                    </strong>
                  </div>

                  <p style={{ fontSize: '0.825rem', color: '#475569', maxWidth: '540px' }}>
                    Gunakan Kode Tiket di atas untuk melacak perkembangan hasil evaluasi Pekerja Sosial &amp; jadwal Home Visit melalui tab <strong>"Lacak Status Pengajuan"</strong>.
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
                    <button
                      onClick={() => {
                        setSearchTicketCode(submittedTicket);
                        setActiveTab('lacak');
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.75rem', fontWeight: 700 }}
                    >
                      <Search size={16} /> Lacak Progres COTA Sekarang
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Form */
                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Section 1: Data Profil COTA */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={18} color="#1d4ed8" /> Bagian 1: Profil Pasangan Suami &amp; Istri Pemohon
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Nama Lengkap Suami: *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Budi Santoso"
                          value={formData.namaSuami}
                          onChange={(e) => setFormData({ ...formData, namaSuami: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Nama Lengkap Istri: *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Siti Rahmawati"
                          value={formData.namaIstri}
                          onChange={(e) => setFormData({ ...formData, namaIstri: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          NIK KTP Suami:
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: 320101xxxxxxxxxx (16 digit)"
                          value={formData.nikSuami}
                          onChange={(e) => setFormData({ ...formData, nikSuami: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Tanggal Lahir Suami (sesuai KTP): *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.tanggalLahirSuami}
                          onChange={(e) => setFormData({ ...formData, tanggalLahirSuami: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Tanggal Pernikahan (sesuai buku nikah): *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.tanggalPernikahan}
                          onChange={(e) => setFormData({ ...formData, tanggalPernikahan: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          No. WhatsApp Aktif (Notifikasi Status): *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 081234567890"
                          value={formData.noWa}
                          onChange={(e) => setFormData({ ...formData, noWa: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Kecamatan Domisili Pemohon:
                        </label>
                        <select
                          value={formData.kecamatan}
                          onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                        >
                          <option value="Kec. Cibinong">Kec. Cibinong</option>
                          <option value="Kec. Cileungsi">Kec. Cileungsi</option>
                          <option value="Kec. Gunung Putri">Kec. Gunung Putri</option>
                          <option value="Kec. Ciawi">Kec. Ciawi</option>
                          <option value="Kec. Parung">Kec. Parung</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Pilihan Panti Asuhan / Lembaga Asal:
                        </label>
                        <select
                          value={formData.pantiTujuan}
                          onChange={(e) => setFormData({ ...formData, pantiTujuan: e.target.value })}
                          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                        >
                          <option value="Panti Balita Tunas Bangsa">Panti Balita Tunas Bangsa (Cibinong)</option>
                          <option value="LKSA Kasih Bunda Mandiri">LKSA Kasih Bunda Mandiri (Cibinong)</option>
                          <option value="Yayasan Mutiara Kasih">Yayasan Mutiara Kasih (Gunung Putri)</option>
                          <option value="LKSA Nurul Hidayah">LKSA Nurul Hidayah (Cileungsi)</option>
                          <option value="Rekomendasi Langsung Dinsos">Rekomendasi Terbuka Dinsos Kabupaten</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Section 2: Upload Berkas Dokumen (per jenis, dikirim ke Supabase saat submit) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={18} color="#1d4ed8" /> Bagian 2: Unggah Berkas Persyaratan
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginBottom: '1rem' }}>
                      Format PDF, JPG, atau PNG (maks. 10 MB per berkas). Setiap jenis berkas dipilih satu per satu agar AI dan petugas Dinsos dapat memeriksanya dengan tepat.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {REQUIRED_DOC_SLOTS.map(([key, label]) => (
                        <UploadSlot
                          key={key}
                          label={label}
                          required
                          file={docFiles[key]}
                          onPick={(event) => handleSlotFile(key, event)}
                          onClear={() => clearSlotFile(key)}
                        />
                      ))}
                    </div>

                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', margin: '1rem 0 0.4rem' }}>
                      Berkas tambahan (opsional, bisa menyusul)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {OPTIONAL_DOC_SLOTS.map(([key, label]) => (
                        <UploadSlot
                          key={key}
                          label={label}
                          file={docFiles[key]}
                          onPick={(event) => handleSlotFile(key, event)}
                          onClear={() => clearSlotFile(key)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* AI Agentic Inspection Box (PRD Sec 5.3) */}
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem'
                    }}
                  >
                    <Bot size={28} color="#2563eb" />

                    <div>
                      <strong style={{ color: '#1d4ed8', fontSize: '0.85rem' }}>
                        Status Verifikasi Dokumen
                      </strong>

                      <p style={{ color: '#1e40af', fontSize: '0.8rem', marginBottom: 0 }}>
                        {aiStatus.statusMessage}
                      </p>
                    </div>
                  </div>
                  {submitError && (
                    <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ padding: '0.9rem', fontSize: '1rem', fontWeight: 800, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isSubmitting ? (
                      <>Mengirim &amp; Memproses Berkas AI...</>
                    ) : (
                      <>Kirim Permohonan Adopsi Resmi COTA <FileCheck size={20} /></>
                    )}
                  </button>

                </form>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: LACAK STATUS PENGAJUAN COTA (TRACKING PIPELINE)               */}
          {/* =================================================================== */}
          {activeTab === 'lacak' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Search Form */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.75rem' }}>
                  Lacak Progres Status Pengajuan Adopsi COTA
                </h4>

                <form onSubmit={handleSearchTicket} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={searchTicketCode}
                    onChange={(e) => setSearchTicketCode(e.target.value)}
                    placeholder="Contoh: PIPA-2024-012"
                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>
                    <Search size={18} /> Cari Tiket
                  </button>
                </form>

                {/* Sample Preset Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Contoh Tiket Demo:</span>
                  <button
                    onClick={() => { setSearchTicketCode('PIPA-2024-012'); setActiveTrackingResult(sampleTickets['PIPA-2024-012']); }}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    PIPA-2024-012 (Verifikasi PIPA)
                  </button>
                  <button
                    onClick={() => { setSearchTicketCode('PIPA-2024-009'); setActiveTrackingResult(sampleTickets['PIPA-2024-009']); }}
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    PIPA-2024-009 (SK Terbit/Disetujui)
                  </button>
                </div>
              </div>

              {/* Status Tracking Pipeline Result Card */}
              {activeTrackingResult && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>

                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Nomor Registrasi COTA
                      </span>
                      <h4 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0b1f5c', margin: 0 }}>
                        {activeTrackingResult.id}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: '2px 0 0 0', fontWeight: 700 }}>
                        Pemohon: {activeTrackingResult.applicant}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        background: activeTrackingResult.currentStepIndex === 5 ? '#dcfce7' : '#dbeafe',
                        color: activeTrackingResult.currentStepIndex === 5 ? '#15803d' : '#1e40af',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '20px',
                        display: 'inline-block'
                      }}>
                        {activeTrackingResult.statusLabel}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                        Tgl Pengajuan: {activeTrackingResult.dateSubmitted}
                      </span>
                    </div>
                  </div>

                  {/* 5-Step Visual Progress Bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '0.75rem' }}>
                      Tahapan Alur Pengurusan &amp; Status Terkini:
                    </h5>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2 text-center">
                      {[
                        { step: 1, title: "Diajukan" },
                        { step: 2, title: "Verifikasi AI & Berkas" },
                        { step: 3, title: "Home Visit Peksos" },
                        { step: 4, title: "Sidang Tim PIPA" },
                        { step: 5, title: "SK Penetapan Sah" }
                      ].map((s) => {
                        const isDone = s.step < activeTrackingResult.currentStepIndex;
                        const isCurrent = s.step === activeTrackingResult.currentStepIndex;
                        return (
                          <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isDone ? '#22c55e' : isCurrent ? '#1d4ed8' : '#e2e8f0',
                              color: isDone || isCurrent ? '#ffffff' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              boxShadow: isCurrent ? '0 0 0 4px rgba(29,78,216,0.2)' : 'none'
                            }}>
                              {isDone ? <CheckCircle2 size={18} /> : s.step}
                            </div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: isCurrent ? 800 : 500,
                              color: isCurrent ? '#1d4ed8' : '#64748b'
                            }}>
                              {s.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detail Info Box */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Target Anak / Panti Asuhan:</strong>
                        <span style={{ color: '#0b1f5c', fontWeight: 700 }}>{activeTrackingResult.targetChild}</span> ({activeTrackingResult.originPanti})
                      </div>
                      <div>
                        <strong style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Peksos Penanggung Jawab:</strong>
                        <span style={{ color: '#0b1f5c', fontWeight: 700 }}>{activeTrackingResult.peksosAssigned}</span>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.65rem' }}>
                      <strong style={{ color: '#334155', display: 'block', marginBottom: '2px' }}>Catatan Evaluasi Resmi Dinsos:</strong>
                      <p style={{ color: '#475569', margin: 0, lineHeight: 1.4 }}>
                        {activeTrackingResult.notes}
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '1rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
            <Lock size={14} color="#1d4ed8" />
            <span>Sistem Terenkripsi &amp; Terhubung dengan Dinas Sosial Kabupaten</span>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Tutup Windows
          </button>
        </div>

      </div>
    </div>
  );
}
