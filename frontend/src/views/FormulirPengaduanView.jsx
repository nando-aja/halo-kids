import React, { useRef, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Phone,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Send,
  FileText,
  UserCheck,
  MessageCircle,
  HelpCircle,
  Info,
  ChevronRight,
  Sparkles,
  Ticket,
  X,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Footer from '../components/Footer';
import pengaduanService, { createReportSubmissionKey } from '../api/pengaduanService';

export default function FormulirPengaduanView({
  isLoggedIn,
  currentUser,
  onLogout,
  onToggleLoginDemo,
  onSwitchToLanding,
  onSwitchToDashboard,
  onSwitchToPanti,
  onSwitchToDonasi,
  onOpenHotline,
  onOpenLogin,
  activeTab,
  setActiveTab
}) {
  // Step form state
  const [identityMode, setIdentityMode] = useState('anonymous'); // 'anonymous' | 'open'
  const [waNumber, setWaNumber] = useState('');
  const [email, setEmail] = useState('');
  const [namaTerang, setNamaTerang] = useState('');
  const [nik, setNik] = useState('');

  // Step 2: Selected Categories
  const [selectedCategories, setSelectedCategories] = useState([
    'Kekerasan Fisik, Psikis, & Seksual'
  ]);

  // Step 3: Event details
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [usiaKorban, setUsiaKorban] = useState('');
  const [jumlahAnak, setJumlahAnak] = useState('');
  const [kronologi, setKronologi] = useState('');

  // Step 4: Files & Agreement
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [submittedAttachmentCount, setSubmittedAttachmentCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submitLock = useRef(false);
  const submissionKey = useRef(createReportSubmissionKey());

  const toggleCategory = (catTitle) => {
    if (selectedCategories.includes(catTitle)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== catTitle));
      }
    } else {
      setSelectedCategories([...selectedCategories, catTitle]);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
    const validFiles = files.filter((file) => {
      const validType = allowedTypes.has(file.type) || /\.(jpe?g|png|pdf)$/i.test(file.name);
      const validSize = file.size <= 10 * 1024 * 1024;
      if (!validType || !validSize) {
        setSubmitError(`${file.name}: pilih PDF, JPG, atau PNG maksimal 10 MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length) {
      const remainingSlots = Math.max(0, 5 - uploadedFiles.length);
      const filesToAdd = validFiles.slice(0, remainingSlots);
      if (filesToAdd.length < validFiles.length) {
        setSubmitError('Maksimal 5 lampiran per laporan. Sebagian file tidak ditambahkan.');
      } else {
        setSubmitError('');
      }
      if (filesToAdd.length > 0) {
        setUploadedFiles((prev) => [
          ...prev,
          ...filesToAdd.map((file) => ({
            file,
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            tag: 'Akan disimpan secara privat saat submit',
            status: 'Siap diunggah'
          }))
        ]);
      }
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAgreed || submitLock.current || isSubmitting || submittedTicket) return;

    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const combinedReport = [
        `[Kategori]: ${selectedCategories.join(', ')}`,
        `[Waktu Kejadian]: ${tanggal || '-'} ${jam ? `Pukul ${jam}` : ''}`,
        `[Lokasi]: Kec. ${kecamatan || '-'}, Alamat: ${alamat || '-'}`,
        `[Korban]: Usia ${usiaKorban || '-'} tahun, Jumlah ${jumlahAnak || '-'} anak`,
        `[Identitas Pelapor]: ${identityMode === 'anonymous' ? 'Anonim (Kerahasiaan Terjamin)' : `Nama: ${namaTerang || '-'} | NIK: ${nik || '-'} | No. WA: ${waNumber || '-'} | Email: ${email || '-'}`}`,
        `[Kronologi Rinci]: ${kronologi || '-'}`
      ].join('\n');

      const response = await pengaduanService.createPengaduan({
        isi_laporan: combinedReport,
        jenis_laporan: selectedCategories[0] || 'Kekerasan Anak',
        submission_key: submissionKey.current,
        files: uploadedFiles.map((item) => item.file).filter(Boolean),
      });

      const ticketCode = response?.kode_tiket;
      if (!ticketCode) {
        throw new Error('Server belum mengonfirmasi penyimpanan laporan. Kode tiket tidak diterima.');
      }
      setSubmittedTicket(ticketCode);
      setSubmittedAttachmentCount(Number(response?.lampiran_tersimpan) || 0);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('halokids:data_updated', { detail: { type: 'pengaduan' } }));
      }
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}
    } catch (err) {
      console.error('Pengiriman pengaduan gagal:', err);
      setSubmitError(err?.friendlyMessage || err?.message || 'Pengiriman gagal. Laporan belum dikonfirmasi tersimpan. Coba kembali setelah koneksi diperiksa.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const resetAfterSuccessfulSubmit = () => {
    setSubmittedTicket(null);
    setSubmittedAttachmentCount(0);
    setSubmitError('');
    setIdentityMode('anonymous');
    setWaNumber('');
    setEmail('');
    setNamaTerang('');
    setNik('');
    setSelectedCategories(['Kekerasan Fisik, Psikis, & Seksual']);
    setTanggal('');
    setJam('');
    setKecamatan('');
    setAlamat('');
    setUsiaKorban('');
    setJumlahAnak('');
    setKronologi('');
    setUploadedFiles([]);
    setIsAgreed(false);
    submissionKey.current = createReportSubmissionKey();
  };

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Main Content Area (Full Width with comfortable responsive padding) */}
      <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full" style={{ marginTop: '1.25rem', marginBottom: '3rem', flex: 1, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Page Main Banner Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 1.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
              color: '#ffffff',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)'
            }}>
              <Shield size={26} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <span style={{ background: '#1e40af', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', letterSpacing: '0.05em' }}>
                  KODE TIKET OTOMATIS
                </span>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.725rem', fontWeight: 700, padding: '0.18rem 0.65rem', borderRadius: '50px' }}>
                  Respon Cepat TRC &lt; 2 Jam
                </span>
              </div>
              
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.2rem 0', fontFamily: 'var(--font-heading)' }}>
                Formulir Pengaduan Pelindungan Anak Terpadu
              </h1>
              
              <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                Jaminan kerahasiaan penuh di bawah payung hukum UU No. 35/2014. Setiap laporan terhubung langsung ke Unit Siaga Reaksi Cepat (TRC) Dinas Sosial Kabupaten 24 Jam.
              </p>
            </div>
          </div>
            
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* STEP 1: PILIHAN PRIVASI & IDENTITAS PELAPOR */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Pilihan Privasi &amp; Identitas Pelapor
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Langkah 1 dari 4</span>
                </div>

                {/* Identity Mode Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setIdentityMode('anonymous')}
                    style={{
                      background: identityMode === 'anonymous' ? '#0b1f5c' : '#ffffff',
                      color: identityMode === 'anonymous' ? '#ffffff' : '#334155',
                      border: identityMode === 'anonymous' ? '2px solid #0b1f5c' : '1px solid #cbd5e1',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: identityMode === 'anonymous' ? '0 4px 10px rgba(11,31,92,0.2)' : 'none',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <Shield size={18} /> Mode Anonim (Rahasia 100%)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIdentityMode('open')}
                    style={{
                      background: identityMode === 'open' ? '#0b1f5c' : '#ffffff',
                      color: identityMode === 'open' ? '#ffffff' : '#334155',
                      border: identityMode === 'open' ? '2px solid #0b1f5c' : '1px solid #cbd5e1',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <UserCheck size={18} /> Identitas Terbuka (Nama Terang)
                  </button>
                </div>


                {/* Inputs for Mode */}
                {identityMode === 'anonymous' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2-mobile">
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Nomor WhatsApp Pelapor / Pendamping *
                      </label>
                      <input 
                        type="text"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Email Notifikasi Kasus (Opsional)
                      </label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Contoh: budi.santoso@email.com"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2-mobile">
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Nama Lengkap Sesuai KTP *
                      </label>
                      <input 
                        type="text"
                        value={namaTerang}
                        onChange={(e) => setNamaTerang(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Nomor Telepon / WhatsApp Aktif *
                      </label>
                      <input 
                        type="text"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: KLASIFIKASI DUGAAN PELANGGARAN HAK ANAK */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Klasifikasi Dugaan Pelanggaran Hak Anak
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: '50px' }}>Pilih 1 atau lebih</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }} className="grid-2-mobile">
                  {[
                    {
                      id: 'cat1',
                      title: 'Kekerasan Fisik, Psikis, & Seksual',
                      desc: 'Penganiayaan tubuh, ancaman trauma, perundungan berat, atau pelecehan.'
                    },
                    {
                      id: 'cat2',
                      title: 'Eksploitasi & Pekerja Anak Bawah Umur',
                      desc: 'Mengemis paksa, buruh kasar berbahaya, perdagangan konten eksploitatif.'
                    },
                    {
                      id: 'cat3',
                      title: 'Panti Asuhan Ilegal / Penelantaran LKSA',
                      desc: 'Fasilitas panti tak berizin, penahanan dokumen anak, malnutrisi, manipulasi donasi.'
                    },
                    {
                      id: 'cat4',
                      title: 'Perdagangan Bayi & Adopsi Ilegal',
                      desc: 'Jual-beli bayi via medsos, pemalsuan akta kelahiran, pengalihan asuh tanpa izin Dinsos.'
                    },
                    {
                      id: 'cat5',
                      title: 'ABH - Anak Berhadapan dengan Hukum',
                      desc: 'Perlu pendampingan Bapas/Peksos atas anak sebagai korban, saksi, maupun pelaku pidana ringan.'
                    }
                  ].map((cat) => {
                    const isChecked = selectedCategories.includes(cat.title);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategory(cat.title)}
                        style={{
                          border: isChecked ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                          background: isChecked ? '#eff6ff' : '#f8fafc',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1d4ed8' }}
                          />
                          <strong style={{ fontSize: '0.85rem', color: '#0b1f5c', flex: 1 }}>{cat.title}</strong>
                          {cat.badge && (
                            <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              {cat.badge}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, paddingLeft: '1.5rem', lineHeight: 1.4 }}>
                          {cat.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: WAKTU, LOKASI & KRONOLOGI KEJADIAN */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Waktu, Lokasi &amp; Kronologi Kejadian
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Langkah 3 dari 4</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Row 1: Date, Time, District */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.85rem' }} className="grid-3-mobile">
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Tanggal Peristiwa / Temuan *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="date"
                          value={tanggal}
                          placeholder="hh/bb/tttt"
                          onChange={(e) => setTanggal(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            fontSize: '0.85rem',
                            color: tanggal ? '#0f172a' : '#94a3b8'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Estimasi Jam Kejadian
                      </label>
                      <input 
                        type="time"
                        value={jam}
                        placeholder="--:--"
                        onChange={(e) => setJam(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          fontSize: '0.85rem',
                          color: jam ? '#0f172a' : '#94a3b8'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Kecamatan Wilayah *
                      </label>
                      <select
                        value={kecamatan}
                        onChange={(e) => setKecamatan(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          color: kecamatan ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        <option value="" disabled>Pilih Kecamatan Wilayah...</option>
                        <option value="Kec. Cibinong" style={{ color: '#0f172a' }}>Kec. Cibinong</option>
                        <option value="Kec. Ciawi" style={{ color: '#0f172a' }}>Kec. Ciawi</option>
                        <option value="Kec. Gunung Putri" style={{ color: '#0f172a' }}>Kec. Gunung Putri</option>
                        <option value="Kec. Parung" style={{ color: '#0f172a' }}>Kec. Parung</option>
                        <option value="Kec. Citeureup" style={{ color: '#0f172a' }}>Kec. Citeureup</option>
                        <option value="Kec. Babakan Madang" style={{ color: '#0f172a' }}>Kec. Babakan Madang</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Address */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                      Alamat Lengkap &amp; Patokan Lokasi *
                    </label>
                    <input 
                      type="text" 
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Contoh: Jl. Anggrek No. 12 RT 04/RW 02 (Belakang Toko Kelontong Berkah), Kelurahan Sukamaju"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Row 3: Age & Count */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }} className="grid-2-mobile">
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Estimasi Usia Korban Anak
                      </label>
                      <select
                        value={usiaKorban}
                        onChange={(e) => setUsiaKorban(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          color: usiaKorban ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        <option value="" disabled>Pilih rentang usia korban...</option>
                        <option value="Balita (0 - 5 Tahun)" style={{ color: '#0f172a' }}>Balita (0 - 5 Tahun)</option>
                        <option value="Anak SD (6 - 12 Tahun)" style={{ color: '#0f172a' }}>Anak SD (6 - 12 Tahun)</option>
                        <option value="Remaja (13 - 17 Tahun)" style={{ color: '#0f172a' }}>Remaja (13 - 17 Tahun)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                        Perkiraan Jumlah Anak Terkena Dampak
                      </label>
                      <select
                        value={jumlahAnak}
                        onChange={(e) => setJumlahAnak(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          color: jumlahAnak ? '#0f172a' : '#94a3b8'
                        }}
                      >
                        <option value="" disabled>Pilih perkiraan jumlah anak...</option>
                        <option value="1 Anak" style={{ color: '#0f172a' }}>1 Anak</option>
                        <option value="2 - 3 Anak" style={{ color: '#0f172a' }}>2 - 3 Anak</option>
                        <option value="Lebih dari 3 Anak" style={{ color: '#0f172a' }}>Lebih dari 3 Anak</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Chronology Textarea */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                      Deskripsi Kronologi Kejadian Terperinci *
                    </label>
                    <textarea 
                      rows={4}
                      value={kronologi}
                      onChange={(e) => setKronologi(e.target.value)}
                      placeholder="Jelaskan secara runtut kejadian yang disaksikan: situasi lingkungan, kondisi fisik korban, indikasi pelaku jika diketahui, serta urgensi bantuan yang dibutuhkan segera..."
                      style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 4: UNGGAH BUKTI & DOKUMEN DIGITAL */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Unggah Bukti &amp; Dokumen Digital
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Langkah 4 dari 4</span>
                </div>


                {/* Drag and Drop Zone */}
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  marginBottom: '1.25rem',
                  transition: 'var(--transition-fast)'
                }}>
                  <input 
                    type="file" 
                    id="file-upload-input" 
                    multiple 
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{
                      background: '#e0e7ff',
                      color: '#1d4ed8',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <Upload size={24} />
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.35rem 0' }}>
                      Pilih Foto atau Dokumen Bukti
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, maxWidth: '480px', margin: '0 auto' }}>
                      Format JPG, PNG, atau PDF; maksimal 10 MB per file dan 5 file. File akan diunggah ke bucket privat Supabase saat laporan dikirim.
                    </p>
                  </label>
                </div>


                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={18} color="#1d4ed8" />
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: '#0b1f5c', display: 'block' }}>{file.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{file.size} — {file.tag}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.675rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {file.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Legal Statement Checkbox */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '1.25rem'
                }}>
                  <input 
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1d4ed8' }}
                  />
                  <span style={{ fontSize: '0.775rem', color: '#475569', lineHeight: 1.45 }}>
                    Saya menyatakan dengan sungguh-sungguh bahwa data dan informasi yang saya sampaikan adalah benar sesuai yang saya ketahui untuk tujuan perlindungan dan keselamatan anak, tanpa itikad mencemarkan nama baik atau laporan palsu yang dilarang undang-undang.
                  </span>
                </label>

                {submitError && (
                  <div role="alert" style={{ marginBottom: '1rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                    <strong>Belum terkirim:</strong> {submitError}
                  </div>
                )}

                {/* Submit Row */}
                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">

                  <button
                    type="submit"
                    disabled={!isAgreed || isSubmitting}
                    className="w-full sm:w-auto active:scale-95 transition-all"
                    style={{
                      background: isAgreed ? 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.85rem 1.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
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
                    {isSubmitting ? 'Mengirim & Mengunggah Bukti...' : 'Kirim Laporan Pengaduan (Aman & Terenkripsi)'}
                  </button>
                </div>
              </div>

            </form>

            {/* Success Dialog Modal after Form Submission */}
            {submittedTicket && (
              <div className="modal-overlay" onClick={resetAfterSuccessfulSubmit}>
                <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', padding: '2rem', textAlign: 'center' }}>
                  <div style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem auto'
                  }}>
                    <CheckCircle2 size={36} />
                  </div>

                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem' }}>
                    Laporan Pengaduan Berhasil Terkirim!
                  </h3>
                  
                  <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    Server telah mengonfirmasi laporan tersimpan. Simpan kode tiket resmi di bawah ini:
                  </p>

                  <div style={{
                    background: '#f1f5f9',
                    border: '2px dashed #1d4ed8',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}>
                    <Ticket size={24} color="#1d4ed8" />
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0b1f5c', letterSpacing: '0.08em' }}>
                      {submittedTicket}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: submittedAttachmentCount > 0 ? '#15803d' : '#64748b', fontWeight: submittedAttachmentCount > 0 ? 700 : 500, marginBottom: '0.65rem' }}>
                    {submittedAttachmentCount > 0
                      ? `${submittedAttachmentCount} lampiran berhasil disimpan di Supabase Storage privat.`
                      : 'Laporan tersimpan tanpa lampiran.'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    Kode Tiket ini digunakan untuk memantau proses tindak lanjut melalui Portal Lacak Status Tiket.
                  </p>

                  <button 
                    onClick={resetAfterSuccessfulSubmit}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Tutup &amp; Selesai
                  </button>
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
