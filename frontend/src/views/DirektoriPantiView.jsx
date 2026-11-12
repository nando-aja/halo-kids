import React, { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Phone, CheckCircle2, ShieldCheck, Heart, Package, Copy, ExternalLink, Filter } from 'lucide-react';
import Footer from '../components/Footer';
import pantiService from '../api/pantiService';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DirektoriPantiView({
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
  onSelectPanti,
  activeTab,
  setActiveTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [copiedId, setCopiedId] = useState(null);
 const [apiPantiList, setApiPantiList] = useState([]);
 const [isLoading, setIsLoading] = useState(true);
 const [loadError, setLoadError] = useState('');

  // Fetch data direktori dan wishlist panti dari backend FastAPI
useEffect(() => {
  let isMounted = true;

  async function fetchPanti() {
    setIsLoading(true);
    setLoadError('');

    try {
      const rawList = await pantiService.getPublicPantiList();

      if (!Array.isArray(rawList)) {
        throw new Error('Format data direktori tidak valid.');
      }

      const mapped = await Promise.all(
        rawList.map(async (p, idx) => {
          let goods = [];

          try {
            const wishlists = await pantiService.getPublicWishlist(p.id);

            if (Array.isArray(wishlists)) {
              goods = wishlists.map(
                (w) =>
                  `${w.nama_barang} (${w.jumlah_terpenuhi}/${w.jumlah_kebutuhan})`
              );
            }
          } catch (error) {
            console.warn('Wishlist panti gagal dimuat:', error);
          }

          return {
            id: p.id,
            name: p.nama_panti,
            category:
              p.jumlah_anak_saat_ini <= 30 ? 'Balita' : 'Anak',
            akreditasi: p.status_akreditasi
              ? `AKREDITASI ${p.status_akreditasi} KEMENSOS`
              : 'TERDAFTAR RESMI',
            regNo: `NO: ${p.id}/LKSA/DINSOS`,
            image:
              p.foto_panti ||
              (idx % 2 === 0 ? '/lksa1.jpg' : '/lksa2.jpg'),
            kecamatan: p.alamat
              ? p.alamat.split('•')[0].trim()
              : '-',
            location: p.alamat || 'Alamat belum tersedia',
            address: p.alamat || 'Alamat belum tersedia',
            anakCount: `${p.jumlah_anak_saat_ini || 0} Anak`,
            usia: '0 - 18 Thn',
            highlight: p.deskripsi
              ? p.deskripsi.slice(0, 60)
              : 'Lembaga terdaftar',
            phone: p.nomor_kontak || '-',
            pengurus: 'Pengurus LKSA',
            bank: p.rekening_bank
              ? `${p.nama_bank || 'Bank'}: ${p.rekening_bank} a.n ${
                  p.atas_nama_rekening || p.nama_panti
                }`
              : 'Informasi rekening belum tersedia',
            neededGoods: goods,
            desc: p.deskripsi || 'Informasi lembaga belum tersedia.',
          };
        })
      );

      if (isMounted) {
        setApiPantiList(mapped);
      }
    } catch (error) {
      console.error('Gagal memuat direktori LKSA:', error);

      if (isMounted) {
        setApiPantiList([]);
        setLoadError(
          'Direktori LKSA belum dapat dimuat. Silakan coba kembali.'
        );
      }
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  fetchPanti();

  return () => {
    isMounted = false;
  };
}, []);


 const displayPantiList = apiPantiList;

  // Filtering logic
  const filteredPanti = displayPantiList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.neededGoods.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedCategory === 'Semua') return matchesSearch;
    if (selectedCategory === 'Akreditasi A') return matchesSearch && p.akreditasi.includes('AKREDITASI A');
    return matchesSearch && p.category === selectedCategory;
  });

  const handleCopyAddress = (panti) => {
    navigator.clipboard.writeText(panti.address);
    setCopiedId(panti.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Hero Header Section for Directory */}
      <section style={{
        background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
        color: '#ffffff',
        padding: '3.5rem 0 3rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '800px' }}>
            <span className="badge" style={{ background: '#3b82f6', color: '#ffffff', marginBottom: '0.75rem', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>
              LEMBAGA KESEJAHTERAAN SOSIAL ANAK (LKSA) RESMI
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, margin: '0 0 0.85rem 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Direktori Panti Asuhan Terdaftar
            </h1>
            <p style={{ fontSize: '1rem', color: '#bfdbfe', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
              Temukan data panti asuhan terakreditasi di Kabupaten Bogor. Dapatkan alamat lengkap pengiriman paket logistik, daftar barang kebutuhan panti, serta saluran donasi langsung.
            </p>
          </div>

          {/* Interactive Search Bar (Requirement 5) */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '0.65rem 0.85rem',
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            maxWidth: '720px'
          }}>
            <Search size={22} color="#1d4ed8" style={{ flexShrink: 0 }} />
            <input 
              type="text"
              placeholder="Contoh: Cari nama panti, kecamatan Cibinong, atau kebutuhan sembako..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                color: '#0f172a',
                fontWeight: 500
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section style={{ padding: '1.75rem 0 4rem 0', flex: 1 }}>
        <div className="container">
          
          {/* Controls Bar: Category Filters & Count */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={18} color="#0b1f5c" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0b1f5c' }}>
                Kategori Panti:
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {['Semua', 'Balita', 'Anak', 'Remaja', 'Akreditasi A'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      border: 'none',
                      background: selectedCategory === cat ? '#0b1f5c' : '#ffffff',
                      color: selectedCategory === cat ? '#ffffff' : '#64748b',
                      padding: '0.45rem 0.95rem',
                      borderRadius: '50px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid #cbd5e1',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
<div className="panti-cards-grid">
  {isLoading && (
    <p style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>
      Memuat data LKSA dari server...
    </p>
  )}

  {!isLoading && loadError && (
    <p style={{ color: '#dc2626', padding: '2rem', textAlign: 'center' }}>
      {loadError}
    </p>
  )}

  {!isLoading && !loadError && filteredPanti.map((panti) => (
              <div 
                key={panti.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'var(--transition-normal)'
                }}
              >
                {/* Header Image & Badges */}
                <div style={{ position: 'relative', height: '210px', background: '#f1f5f9' }}>
                  <img 
                    src={panti.image} 
                    alt={panti.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      background: '#0b1f5c',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      {panti.akreditasi}
                    </span>
                    <span style={{
                      background: '#1e40af',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}>
                      {panti.regNo}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '1.35rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                      {panti.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
                      <MapPin size={15} color="#1d4ed8" style={{ flexShrink: 0 }} />
                      <span>{panti.location}</span>
                    </div>
                  </div>

                  {/* Stats Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    textAlign: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                        Anak Asuh
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>
                        {panti.anakCount}
                      </strong>
                    </div>

                    <div style={{ borderLeft: '1px solid #cbd5e1' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                        Rentang Usia
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#0b1f5c' }}>
                        {panti.usia}
                      </strong>
                    </div>
                  </div>

                  {/* Address & Copy Action Box */}
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.75rem 0.85rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 700, display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                      Alamat Pengiriman Paket Logistik:
                    </span>
                    <p style={{ fontSize: '0.775rem', color: '#1e293b', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                      {panti.address}
                    </p>
                    <button
                      onClick={() => handleCopyAddress(panti)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #93c5fd',
                        color: '#1d4ed8',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '50px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Copy size={12} /> {copiedId === panti.id ? '✔ Alamat Tersalin!' : 'Salin Alamat Paket'}
                    </button>
                  </div>

                  {/* Urgent Goods Needed */}
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                      <Package size={14} color="#dc2626" /> Kebutuhan Mendesak Panti:
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {panti.neededGoods.map((item, idx) => (
                        <span key={idx} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Footer Action Buttons */}
                <div style={{
                  padding: '1rem 1.25rem',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem'
                }}>
                  <button 
                    onClick={() => {
                      if (onSelectPanti) onSelectPanti(panti);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0b1f5c',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    Profil Detail
                  </button>

                  <button 
                    onClick={() => {
                      if (onSwitchToDonasi) onSwitchToDonasi();
                    }}
                    style={{
                      background: '#0b1f5c',
                      border: 'none',
                      color: '#ffffff',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 10px rgba(11,31,92,0.2)'
                    }}
                  >
                    <Heart size={14} fill="#ffffff" /> Donasi &amp; Paket
                  </button>
                </div>

              </div>
            ))}
          </div>

          {!isLoading && !loadError && filteredPanti.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Building2 size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.5rem 0' }}>
                Tidak Ada Panti Yang Cocok Dengan Pencarian
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
                Coba gunakan kata kunci lain seperti nama kecamatan (Cibinong, Ciawi, Parung) atau kategori panti.
              </p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); }} className="btn btn-primary" style={{ borderRadius: '50px' }}>
                Reset Pencarian
              </button>
            </div>
          )}

        </div>
      </section>

      <Footer 
        onOpenMap={onOpenMap}
        onOpenAdopsi={onOpenAdopsi}
      />

    </div>
  );
}
