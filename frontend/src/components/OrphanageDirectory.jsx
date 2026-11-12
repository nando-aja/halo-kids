
import React, { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { pantiService } from '../api';

export default function OrphanageDirectory({
  onSelectPanti,
  isLoggedIn,
  onOpenLogin,
}) {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [dynamicPantiList, setDynamicPantiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Ambil hanya data panti resmi dari backend.
  useEffect(() => {
    let isMounted = true;

    async function loadPanti() {
      setIsLoading(true);
      setLoadError('');

      try {
        const res = await pantiService.getPublicPantiList();

        if (!Array.isArray(res)) {
          throw new Error('Format data direktori tidak valid.');
        }

        const mapped = res.map((p, idx) => ({
          id: p.id,
          name: p.nama_panti,
          category:
            Number(p.jumlah_anak_saat_ini || 0) <= 30
              ? 'Balita'
              : 'Anak',
          akreditasi: p.status_akreditasi
            ? `AKREDITASI ${p.status_akreditasi} KEMENSOS`
            : 'TERDAFTAR RESMI',
          regNo: `NO: ${p.id}/LKSA/DINSOS`,
          image:
            p.foto_panti ||
            (idx % 2 === 0 ? '/lksa1.jpg' : '/lksa2.jpg'),
          location: p.alamat || 'Alamat belum tersedia',
          anakCount: `${p.jumlah_anak_saat_ini || 0} Anak`,
          usia: '0 - 18 Thn',
          highlight: p.deskripsi
            ? p.deskripsi.slice(0, 50)
            : 'Lembaga terdaftar resmi',
          phone: p.nomor_kontak || '-',
          address: p.alamat || 'Alamat belum tersedia',
          bank: p.rekening_bank
            ? `${p.nama_bank || 'Bank'}: ${p.rekening_bank}`
            : 'Informasi rekening belum tersedia',
          desc:
            p.deskripsi ||
            'Informasi lembaga belum tersedia.',
        }));

        if (isMounted) {
          setDynamicPantiList(mapped);
        }
      } catch (error) {
        console.error('Gagal memuat direktori LKSA:', error);

        if (isMounted) {
          setDynamicPantiList([]);
          setLoadError(
            'Data direktori belum dapat dimuat. Silakan coba kembali.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPanti();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter kategori panti.
  const filteredPanti =
    activeCategory === 'Semua'
      ? dynamicPantiList
      : dynamicPantiList.filter(
          (panti) => panti.category === activeCategory
        );

  const handleSelectPanti = (panti) => {
    if (onSelectPanti) {
      onSelectPanti(panti);
    }
  };

  return (
    <section
      id="direktori-panti"
      style={{
        padding: '4rem 0',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div className="container">

        {/* SECTION HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span
              className="badge badge-brand"
              style={{ marginBottom: '0.5rem' }}
            >
              LEMBAGA KESEJAHTERAAN SOSIAL ANAK (LKSA)
            </span>

            <h2
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                fontWeight: 800,
                color: '#0b1f5c',
                margin: 0,
              }}
            >
              Panti Asuhan Terakreditasi Unggulan
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                color: '#64748b',
                marginTop: '0.35rem',
              }}
            >
              Daftar panti asuhan yang telah melalui proses
              pendaftaran dan persetujuan Dinas Sosial.
            </p>
          </div>

          {/* FILTER KATEGORI */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#f1f5f9',
              padding: '0.3rem',
              borderRadius: '50px',
              flexWrap: 'wrap',
            }}
          >
            {['Semua', 'Balita', 'Anak', 'Remaja'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  border: 'none',
                  background:
                    activeCategory === cat
                      ? '#0b1f5c'
                      : 'transparent',
                  color:
                    activeCategory === cat
                      ? '#ffffff'
                      : '#64748b',
                  padding: '0.4rem 1rem',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* DAFTAR KARTU PANTI */}
        <div className="grid-3">

          {/* LOADING */}
          {isLoading && (
            <p
              style={{
                color: '#64748b',
                padding: '2rem',
                textAlign: 'center',
                gridColumn: '1 / -1',
              }}
            >
              Memuat data LKSA...
            </p>
          )}

          {/* ERROR */}
          {!isLoading && loadError && (
            <p
              style={{
                color: '#dc2626',
                padding: '2rem',
                textAlign: 'center',
                gridColumn: '1 / -1',
              }}
            >
              {loadError}
            </p>
          )}

          {/* DATA KOSONG */}
          {!isLoading &&
            !loadError &&
            filteredPanti.length === 0 && (
              <p
                style={{
                  color: '#64748b',
                  padding: '2rem',
                  textAlign: 'center',
                  gridColumn: '1 / -1',
                }}
              >
                Belum ada LKSA yang disetujui dan tersedia
                di direktori.
              </p>
            )}

          {/* DATA DARI BACKEND */}
          {!isLoading &&
            !loadError &&
            filteredPanti.map((panti) => (
              <div
                key={panti.id}
                className="panti-card-hover"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'var(--transition-normal)',
                }}
              >

                {/* CARD IMAGE */}
                <div
                  style={{
                    position: 'relative',
                    height: '210px',
                    background: '#f1f5f9',
                  }}
                >
                  <img
                    src={panti.image}
                    alt={panti.name}
                    onError={(event) => {
                      event.currentTarget.src = '/lksa1.jpg';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />

                  {/* BADGE */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      left: '0.75rem',
                      display: 'flex',
                      gap: '0.4rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        background: '#0b1f5c',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                      }}
                    >
                      {panti.akreditasi}
                    </span>

                    <span
                      style={{
                        background: '#1e40af',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                      }}
                    >
                      {panti.regNo}
                    </span>
                  </div>
                </div>

                {/* CARD CONTENT */}
                <div
                  style={{
                    padding: '1.25rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#0b1f5c',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {panti.name}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#64748b',
                        fontSize: '0.8rem',
                      }}
                    >
                      <MapPin size={15} color="#1d4ed8" />
                      <span>{panti.location}</span>
                    </div>
                  </div>

                  {/* STATISTIK ANAK */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#64748b',
                          fontWeight: 600,
                          display: 'block',
                        }}
                      >
                        Jumlah Anak Asuh
                      </span>

                      <strong
                        style={{
                          fontSize: '1rem',
                          color: '#1d4ed8',
                        }}
                      >
                        {panti.anakCount}
                      </strong>
                    </div>

                    <div
                      style={{
                        borderLeft: '1px solid #cbd5e1',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#64748b',
                          fontWeight: 600,
                          display: 'block',
                        }}
                      >
                        Rentang Usia
                      </span>

                      <strong
                        style={{
                          fontSize: '1rem',
                          color: '#0b1f5c',
                        }}
                      >
                        {panti.usia}
                      </strong>
                    </div>
                  </div>

                  {/* HIGHLIGHT */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.775rem',
                      color: '#047857',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    <span>{panti.highlight}</span>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                {isLoggedIn && (
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.2fr',
                      gap: '0.65rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPanti(panti)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0b1f5c',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Lihat Profil
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPanti(panti)}
                      style={{
                        background: '#0b1f5c',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Phone size={14} />
                      Donasi / Kontak
                    </button>
                  </div>
                )}

                {!isLoggedIn && onOpenLogin && (
                  <div
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderTop: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#1d4ed8',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Login untuk melihat profil
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      <style>{`
        .panti-card-hover:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-xl);
        }
      `}</style>
    </section>
  );
}
