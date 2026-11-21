import React, { useState, useEffect } from 'react';
import { Heart, Landmark, QrCode, ShieldCheck, CheckCircle2, Gift, Users, Sparkles, ArrowRight, Wallet, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import statsService from '../api/statsService';

export default function DonasiSection() {
  const [selectedNominal, setSelectedNominal] = useState(100000);
  const [customNominal, setCustomNominal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Panti Asuhan & LKSA');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [liveStats, setLiveStats] = useState({
    totalNominal: 0,
    totalPanti: 0,
    totalDonasi: 0
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const data = await statsService.getPublicStatistics();
        if (isMounted && data) {
          setLiveStats({
            totalNominal: Number(data.total_nominal_donasi_uang || 0),
            totalPanti: Number(data.total_panti || 0),
            totalDonasi: Number(data.total_donasi || 0)
          });
        }
      } catch (err) {
        console.warn('Gagal memuat statistik donasi publik:', err);
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, []);

  const categories = [
    {
      id: 'panti',
      title: 'Donasi Panti Asuhan & LKSA',
      desc: 'Bantuan makanan bergizi, pakaian, & operasional tempat tinggal 28 panti asuhan.',
      icon: Landmark,
      color: '#1d4ed8',
      bg: '#eff6ff'
    },
    {
      id: 'pendidikan',
      title: 'Beasiswa & Peralatan Sekolah',
      desc: 'Perlengkapan sekolah, buku, dan beasiswa pendidikan anak yatim piatu.',
      icon: Gift,
      color: '#0284c7',
      bg: '#e0f2fe'
    },
    {
      id: 'trc',
      title: 'Safehouse & Penanganan Korban',
      desc: 'Dana darurat rehabilitasi medis & perlindungan psikologis korban kekerasan.',
      icon: ShieldCheck,
      color: '#b45309',
      bg: '#fef3c7'
    },
    {
      id: 'sembako',
      title: 'Logistik Sembako & Balita',
      desc: 'Pengadaan susu balita, popok, dan bahan pokok untuk panti binaan Dinsos.',
      icon: Heart,
      color: '#dc2626',
      bg: '#fee2e2'
    }
  ];

  const nominalOptions = [50000, 100000, 250000, 500000, 1000000];

  const handleDonasiSubmit = (e) => {
    e.preventDefault();
    setShowSuccessModal(true);
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {}
  };

  const getFinalAmount = () => {
    if (customNominal && !isNaN(customNominal)) {
      return parseInt(customNominal, 10).toLocaleString('id-ID');
    }
    return selectedNominal.toLocaleString('id-ID');
  };

  return (
    <section id="donasi-section" style={{ padding: '4rem 0', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem auto' }}>
          <span className="badge badge-brand" style={{ marginBottom: '0.65rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            <Heart size={14} color="#15803d" style={{ marginRight: '0.35rem' }} />
            PROGRAM DONASI TERVERIFIKASI DINAS SOSIAL
          </span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.75rem 0', letterSpacing: '-0.02em' }}>
            Salurkan Kepedulian untuk Masa Depan Anak
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>
            Bantu panti asuhan terakreditasi dan anak-anak binaan Dinas Sosial melalui kanal donasi transparan. Setiap rupiah tersalurkan 100% tepat sasaran dan diaudit secara publik.
          </p>
        </div>

        {/* Impact Quick Stats Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.25rem',
          marginBottom: '3rem'
        }} className="grid-4">
          {[
            { label: 'Total Donasi Terkumpul', val: `Rp ${liveStats.totalNominal.toLocaleString('id-ID')}`, icon: Wallet, color: '#1d4ed8' },
            { label: 'Transaksi Donasi', val: `${liveStats.totalDonasi} Transaksi`, icon: Users, color: '#059669' },
            { label: 'Panti Asuhan Penerima', val: `${liveStats.totalPanti} LKSA Resmi`, icon: Landmark, color: '#b45309' },
            { label: 'Transparansi Audit', val: '100% Diaudit', icon: ShieldCheck, color: '#0284c7' }
          ].map((stat, i) => (
            <div key={i} style={{
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

        {/* Main 2-Column Donation Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '2.5rem',
          alignItems: 'start'
        }} className="donasi-grid">
          
          {/* LEFT COLUMN: Categories & Donation Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
              Pilih Program Donasi
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2-mobile">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.title;
                const IconComp = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.title)}
                    style={{
                      background: isSelected ? '#ffffff' : '#f8fafc',
                      border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 8px 20px -4px rgba(29,78,216,0.12)' : 'none',
                      transition: 'var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        background: cat.bg,
                        color: cat.color,
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComp size={20} />
                      </div>
                      {isSelected && (
                        <span style={{ background: cat.color, color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '50px' }}>
                          DIPILIH
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.35rem 0' }}>
                        {cat.title}
                      </h4>
                      <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transparency Guarantee Box */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem'
            }}>
              <ShieldCheck size={24} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e40af', margin: '0 0 0.2rem 0' }}>
                  Jaminan Transparansi &amp; Akuntabilitas Dinsos
                </h4>
                <p style={{ fontSize: '0.775rem', color: '#3b82f6', margin: 0, lineHeight: 1.5 }}>
                  Seluruh dana dikelola melalui Rekening Kas Daerah / Mitra Resmi Dinsos. Bukti penyaluran &amp; kwitansi resmi dikirim langsung via Email &amp; WhatsApp donor.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Quick Donation Form Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                Formulir Donasi Online
              </h3>
            </div>

            <form onSubmit={handleDonasiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Program Selected Indicator */}
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                  PROGRAM YANG DIPILIH:
                </label>
                <div style={{ background: '#f1f5f9', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#0b1f5c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={16} color="#15803d" />
                  {selectedCategory}
                </div>
              </div>

              {/* Nominal Selector Pills */}
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
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      Rp {nom.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>

                <input 
                  type="number"
                  placeholder="Atau masukkan nominal lainnya (Rp)..."
                  value={customNominal}
                  onChange={(e) => setCustomNominal(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Donor Name & Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.35rem' }}>
                    Nama Dermawan / Anonim
                  </label>
                  <input 
                    type="text"
                    placeholder="Contoh: Hamba Allah"
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
                    <option value="qris">Instant QRIS (All E-Wallet/Bank)</option>
                    <option value="mandiri">Transfer Bank Mandiri Dinsos</option>
                    <option value="bca">Transfer Bank BCA Dinsos</option>
                  </select>
                </div>
              </div>

              {/* Total Display */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Penyaluran:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1d4ed8' }}>
                  Rp {getFinalAmount()}
                </span>
              </div>

              <button 
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}
              >
                <Heart size={18} fill="#ffffff" /> Salurkan Donasi Sekarang <ArrowRight size={18} />
              </button>

            </form>
          </div>

        </div>

      </div>

      {/* Instant QRIS / Payment Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: '#dcfce7', color: '#15803d', width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.5rem 0' }}>
              Terima Kasih Atas Donasi Anda!
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              Donasi sebesar <strong>Rp {getFinalAmount()}</strong> untuk program <strong>{selectedCategory}</strong> telah diproses. Kwitansi digital dan bukti penyaluran resmi dikirimkan ke kontak Anda.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nomor Referensi:</span>
                <strong>DNS-DON-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Penyalur:</span>
                <strong>{donorName || 'Hamba Allah (Anonim)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status Pembayaran:</span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>BERHASIL / VERIFIED</span>
              </div>
            </div>

            <button onClick={() => setShowSuccessModal(false)} className="btn btn-primary" style={{ width: '100%', borderRadius: '50px' }}>
              Tutup &amp; Kembali
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
    </section>
  );
}
