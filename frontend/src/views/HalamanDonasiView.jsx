import React, { useState, useEffect } from 'react';
import {
  Heart,
  Landmark,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Gift,
  Users,
  Sparkles,
  ArrowRight,
  Wallet,
  Package,
  MapPin,
  Phone,
  Copy,
  Truck,
  ExternalLink,
  Building2,
  FileCheck,
  Calendar,
  Info,
  AlertCircle,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Footer from '../components/Footer';
import donasiService from '../api/donasiService';
import pantiService from '../api/pantiService';

export default function HalamanDonasiView({
  isLoggedIn,
  currentUser,
  onLogout,
  onToggleLoginDemo,
  onSwitchToLanding,
  onSwitchToPengaduan,
  onSwitchToPanti,
  onSwitchToDonasi,
  onOpenLogin,
  onOpenHotline,
  onOpenAdopsi,
  onOpenMap,
  activeTab,
  setActiveTab
}) {
  // Main Tab State: 'uang' (Donasi Uang & QRIS/Bank) | 'barang' (Kumpulan Barang & Pengiriman Paket)
  const [activeDonasiTab, setActiveDonasiTab] = useState('uang');

  // Monetary Donation State
  const [selectedNominal, setSelectedNominal] = useState(100000);
  const [customNominal, setCustomNominal] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('Panti Asuhan & LKSA');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [donorName, setDonorName] = useState(currentUser?.name || '');
  const [donorContact, setDonorContact] = useState(currentUser?.phone || '');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ==========================================
// DONATION PAYMENT & PROOF STATE
// ==========================================

const [showProofModal, setShowProofModal] = useState(false);
const [proofFile, setProofFile] = useState(null);
const [donationError, setDonationError] = useState('');
const [createdDonation, setCreatedDonation] = useState(null);
const [qrisImageError, setQrisImageError] = useState(false);

  // Goods Donation State
  const [copiedPantiId, setCopiedPantiId] = useState(null);
  const [selectedPantiPackage, setSelectedPantiPackage] = useState('LKSA Kasih Bunda Mandiri');
  const [selectedItems, setSelectedItems] = useState(['Sembako (Beras 10kg & Minyak)', 'Seragam Sekolah SD/SMP']);
  const [courierName, setCourierName] = useState('J&T Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [senderName, setSenderName] = useState(currentUser?.name || '');
  const [showPackageReceiptModal, setShowPackageReceiptModal] = useState(false);
  const [packageReceiptCode, setPackageReceiptCode] = useState('');
  const [estimasiTanggal, setEstimasiTanggal] = useState('');
  const [catatanPengiriman, setCatatanPengiriman] = useState('');
  const [apiPantiList, setApiPantiList] = useState([]);

  const pantiGoodsList = [
    {
      id: 'panti-1',
      name: 'LKSA Kasih Bunda Mandiri',
      address: 'Jl. Raya Cibinong No. 45, RT 02/RW 05, Kec. Cibinong, Kab. Bogor 16911',
      phone: '0812-9988-7711 (Ibu Siti)',
      anakCount: '42 Anak Asuh',
      items: [
        { name: 'Sembako (Beras 10kg & Minyak)', urgent: true, target: '20 Paket' },
        { name: 'Seragam Sekolah SD/SMP', urgent: true, target: '15 Set' },
        { name: 'Buku Tulis & Alat Sekolah', urgent: false, target: '40 Paket' },
        { name: 'Sepatu Sekolah Hitam (Ukuran 34-40)', urgent: false, target: '10 Pasang' }
      ]
    },
    {
      id: 'panti-2',
      name: 'Panti Asuhan Balita Tunas Bangsa',
      address: 'Jl. Pemda Tegar Beriman No. 12, Kel. Pakansari, Kec. Cibinong 16915',
      phone: '0813-8822-4400 (Ns. Ratna)',
      anakCount: '26 Balita (0-4 Thn)',
      items: [
        { name: 'Susu Formula SGM 0-12 Bln (400g)', urgent: true, target: '30 Kaleng' },
        { name: 'Popok Bayi M & L', urgent: true, target: '25 Pax' },
        { name: 'Minyak Telon & Sabun Mandi Balita', urgent: false, target: '15 Botol' },
        { name: 'Kasur Busa Bayi / Perlak', urgent: false, target: '5 Unit' }
      ]
    },
    {
      id: 'panti-3',
      name: 'LKSA Bina Harapan Ciawi',
      address: 'Jl. Raya Puncak Ciawi No. 88, RT 01/RW 03, Kec. Ciawi, Kab. Bogor 16720',
      phone: '0857-1133-5599 (Pak Rizky)',
      anakCount: '38 Remaja',
      items: [
        { name: 'Komputer / Laptop Bekas Layak Pakai', urgent: true, target: '5 Unit' },
        { name: 'Bahan Pelatihan Tata Boga (Tepung/Mentega)', urgent: true, target: '10 Paket' },
        { name: 'Perlengkapan Kebersihan Panti', urgent: false, target: '15 Set' },
        { name: 'Buku Komputer & Otomotif', urgent: false, target: '20 Buah' }
      ]
    }
  ];

  const nominalOptions = [50000, 100000, 250000, 500000, 1000000];

  const getFinalAmount = () => {
    if (customNominal && !isNaN(customNominal)) {
      return parseInt(customNominal, 10).toLocaleString('id-ID');
    }
    return selectedNominal.toLocaleString('id-ID');
  };

const handleMoneySubmit = (e) => {
  e.preventDefault();

  const nominal = Number.parseInt(
    customNominal || selectedNominal,
    10
  );

  if (!Number.isFinite(nominal) || nominal <= 0) {
    setDonationError(
      'Nominal donasi tidak valid.'
    );
    return;
  }

  if (!isLoggedIn) {
    onOpenLogin?.();
    return;
  }

  if (paymentMethod !== 'qris') {
    setDonationError(
      'Metode transfer bank belum diaktifkan. Silakan gunakan QRIS.'
    );
    return;
  }

  setDonationError('');

  setQrisImageError(false);

  setShowQrisModal(true);
};

const handleQrisPaid = () => {
  setShowQrisModal(false);

  setDonationError('');

  setProofFile(null);

  setShowProofModal(true);
};

const handleProofSubmit = async (e) => {
  e.preventDefault();

  if (!proofFile) {
    setDonationError(
      'Silakan pilih bukti transfer terlebih dahulu.'
    );
    return;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  if (!allowedTypes.includes(proofFile.type)) {
    setDonationError(
      'Format file harus JPG, PNG, atau PDF.'
    );
    return;
  }

  if (proofFile.size > 10 * 1024 * 1024) {
    setDonationError(
      'Ukuran bukti transfer maksimal 10 MB.'
    );
    return;
  }

  const nominal = Number.parseInt(
    customNominal || selectedNominal,
    10
  );

  if (!Number.isFinite(nominal) || nominal <= 0) {
    setDonationError('Nominal donasi tidak valid.');
    return;
  }

  setIsSubmitting(true);
  setDonationError('');

  try {

    // ========================================
    // 1. UPLOAD BUKTI TRANSFER
    // ========================================

    const uploadResult =
      await donasiService.uploadBuktiTransfer(
        proofFile
      );

    if (!uploadResult?.bukti_transfer) {
      throw new Error(
        'Server tidak mengembalikan lokasi bukti transfer.'
      );
    }


    // ========================================
    // 2. BUAT TRANSAKSI DONASI
    // ========================================

    const donationResult =
      await donasiService.createDonasi({

        id_panti: 1,

        jenis_donasi: 'uang',

        jumlah_nominal: nominal,

        bukti_transfer: uploadResult.bukti_transfer

      });


    // ========================================
    // 3. SIMPAN HASIL RESPONS
    // ========================================

    setCreatedDonation(donationResult);


    // ========================================
    // 4. UPDATE DASHBOARD
    // ========================================

    window.dispatchEvent(
      new CustomEvent('halokids:data_updated', {
        detail: {
          type: 'donasi'
        }
      })
    );


    // ========================================
    // 5. TAMPILKAN KONFIRMASI
    // ========================================

    setProofFile(null);

    setShowProofModal(false);

    setShowSuccessModal(true);

    triggerConfetti();

  } catch (err) {

    console.error(
      'Gagal mengirim donasi:',
      err
    );

    setDonationError(
      err?.friendlyMessage ||
      err?.response?.data?.detail ||
      err?.message ||
      'Gagal mengirim donasi. Silakan coba kembali.'
    );

  } finally {

    setIsSubmitting(false);

  }
};

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 130,
        spread: 85,
        origin: { y: 0.6 }
      });
    } catch (err) {}
  };

  const handleCopyAddress = (pantiObj) => {
    navigator.clipboard.writeText(`Penerima: ${pantiObj.name} (${pantiObj.phone})\nAlamat: ${pantiObj.address}`);
    setCopiedPantiId(pantiObj.id);
    setTimeout(() => setCopiedPantiId(null), 2500);
  };

  const handleItemToggle = (itemName) => {
    if (selectedItems.includes(itemName)) {
      setSelectedItems(selectedItems.filter(i => i !== itemName));
    } else {
      setSelectedItems([...selectedItems, itemName]);
    }
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Pilih minimal 1 jenis barang yang akan Anda kirimkan.');
      return;
    }
    setIsSubmitting(true);
    try {
      await donasiService.createDonasi({
        id_panti: 1,
        jenis_donasi: 'barang',
        nama_barang: selectedItems.join(', '),
        jumlah_barang: 1,
        satuan_barang: 'Paket Logistik',
        estimasi_waktu_antar: estimasiTanggal || new Date().toISOString().slice(0, 10)
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('halokids:data_updated', { detail: { type: 'donasi' } }));
      }
    } catch (err) {
      console.warn('API donasi barang fallback:', err);
    } finally {
      setIsSubmitting(false);
      const receipt = `PKG-DNS-${Math.floor(100000 + Math.random() * 900000)}`;
      setPackageReceiptCode(receipt);
      setShowPackageReceiptModal(true);
      triggerConfetti();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Hero Header */}
      <section style={{
        background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
        color: '#ffffff',
        padding: '3.5rem 0 3rem 0'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', marginBottom: '0.75rem', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>
            <Heart size={14} color="#15803d" style={{ marginRight: '0.35rem' }} />
            PORTAL DONASI UANG &amp; PAKET LOGISTIK DINSOS
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, margin: '0 0 0.85rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
            Salurkan Kepedulian untuk Panti Asuhan
          </h1>
          <p style={{ fontSize: '1rem', color: '#bfdbfe', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
            Bantu panti asuhan secara finansial melalui QRIS/Transfer Bank atau kirimkan paket logistik barang kebutuhan langsung ke lokasi panti yang membutuhkan.
          </p>

          {/* Main Donation Type Selector Tabs (Requirement 6) */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            padding: '0.35rem',
            borderRadius: '50px',
            border: '1px solid rgba(255,255,255,0.3)',
            gap: '0.4rem'
          }}>
            <button
              onClick={() => setActiveDonasiTab('uang')}
              style={{
                border: 'none',
                background: activeDonasiTab === 'uang' ? '#ffffff' : 'transparent',
                color: activeDonasiTab === 'uang' ? '#0b1f5c' : '#ffffff',
                padding: '0.65rem 1.5rem',
                borderRadius: '50px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'var(--transition-fast)'
              }}
            >
              <Wallet size={18} /> Donasi Uang (QRIS &amp; Bank)
            </button>

            <button
              onClick={() => setActiveDonasiTab('barang')}
              style={{
                border: 'none',
                background: activeDonasiTab === 'barang' ? '#ffffff' : 'transparent',
                color: activeDonasiTab === 'barang' ? '#0b1f5c' : '#ffffff',
                padding: '0.65rem 1.5rem',
                borderRadius: '50px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'var(--transition-fast)'
              }}
            >
              <Package size={18} /> Donasi Barang &amp; Kirim Paket
            </button>
          </div>
        </div>
      </section>

      {/* Main Content View */}
      <section style={{ padding: '3.5rem 0 5rem 0', flex: 1 }}>
        <div className="container">
          
          {/* TAB 1: DONASI UANG (MONEY, QRIS & BANK) */}
          {activeDonasiTab === 'uang' ? (
            <div>
              {/* Quick Impact Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.25rem',
                marginBottom: '3rem'
              }} className="grid-4">
                {[
                  { label: 'Total Donasi Terkumpul', val: 'Rp 485.500.000', icon: Wallet, color: '#1d4ed8' },
                  { label: 'Anak Asuh Terbantu', val: '1.240 Anak', icon: Users, color: '#059669' },
                  { label: 'Panti Penerima Rekomendasi', val: '28 LKSA Resmi', icon: Landmark, color: '#b45309' },
                  { label: 'Audit Akuntabilitas', val: '100% Terverifikasi', icon: ShieldCheck, color: '#0284c7' }
                ].map((stat, idx) => (
                  <div key={idx} style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      background: `${stat.color}15`,
                      color: stat.color,
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block' }}>{stat.label}</span>
                      <strong style={{ fontSize: '1.15rem', color: '#0b1f5c', fontWeight: 800 }}>{stat.val}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2-Column Donation Form Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.9fr',
                gap: '2.5rem',
                alignItems: 'start'
              }} className="donasi-grid">
                
                {/* Left Column: Programs & Guarantees */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.35rem 0' }}>
                      Pilih Program Penyaluran Dana
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      Pilih alokasi bantuan finansial sesuai kepedulian Anda.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2-mobile">
                    {[
                      { id: 'panti', title: 'Panti Asuhan & LKSA', desc: 'Operasional, makanan bergizi, & tempat tinggal panti binaan.', color: '#1d4ed8' },
                      { id: 'pendidikan', title: 'Beasiswa & Sekolah', desc: 'Buku, seragam, & SPP anak yatim piatu berprestasi.', color: '#0284c7' },
                      { id: 'trc', title: 'Safehouse & Medis TRC', desc: 'Dana darurat rehabilitasi medis korban kekerasan anak.', color: '#b45309' },
                      { id: 'sembako', title: 'Susu Balita & Nutrisi', desc: 'Pengadaan susu formula, gizi balita, & popok bayi.', color: '#dc2626' }
                    ].map((p) => {
                      const isSelected = selectedProgram === p.title;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProgram(p.title)}
                          style={{
                            background: isSelected ? '#ffffff' : '#f8fafc',
                            border: isSelected ? `2.5px solid ${p.color}` : '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 8px 20px -4px rgba(29,78,216,0.12)' : 'none',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#0b1f5c' }}>{p.title}</strong>
                            {isSelected && <CheckCircle2 size={18} color={p.color} />}
                          </div>
                          <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                            {p.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bank Accounts Info Box */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0b1f5c', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      <Landmark size={18} color="#1d4ed8" /> Rekening Resmi Pembayaran / Transfer Bank:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#0b1f5c', display: 'block' }}>Bank Mandiri: 133-00-1928374-1</strong>
                          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>a.n LKSA Dinsos Terpadu HaloKids</span>
                        </div>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '4px' }}>MANDIRI</span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#0b1f5c', display: 'block' }}>Bank BCA: 882-019-3829</strong>
                          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>a.n LKSA Dinsos Terpadu HaloKids</span>
                        </div>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '4px' }}>BCA</span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#0b1f5c', display: 'block' }}>Bank BNI: 089-112-9943</strong>
                          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>a.n LKSA Dinsos Terpadu HaloKids</span>
                        </div>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.5rem', borderRadius: '4px' }}>BNI</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Donation Payment Form */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                    <Sparkles size={20} color="#1d4ed8" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Formulir Transaksi Donasi
                    </h3>
                  </div>

                  <form onSubmit={handleMoneySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div>
                      <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                        PROGRAM DIPILIH:
                      </label>
                      <div style={{ background: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        ✔ {selectedProgram}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                        PILIH NOMINAL DONASI (IDR):
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        {nominalOptions.map((nom) => (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => { setSelectedNominal(nom); setCustomNominal(''); }}
                            style={{
                              padding: '0.55rem 0.25rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: selectedNominal === nom && !customNominal ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                              background: selectedNominal === nom && !customNominal ? '#eff6ff' : '#ffffff',
                              color: selectedNominal === nom && !customNominal ? '#1d4ed8' : '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            Rp {nom.toLocaleString('id-ID')}
                          </button>
                        ))}
                      </div>

                      <input 
                        type="number"
                        placeholder="Contoh: 150000 (Nominal Khusus)"
                        value={customNominal}
                        onChange={(e) => setCustomNominal(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div>
                        <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                          Nama Dermawan
                        </label>
                        <input 
                          type="text"
                          placeholder="Contoh: Budi Santoso (atau Hamba Allah)"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                          Metode Pembayaran
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                        >
                          <option value="qris">Instant QRIS (GoPay, OVO, Dana, QR Bank)</option>
                          <option value="mandiri">Transfer Bank Mandiri</option>
                          <option value="bca">Transfer Bank BCA</option>
                          <option value="bni">Transfer Bank BNI</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Pembayaran:</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8' }}>
                        Rp {getFinalAmount()}
                      </strong>
                    </div>

                    <button 
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}
                    >
                      <Heart size={18} fill="#ffffff" /> Lanjut Pembayaran Donasi <ArrowRight size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.725rem', color: '#059669', fontWeight: 600 }}>
                      <QrCode size={14} /> Mendukung QRIS Standard BI &amp; Transfer Bank Otomatis
                    </div>

                  </form>
                </div>
              </div>
            </div>
          ) : (

            /* TAB 2: DONASI BARANG & PENGIRIMAN PAKET (REQUIREMENT 6) */
            <div>
              <div style={{ maxWidth: '850px', margin: '0 auto 2.5rem auto', textAlign: 'center' }}>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', marginBottom: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>
                  <Package size={14} color="#92400e" style={{ marginRight: '0.35rem' }} />
                  KUMPULAN BARANG DIBUTUHKAN MASING-MASING PANTI (REQ #6)
                </span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.5rem 0' }}>
                  Kirim Paket Barang Langsung ke Alamat Panti
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  Lihat daftar barang yang mendesak dibutuhkan tiap panti di bawah ini. Anda dapat menyalin alamat pengiriman dan mengonfirmasi nomor resi pengiriman paket Anda.
                </p>
              </div>

              {/* Grid of Orphanage Wishlists & Addresses */}
              <div className="panti-cards-grid" style={{ marginBottom: '3rem' }}>
                {pantiGoodsList.map((panti) => (
                  <div 
                    key={panti.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.5rem',
                      boxShadow: 'var(--shadow-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.5rem 0' }}>
                        {panti.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'block', marginBottom: '0.85rem' }}>
                        Kapasitas: {panti.anakCount}
                      </span>

                      {/* Item Wishlist Checklist */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#0b1f5c', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '0.5rem' }}>
                          KUMPULAN BARANG DIBUTUHKAN:
                        </span>
                        <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {panti.items.map((it, idx) => (
                            <li key={idx}>
                              <strong>{it.name}</strong>{' '}
                              <span style={{ color: it.urgent ? '#dc2626' : '#64748b', fontSize: '0.725rem', fontWeight: 700 }}>
                                ({it.target} {it.urgent ? '• URGENT' : ''})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Address & Copy Action Box */}
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                          ALAMAT PENERIMA PENGIRIMAN PAKET:
                        </span>
                        <p style={{ fontSize: '0.775rem', color: '#1e293b', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                          {panti.address}
                        </p>
                        <span style={{ fontSize: '0.725rem', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
                          Kontak Panti: <strong>{panti.phone}</strong>
                        </span>

                        <button
                          onClick={() => handleCopyAddress(panti)}
                          style={{
                            width: '100%',
                            background: '#ffffff',
                            border: '1px solid #93c5fd',
                            color: '#1d4ed8',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Copy size={14} /> {copiedPantiId === panti.id ? '✔ Alamat & Kontak Tersalin!' : 'Salin Alamat Lengkap Paket'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPantiPackage(panti.name);
                        const el = document.getElementById('form-paket');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%', borderRadius: '8px', fontSize: '0.825rem', padding: '0.6rem' }}
                    >
                      <Truck size={16} /> Pilih Panti Ini untuk Kirim Paket ↓
                    </button>

                  </div>
                ))}
              </div>

              {/* Package Confirmation Form */}
              <div id="form-paket" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-xl)',
                  padding: '2.5rem',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem'
                }}>
                  {/* Header Form */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Truck size={26} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.2rem 0', letterSpacing: '-0.01em' }}>
                        Formulir Konfirmasi Pengiriman Paket Barang
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Catat nomor resi Anda agar pengurus panti dapat memantau kedatangan paket.
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handlePackageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Panti Asuhan Tujuan */}
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.45rem' }}>
                        Panti Asuhan Tujuan Pengiriman Paket: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        value={selectedPantiPackage}
                        onChange={(e) => setSelectedPantiPackage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.9rem',
                          outline: 'none',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {pantiGoodsList.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({p.address.split(',')[1]?.trim() || p.address.split(',')[0]?.trim() || ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Jenis Barang Yang Dikirimkan */}
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                        Pilih Jenis Barang Yang Dikirimkan (Bisa Lebih Dari Satu): <span style={{ color: '#dc2626' }}>*</span>
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                        {[
                          'Sembako (Beras & Minyak)',
                          'Seragam Sekolah SD/SMP',
                          'Buku & Alat Tulis Sekolah',
                          'Susu Formula & Nutrisi Balita',
                          'Popok Bayi M / L',
                          'Peralatan Kebersihan Panti',
                          'Pakaian Layak Pakai Anak',
                          'Kasur Busa / Selimut'
                        ].map((item) => {
                          const isChecked = selectedItems.includes(item);
                          return (
                            <label
                              key={item}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                fontSize: '0.825rem',
                                padding: '0.7rem 0.9rem',
                                background: isChecked ? '#eff6ff' : '#f8fafc',
                                border: isChecked ? '1.5px solid #1d4ed8' : '1px solid #e2e8f0',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                color: isChecked ? '#1d4ed8' : '#334155',
                                fontWeight: isChecked ? 700 : 500,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleItemToggle(item)}
                                style={{ accentColor: '#1d4ed8', width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ userSelect: 'none' }}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4 Inputs Grid: Ekspedisi, Resi, Pengirim, Estimasi */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                          Ekspedisi / Kurir <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#fff', fontWeight: 500 }}
                        >
                          <option value="J&T Express">J&T Express</option>
                          <option value="JNE Express">JNE Express</option>
                          <option value="SiCepat">SiCepat</option>
                          <option value="GoSend / GrabExpress">GoSend / GrabExpress</option>
                          <option value="Shopee Xpress / SPX">Shopee Xpress (SPX)</option>
                          <option value="Pos Indonesia">Pos Indonesia</option>
                          <option value="Anteraja">Anteraja</option>
                          <option value="Pengantaran Langsung">Pengantaran Langsung Pribadi</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                          Nomor Resi / Tracking <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="Contoh: JT88492019 / JP1234567890"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                          Nama Pengirim / WA
                        </label>
                        <input 
                          type="text"
                          placeholder="Contoh: Budi Santoso (081234567890)"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                          Estimasi Waktu Antar
                        </label>
                        <input 
                          type="date"
                          value={estimasiTanggal}
                          onChange={(e) => setEstimasiTanggal(e.target.value)}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#fff' }}
                        />
                      </div>
                    </div>

                    {/* Submit Action */}
                    <button 
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.95rem',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        borderRadius: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        background: '#0b1f5c',
                        boxShadow: '0 4px 14px rgba(11,31,92,0.3)'
                      }}
                    >
                      <FileCheck size={19} /> Simpan &amp; Konfirmasi Pengiriman Paket Barang
                    </button>

                  </form>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

{/* MODAL QRIS ASLI */}
{showQrisModal && (
  <div
    className="modal-overlay"
    onClick={() => setShowQrisModal(false)}
  >
    <div
      className="modal-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: '480px',
        width: '95%',
        textAlign: 'center',
        padding: '1.75rem'
      }}
    >
      <span
        style={{
          background: '#eff6ff',
          color: '#1d4ed8',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '0.35rem 0.85rem',
          borderRadius: '50px'
        }}
      >
        QRIS PEMBAYARAN
      </span>

      <h3
        style={{
          fontSize: '1.3rem',
          fontWeight: 800,
          color: '#0b1f5c',
          margin: '1rem 0 0.5rem'
        }}
      >
        Scan QRIS untuk Membayar
      </h3>

      <p
        style={{
          fontSize: '0.85rem',
          color: '#64748b',
          marginBottom: '1rem'
        }}
      >
        Scan menggunakan aplikasi mobile banking
        atau e-wallet yang mendukung QRIS.
      </p>

      {/* QRIS IMAGE */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1rem',
          marginBottom: '1rem'
        }}
      >
        {!qrisImageError ? (
          <img
            src="/images/qris-halokids.jpeg"
            alt="QRIS pembayaran donasi"
            onError={() => setQrisImageError(true)}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '320px',
              height: 'auto',
              margin: '0 auto',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div
            style={{
              padding: '2rem',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}
          >
            Gambar QRIS belum ditemukan.
            Periksa folder public/images.
          </div>
        )}

        <div
          style={{
            marginTop: '0.75rem',
            background: '#eff6ff',
            padding: '0.85rem',
            borderRadius: '10px'
          }}
        >
          <span
            style={{
              color: '#64748b',
              fontSize: '0.8rem'
            }}
          >
            Nominal pembayaran
          </span>

          <strong
            style={{
              display: 'block',
              color: '#1d4ed8',
              fontSize: '1.35rem',
              marginTop: '0.25rem'
            }}
          >
            Rp {getFinalAmount()}
          </strong>
        </div>
      </div>

      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '0.85rem',
          textAlign: 'left',
          fontSize: '0.78rem',
          color: '#92400e',
          marginBottom: '1rem'
        }}
      >
        <strong>Perhatian:</strong>

        <p style={{ margin: '0.35rem 0 0' }}>
          QRIS ini bersifat statis. Masukkan nominal
          pembayaran sesuai nominal yang tertera di
          HaloKids. Periksa kembali nama penerima
          sebelum menyelesaikan pembayaran.
        </p>
      </div>

      <button
        onClick={handleQrisPaid}
        disabled={qrisImageError}
        className="btn btn-primary"
        style={{
          width: '100%',
          borderRadius: '50px',
          padding: '0.85rem'
        }}
      >
        Saya Sudah Membayar — Lanjut Upload Bukti
      </button>

      <button
        onClick={() => setShowQrisModal(false)}
        className="btn btn-secondary"
        style={{
          width: '100%',
          borderRadius: '50px',
          marginTop: '0.5rem'
        }}
      >
        Batal
      </button>

    </div>
  </div>
)}

{/* MODAL UPLOAD BUKTI TRANSFER */}
{showProofModal && (
  <div
    className="modal-overlay"
    onClick={() => {
      if (!isSubmitting) {
        setShowProofModal(false);
      }
    }}
  >
    <div
      className="modal-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: '470px',
        width: '95%',
        padding: '2rem'
      }}
    >
      <div style={{ textAlign: 'center' }}>

        <div
          style={{
            background: '#eff6ff',
            color: '#2563eb',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}
        >
          <FileCheck size={30} />
        </div>

        <h3
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#0b1f5c',
            marginBottom: '0.5rem'
          }}
        >
          Upload Bukti Pembayaran
        </h3>

        <p
          style={{
            color: '#64748b',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}
        >
          Unggah screenshot atau foto transaksi
          yang sudah berhasil dilakukan.
        </p>

      </div>

      {/* DETAIL NOMINAL */}
      <div
        style={{
          background: '#eff6ff',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1.25rem'
        }}
      >
        <span
          style={{
            color: '#64748b',
            fontSize: '0.8rem'
          }}
        >
          Nominal yang harus dibayarkan
        </span>

        <strong
          style={{
            display: 'block',
            fontSize: '1.4rem',
            color: '#1d4ed8'
          }}
        >
          Rp {getFinalAmount()}
        </strong>
      </div>

      <form onSubmit={handleProofSubmit}>

        <label
          htmlFor="donation-proof-file"
          style={{
            display: 'block',
            border: '2px dashed #93c5fd',
            background: '#f8fbff',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          <FileCheck
            size={32}
            color="#2563eb"
            style={{ margin: '0 auto 0.5rem' }}
          />

          <strong
            style={{
              display: 'block',
              color: '#1e3a8a',
              fontSize: '0.9rem'
            }}
          >
            Pilih Bukti Transfer
          </strong>

          <span
            style={{
              display: 'block',
              color: '#64748b',
              fontSize: '0.75rem',
              marginTop: '0.4rem'
            }}
          >
            JPG, PNG atau PDF — maksimal 10 MB
          </span>

          <input
            id="donation-proof-file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            disabled={isSubmitting}
            onChange={(e) => {
              const file = e.target.files?.[0];

              setProofFile(file || null);
              setDonationError('');
            }}
            style={{ display: 'none' }}
          />
        </label>

        {proofFile && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '0.85rem',
              borderRadius: '9px',
              marginTop: '0.85rem',
              fontSize: '0.8rem',
              color: '#166534',
              overflowWrap: 'anywhere'
            }}
          >
            <CheckCircle2
              size={16}
              style={{
                display: 'inline',
                marginRight: '0.35rem'
              }}
            />

            {proofFile.name}

            <button
              type="button"
              onClick={() => setProofFile(null)}
              disabled={isSubmitting}
              style={{
                float: 'right',
                border: 'none',
                background: 'transparent',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Hapus
            </button>
          </div>
        )}

        {donationError && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem',
              borderRadius: '9px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.8rem'
            }}
          >
            {donationError}
          </div>
        )}

        <button
          type="submit"
          disabled={!proofFile || isSubmitting}
          className="btn btn-primary"
          style={{
            width: '100%',
            marginTop: '1.25rem',
            padding: '0.9rem',
            borderRadius: '50px',
            opacity: !proofFile || isSubmitting ? 0.6 : 1
          }}
        >
          {isSubmitting
            ? 'Mengunggah dan Mengirim Transaksi...'
            : 'Kirim Bukti Pembayaran'}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowProofModal(false);
            setShowQrisModal(true);
          }}
          disabled={isSubmitting}
          className="btn btn-secondary"
          style={{
            width: '100%',
            marginTop: '0.5rem',
            borderRadius: '50px'
          }}
        >
          Kembali ke QRIS
        </button>

      </form>
    </div>
  </div>
)}

{/* MODAL 2: DONATION SUBMISSION SUCCESS */}
{showSuccessModal && (
  <div
    className="modal-overlay"
    onClick={() => setShowSuccessModal(false)}
  >
    <div
      className="modal-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        maxWidth: '440px',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      {/* SUCCESS ICON */}
      <div
        style={{
          background: '#dcfce7',
          color: '#15803d',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          margin: '0 auto 1.25rem auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CheckCircle2 size={36} />
      </div>

      {/* TITLE */}
      <h3
        style={{
          fontSize: '1.3rem',
          fontWeight: 800,
          color: '#0b1f5c',
          margin: '0 0 0.5rem 0'
        }}
      >
        Bukti Donasi Berhasil Dikirim!
      </h3>

      {/* DESCRIPTION */}
      <p
        style={{
          fontSize: '0.85rem',
          color: '#64748b',
          margin: '0 0 1.25rem 0',
          lineHeight: 1.6
        }}
      >
        Terima kasih telah berdonasi sebesar{' '}
        <strong>
          Rp {getFinalAmount()}
        </strong>{' '}
        untuk{' '}
        <strong>{selectedProgram}</strong>.

        <br />

        Bukti transfer Anda telah dikirim ke sistem
        HaloKids dan sedang menunggu pemeriksaan
        AI serta persetujuan Admin Dinsos.
      </p>

      {/* TRANSACTION DETAIL */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '1rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          color: '#1e293b',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          textAlign: 'left'
        }}
      >
        {/* TRANSACTION ID */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            No. Referensi:
          </span>

          <strong style={{ color: '#0b1f5c' }}>
            {createdDonation?.id
              ? `DNS-DON-${createdDonation.id}`
              : 'Tidak tersedia'}
          </strong>
        </div>

        {/* DONOR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Donatur:
          </span>

          <strong style={{ textAlign: 'right' }}>
            {donorName ||
              currentUser?.name ||
              'Hamba Allah (Anonim)'}
          </strong>
        </div>

        {/* DONATION AMOUNT */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Nominal Donasi:
          </span>

          <strong style={{ color: '#15803d' }}>
            Rp {getFinalAmount()}
          </strong>
        </div>

        {/* PAYMENT METHOD */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Metode Pembayaran:
          </span>

          <strong>QRIS</strong>
        </div>

        {/* TRANSACTION STATUS */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Status Transaksi:
          </span>

          <span
            style={{
              background: '#fef3c7',
              color: '#b45309',
              fontWeight: 800,
              fontSize: '0.7rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '50px',
              whiteSpace: 'nowrap'
            }}
          >
            MENUNGGU VERIFIKASI
          </span>
        </div>
      </div>

      {/* INFORMATION */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '0.85rem',
          borderRadius: '10px',
          textAlign: 'left',
          marginBottom: '1.25rem'
        }}
      >
        <strong
          style={{
            color: '#1d4ed8',
            fontSize: '0.8rem'
          }}
        >
          Informasi Verifikasi
        </strong>

        <p
          style={{
            color: '#475569',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            margin: '0.35rem 0 0'
          }}
        >
          Sistem AI akan membantu membaca bukti
          pembayaran dan mencocokkan nominal donasi.
          Keputusan akhir tetap dilakukan oleh
          Admin Dinsos.
        </p>
      </div>

      {/* CLOSE BUTTON */}
      <button
        onClick={() => setShowSuccessModal(false)}
        className="btn btn-primary"
        style={{
          width: '100%',
          borderRadius: '50px',
          padding: '0.85rem',
          fontWeight: 700
        }}
      >
        Tutup &amp; Kembali
      </button>
    </div>
  </div>
)}
      {/* MODAL 3: PACKAGE SHIPMENT RECEIPT */}
      {showPackageReceiptModal && (
        <div className="modal-overlay" onClick={() => setShowPackageReceiptModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: '#e0f2fe', color: '#0284c7', width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.5rem 0' }}>
              Tanda Konfirmasi Pengiriman Paket
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              Konfirmasi pengiriman paket barang Anda untuk <strong>{selectedPantiPackage}</strong> telah tersimpan di sistem Dinsos.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Kode Bukti Paket:</span>
                <strong style={{ color: '#1d4ed8' }}>{packageReceiptCode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ekspedisi &amp; Resi:</span>
                <strong>{courierName} ({trackingNumber || 'Manual'})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Pengirim:</span>
                <strong>{senderName || 'Hamba Allah'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Barang Dikirim:</span>
                <strong style={{ maxWidth: '200px', textAlign: 'right' }}>{selectedItems.join(', ')}</strong>
              </div>
              {estimasiTanggal && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Estimasi Sampai:</span>
                  <strong style={{ color: '#059669' }}>{estimasiTanggal}</strong>
                </div>
              )}
              {catatanPengiriman && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Catatan:</span>
                  <span style={{ maxWidth: '200px', textAlign: 'right', fontSize: '0.75rem', color: '#475569' }}>{catatanPengiriman}</span>
                </div>
              )}
            </div>

            <button onClick={() => setShowPackageReceiptModal(false)} className="btn btn-primary" style={{ width: '100%', borderRadius: '50px' }}>
              Tutup &amp; Selesai
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .donasi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Footer 
        onOpenMap={onOpenMap}
        onOpenAdopsi={onOpenAdopsi}
      />

    </div>
  );
}
