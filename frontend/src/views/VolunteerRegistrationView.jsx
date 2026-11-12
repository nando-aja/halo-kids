import React, { useEffect,useState } from 'react';
import pantiService from '../api/pantiService';
import {
  HeartHandshake,
  GraduationCap,
  Palette,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Footer from '../components/Footer';
import relawanService from '../api/relawanService';

export default function VolunteerRegistrationView({
  currentUser = null,
  onAddVolunteer
}) {
  // Form State
  const [nama, setNama] = useState(currentUser?.name || '');
  const [nomorHp, setNomorHp] = useState(currentUser?.phone || '');
  const [alamat, setAlamat] = useState('');
  const [usia, setUsia] = useState('');
  const [bidang, setBidang] = useState('Pendidikan / Tutor Belajar');
  const [pantiList, setPantiList] = useState([]);
  const [pantiId, setPantiId] = useState('');
  const [pantiLoading, setPantiLoading] = useState(true);
  const [pantiLoadError, setPantiLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [sesiWaktu, setSesiWaktu] = useState('Weekend Khusus (Sabtu & Minggu)');
  const [tujuanKerelawanan, setTujuanKerelawanan] = useState('');
  const [uploadedKtp, setUploadedKtp] = useState(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Validation state
  const [ageWarning, setAgeWarning] = useState('');
useEffect(() => {
  let isMounted = true;

  async function loadApprovedPanti() {
    setPantiLoading(true);
    setPantiLoadError('');

    try {
      const result = await pantiService.getPublicPantiList();

      if (!Array.isArray(result)) {
        throw new Error('Format daftar LKSA tidak valid.');
      }

      if (isMounted) {
        setPantiList(result);
        setPantiId(result.length > 0 ? String(result[0].id) : '');
      }
    } catch (error) {
      console.error('Gagal memuat daftar LKSA:', error);

      if (isMounted) {
        setPantiList([]);
        setPantiId('');
        setPantiLoadError(
          'Daftar LKSA tidak dapat dimuat. Silakan coba kembali.'
        );
      }
    } finally {
      if (isMounted) {
        setPantiLoading(false);
      }
    }
  }

  loadApprovedPanti();

  return () => {
    isMounted = false;
  };
}, []);

const selectedPanti = pantiList.find(
  (item) => String(item.id) === String(pantiId)
);

  const handleAgeChange = (val) => {
    setUsia(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num < 17) {
      setAgeWarning('Perhatian: Batas usia minimal relawan adalah 17 tahun untuk memastikan pendampingan anak yang mandiri dan aman.');
    } else {
      setAgeWarning('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedKtp({
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };


const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitError('');

  if (
    !nama.trim() ||
    !nomorHp.trim() ||
    !alamat.trim() ||
    !usia ||
    !tanggal ||
    !tujuanKerelawanan.trim()
  ) {
    setSubmitError('Lengkapi semua kolom wajib sebelum mengirim formulir.');
    return;
  }

  if (parseInt(usia, 10) < 17) {
    setSubmitError('Usia minimal relawan adalah 17 tahun.');
    return;
  }

  if (!selectedPanti) {
    setSubmitError('Pilih LKSA resmi yang tersedia.');
    return;
  }

  if (!uploadedKtp?.file) {
    setSubmitError('Unggah scan KTP atau KTM sebelum mengirim pendaftaran.');
    return;
  }

  setIsSubmitting(true);

  try {
    const uploadRes = await relawanService.uploadIdentitas(
      uploadedKtp.file
    );

    if (!uploadRes?.dokumen_identitas) {
      throw new Error('Dokumen identitas gagal diunggah.');
    }

    const res = await relawanService.registerRelawan({
      dokumen_identitas: uploadRes.dokumen_identitas,
      nama: nama.trim(),
      nomor_hp: nomorHp.trim(),
      alamat: alamat.trim(),
      usia: parseInt(usia, 10),
      bidang,
      panti_tujuan: selectedPanti.nama_panti,
      id_panti: Number(selectedPanti.id),
      tanggal,
      sesi_waktu: sesiWaktu,
      tujuan_kerelawanan: tujuanKerelawanan.trim(),
    });

    const newVolunteerData = {
      id: `VOL-${res.id}`,
      nama: res.nama,
      nomorHp: res.nomor_hp,
      alamat: res.alamat,
      usia: res.usia,
      bidang: res.bidang,
      pantiTujuan: res.panti_tujuan,
      tanggal: res.tanggal,
      sesiWaktu: res.sesi_waktu,
      tujuanKerelawanan: res.tujuan_kerelawanan,
      ktpFileName: uploadedKtp.name,
      ktpFileSize: uploadedKtp.size,
      status:
        res.status === 'disetujui'
          ? 'Disetujui'
          : res.status === 'ditolak'
          ? 'Ditolak'
          : 'Menunggu Persetujuan',
      submittedAt: 'Baru saja',
    };

    if (onAddVolunteer) {
      onAddVolunteer(newVolunteerData);
    }

    window.dispatchEvent(
      new CustomEvent('halokids:data_updated', {
        detail: { type: 'relawan' },
      })
    );

    setSubmittedTicket(newVolunteerData);
    triggerConfetti();

  } catch (error) {
    console.error('Pendaftaran relawan gagal:', error);

    setSubmitError(
      error?.response?.data?.detail ||
      error?.friendlyMessage ||
      error?.message ||
      'Pendaftaran gagal dikirim. Silakan periksa koneksi dan coba kembali.'
    );
  } finally {
    setIsSubmitting(false);
  }
};



const resetForm = () => {
  setNama('');
  setNomorHp('');
  setAlamat('');
  setUsia('');
  setBidang('Pendidikan / Tutor Belajar');

  // Reset pilihan LKSA ke pilihan pertama dari database.
  setPantiId(
    pantiList.length > 0 ? String(pantiList[0].id) : ''
  );

  setSubmitError('');
  setTanggal('');
  setSesiWaktu('Weekend Khusus (Sabtu & Minggu)');
  setTujuanKerelawanan('');
  setUploadedKtp(null);
  setIsAgreed(false);
  setSubmittedTicket(null);
};


  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Main Content Area - Full width with balanced responsive padding */}
      <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full" style={{ marginTop: '1.25rem', marginBottom: '3.5rem', flex: 1, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Page Main Banner Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0b1f5c 0%, #1e3a8a 60%, #1d4ed8 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem 2rem',
            color: '#ffffff',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <HeartHandshake size={32} color="#ffffff" />
              </div>

              <div>
                <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Formulir Pendaftaran Relawan (Volunteer) Sahabat Panti
                </h1>

                <p style={{ fontSize: '0.875rem', color: '#bfdbfe', margin: 0, maxWidth: '780px', lineHeight: 1.5 }}>
                  Baktikan waktu dan keahlian Anda untuk mendampingi anak-anak asuh di panti asuhan LKSA se-Kabupaten. Laporan pendaftaran diteruskan langsung ke Admin Panti untuk proses verifikasi dan persetujuan.
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* STEP 1: IDENTITAS DIRI & USIA */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{
                  background: '#0b1f5c',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  1
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                    Identitas Diri Calon Relawan
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Data kontak aktif untuk koordinasi jadwal kegiatan oleh pengurus panti</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {/* Nama */}
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <User size={15} color="#1d4ed8" /> Nama Lengkap Sesuai KTP/KTM *
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                  />
                </div>

                {/* Nomor HP */}
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <Phone size={15} color="#1d4ed8" /> Nomor WhatsApp Aktif *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomorHp}
                    onChange={(e) => setNomorHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                  />
                </div>

                {/* Usia (Minimal 17 Tahun) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ShieldCheck size={15} color="#1d4ed8" /> Usia Relawan (Tahun) *
                    </label>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '50px' }}>
                      Batas Min: 17 Thn
                    </span>
                  </div>
                  <input
                    type="number"
                    min="15"
                    max="80"
                    required
                    value={usia}
                    onChange={(e) => handleAgeChange(e.target.value)}
                    placeholder="Contoh: 21 (Minimal 17 tahun)"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: ageWarning ? '2px solid #ef4444' : '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                  />
                  {ageWarning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem', color: '#dc2626', fontSize: '0.725rem', fontWeight: 600 }}>
                      <AlertCircle size={14} />
                      <span>{ageWarning}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Alamat */}
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <MapPin size={15} color="#1d4ed8" /> Alamat Domisili / Tempat Tinggal *
                </label>
                <input
                  type="text"
                  required
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Pajajaran No. 45, Baranangsiang, Kota Bogor"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* STEP 2: BIDANG KERELAWANAN & PANTI TUJUAN */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{
                  background: '#0b1f5c',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  2
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                    Pilihan Bidang Kerelawanan &amp; Panti Asuhan Tujuan
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tentukan fokus kegiatan yang sesuai minat dan keahlian Anda</span>
                </div>
              </div>

              {/* Bidang Selector (2 Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Option 1: Pendidikan */}
                <div
                  onClick={() => setBidang('Pendidikan / Tutor Belajar')}
                  style={{
                    border: bidang === 'Pendidikan / Tutor Belajar' ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                    background: bidang === 'Pendidikan / Tutor Belajar' ? '#eff6ff' : '#ffffff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    boxShadow: bidang === 'Pendidikan / Tutor Belajar' ? '0 4px 12px rgba(29, 78, 216, 0.12)' : 'none'
                  }}
                >
                  <div style={{
                    background: bidang === 'Pendidikan / Tutor Belajar' ? '#1d4ed8' : '#e2e8f0',
                    color: bidang === 'Pendidikan / Tutor Belajar' ? '#ffffff' : '#64748b',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <GraduationCap size={24} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0b1f5c' }}>Pendidikan / Tutor Belajar</strong>
                      <input
                        type="radio"
                        name="bidangRadio"
                        checked={bidang === 'Pendidikan / Tutor Belajar'}
                        onChange={() => setBidang('Pendidikan / Tutor Belajar')}
                        style={{ accentColor: '#1d4ed8', width: '18px', height: '18px' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      Mendampingi bimbingan belajar anak SD/SMP/SMA, calistung untuk adik balita/usia dini, kursus bahasa asing (Inggris/Arab), dan pelatihan komputer dasar.
                    </p>
                    <span style={{ display: 'inline-block', marginTop: '0.5rem', background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      Kebutuhan Tinggi di Semua LKSA
                    </span>
                  </div>
                </div>

                {/* Option 2: Kesenian / Olahraga */}
                <div
                  onClick={() => setBidang('Kesenian / Olahraga')}
                  style={{
                    border: bidang === 'Kesenian / Olahraga' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: bidang === 'Kesenian / Olahraga' ? '#ecfdf5' : '#ffffff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    boxShadow: bidang === 'Kesenian / Olahraga' ? '0 4px 12px rgba(16, 185, 129, 0.12)' : 'none'
                  }}
                >
                  <div style={{
                    background: bidang === 'Kesenian / Olahraga' ? '#10b981' : '#e2e8f0',
                    color: bidang === 'Kesenian / Olahraga' ? '#ffffff' : '#64748b',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Palette size={24} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0b1f5c' }}>Kesenian / Olahraga</strong>
                      <input
                        type="radio"
                        name="bidangRadio"
                        checked={bidang === 'Kesenian / Olahraga'}
                        onChange={() => setBidang('Kesenian / Olahraga')}
                        style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      Kelas melukis, mewarnai, sanggar tari kreasi, musik &amp; gitar, latihan futsal/sepak bola, bulu tangkis, senam kebugaran, dan trauma healing anak.
                    </p>
                    <span style={{ display: 'inline-block', marginTop: '0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      Paling Disukai Anak-Anak Panti
                    </span>
                  </div>
                </div>
              </div>
{/* PILIHAN LKSA TUJUAN DARI BACKEND */}
<div>
  <label
    style={{
      fontSize: '0.825rem',
      fontWeight: 700,
      color: '#334155',
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      marginBottom: '0.4rem',
    }}
  >
    <Building2 size={15} color="#1d4ed8" />
    Pilihan Lembaga Panti Asuhan (LKSA) Tujuan *
  </label>

  <select
    required
    value={pantiId}
    disabled={pantiLoading || pantiList.length === 0}
    onChange={(e) => setPantiId(e.target.value)}
    style={{
      width: '100%',
      padding: '0.65rem 0.85rem',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      outline: 'none',
      fontSize: '0.875rem',
      background: '#ffffff',
    }}
  >
    <option value="">
      {pantiLoading
        ? 'Memuat daftar LKSA...'
        : 'Pilih LKSA tujuan'}
    </option>

    {pantiList.map((panti) => (
      <option key={panti.id} value={String(panti.id)}>
        {panti.nama_panti} — {panti.alamat || 'Alamat belum tersedia'}
      </option>
    ))}
  </select>

  {pantiLoadError && (
    <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
      {pantiLoadError}
    </p>
  )}

  {!pantiLoading && !pantiLoadError && pantiList.length === 0 && (
    <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
      Belum ada LKSA yang disetujui dan tersedia untuk tujuan relawan.
    </p>
  )}

  {submitError && (
    <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>
      {submitError}
    </p>
  )}
</div>
</div>

            {/* STEP 3: TANGGAL & WAKTU KEGIATAN */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{
                  background: '#0b1f5c',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  3
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                    Kapan Waktu &amp; Tanggal Ketersediaan Relawan
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tentukan tanggal mulai dan alokasi sesi waktu kedatangan Anda</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Tanggal */}
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <Calendar size={15} color="#1d4ed8" /> Tanggal Ketersediaan / Mulai Bertugas *
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    Pilih tanggal rencana Anda pertama kali hadir ke panti asuhan
                  </span>
                </div>

                {/* Sesi Waktu */}
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <Clock size={15} color="#1d4ed8" /> Pilihan Sesi Waktu *
                  </label>
                  <select
                    value={sesiWaktu}
                    onChange={(e) => setSesiWaktu(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', background: '#ffffff' }}
                  >
                    <option value="Pagi Hari (08.30 - 11.30 WIB)">Pagi Hari (08.30 - 11.30 WIB)</option>
                    <option value="Siang / Sore Hari (13.30 - 16.30 WIB)">Siang / Sore Hari (13.30 - 16.30 WIB)</option>
                    <option value="Weekend Khusus (Sabtu & Minggu)">Weekend Khusus (Sabtu &amp; Minggu)</option>
                    <option value="Fleksibel (Disesuaikan Dengan Kebutuhan Panti)">Fleksibel (Sesuai Kebutuhan Panti)</option>
                  </select>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                    Kegiatan belajar atau kesenian umumnya berlangsung 2 - 3 jam per sesi
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 4: MOTIVASI & UNGGAH SCAN KTP/KTM */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{
                  background: '#0b1f5c',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  4
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                    Penjelasan Singkat Tujuan &amp; Unggah Berkas KTP/KTM
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Dokumen resmi diperlukan untuk verifikasi identitas dan keamanan anak asuh</span>
                </div>
              </div>

              {/* Textarea Motivasi / Tujuan */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <FileText size={15} color="#1d4ed8" /> Penjelasan Singkat Tujuan &amp; Motivasi Kerelawanan *
                </label>
                <textarea
                  rows={4}
                  required
                  value={tujuanKerelawanan}
                  onChange={(e) => setTujuanKerelawanan(e.target.value)}
                  placeholder="Contoh: Saya ingin mengajar bimbingan belajar matematika & bahasa Inggris serta mendampingi kegiatan seni adik-adik asuh..."
                  style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              {/* File Upload Scan KTP / KTM */}
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <UploadCloud size={15} color="#1d4ed8" /> Unggah Scan / Foto KTP atau KTM (Kartu Tanda Mahasiswa) *
                </label>

                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  background: uploadedKtp ? '#f0fdf4' : '#f8fafc',
                  transition: 'background 0.2s',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    id="ktp-upload-input"
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />

                  {uploadedKtp ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                      <div style={{ background: '#dcfce7', color: '#15803d', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={28} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0b1f5c', display: 'block' }}>{uploadedKtp.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>Berkas Berhasil Diunggah ({uploadedKtp.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedKtp(null);
                        }}
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', zIndex: 2 }}
                      >
                        Ganti Berkas
                      </button>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
                      <strong style={{ fontSize: '0.9rem', color: '#0b1f5c', display: 'block', marginBottom: '0.25rem' }}>
                        Klik untuk Memilih File atau Tarik File ke Sini
                      </strong>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                        Mendukung format JPG, PNG, atau PDF (Ukuran maks: 5MB).
                      </p>
                      <span style={{ background: '#e0e7ff', color: '#1e40af', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '50px' }}>
                        KTP atau KTM bagi Mahasiswa
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checkbox Persetujuan & Tombol Kirim */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                marginBottom: '1.25rem'
              }}>
                <input
                  type="checkbox"
                  required
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#1d4ed8', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                  Saya menyatakan bahwa data yang diisikan adalah benar. Saya bersedia menaati tata tertib panti asuhan, menghormati privasi dan martabat anak asuh, serta mematuhi kebijakan perlindungan anak (Child Protection Policy) Dinas Sosial Kabupaten.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={!isAgreed || isSubmitting}
                  className="w-full sm:w-auto active:scale-95 transition-all"
                  style={{
                    background: isAgreed ? 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.85rem 2rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.925rem',
                    fontWeight: 800,
                    cursor: isAgreed ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                    boxShadow: isAgreed ? '0 4px 15px rgba(11,31,92,0.3)' : 'none'
                  }}
                >
                  <Send size={18} />
                  {isSubmitting ? 'Mengirim Formulir...' : 'Kirim Pendaftaran Volunteer'}
                </button>
              </div>
            </div>

          </form>

          {/* Success Dialog Modal */}
          {submittedTicket && (
            <div className="modal-overlay" onClick={() => setSubmittedTicket(null)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', padding: '2rem', textAlign: 'center' }}>
                <div style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}>
                  <CheckCircle2 size={40} />
                </div>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.4rem' }}>
                  Pendaftaran Relawan Berhasil Dikirim!
                </h3>

                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Terima kasih, <strong>{submittedTicket.nama}</strong>! Formulir kerelawanan Anda telah diteruskan ke <strong>{submittedTicket.pantiTujuan}</strong> untuk ditinjau oleh Admin Panti.
                </p>

                {/* Ticket ID Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '2px dashed #1d4ed8',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ID Pendaftaran:</span>
                    <strong style={{ fontSize: '1rem', color: '#1d4ed8' }}>{submittedTicket.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>Bidang:</span>
                    <strong style={{ color: '#0b1f5c' }}>{submittedTicket.bidang}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>Tanggal &amp; Sesi:</span>
                    <strong style={{ color: '#0b1f5c' }}>{submittedTicket.tanggal} • {submittedTicket.sesiWaktu}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>Status Awal:</span>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.15rem 0.5rem', borderRadius: '50px', fontSize: '0.725rem', fontWeight: 800 }}>
                      Menunggu Persetujuan Admin Panti
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Pengurus panti akan memeriksa data &amp; berkas KTP/KTM Anda melalui Panel Admin Panti. Anda akan dihubungi melalui WhatsApp <strong>{submittedTicket.nomorHp}</strong> setelah pendaftaran disetujui.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Daftar Lagi / Selesai
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Portal HaloKids E-GOV */}
      <Footer 
        onOpenMap={() => {}}
        onOpenAdopsi={() => {}}
      />

    </div>
  );
}
