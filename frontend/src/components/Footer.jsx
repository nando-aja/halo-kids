import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  MapPin,
  X,
  FileText,
  BookOpen,
  ArrowLeft,
  Download,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const LEGAL_DOCUMENTS = [
  {
    title: 'Undang-Undang Nomor 35 Tahun 2014',
    description: 'Perubahan atas Undang-Undang Nomor 23 Tahun 2002 tentang Perlindungan Anak.',
    file: '/documents/uu-no-35-tahun-2014-perlindungan-anak.pdf',
  },
  {
    title: 'Peraturan Pemerintah Nomor 44 Tahun 2017',
    description: 'Pelaksanaan Pengasuhan Anak.',
    file: '/documents/pp-no-44-tahun-2017-pengasuhan-anak.pdf',
  },
  {
    title: 'Peraturan Menteri Sosial Nomor 4 Tahun 2020',
    description: 'Rehabilitasi Sosial Dasar bagi Anak Telantar.',
    file: '/documents/permensos-no-4-tahun-2020-rehabilitasi-sosial-anak.pdf',
  },
  {
    title: 'Peraturan Pemerintah Nomor 54 Tahun 2007',
    description: 'Pelaksanaan Pengangkatan Anak.',
    file: '/documents/pp-no-54-tahun-2007-pengangkatan-anak.pdf',
  },
  {
    title: 'Undang-Undang Nomor 27 Tahun 2022',
    description: 'Pelindungan Data Pribadi.',
    file: '/documents/uu-no-27-tahun-2022-pelindungan-data-pribadi.pdf',
  },
  {
    title: 'Peraturan Menteri Sosial Nomor 8 Tahun 2024',
    description: 'Perubahan atas Permensos Nomor 8 Tahun 2021 tentang Penyelenggaraan Pengumpulan Uang atau Barang.',
    file: '/documents/permensos-no-8-tahun-2024-pengumpulan-uang-barang.pdf',
  },
];

const ABOUT_ITEMS = [
  {
    title: 'Akta Pendirian & SK Kemenkumham',
    description: 'Bukti bahwa pengelola platform berbadan hukum resmi (Yayasan atau Perkumpulan).',
  },
  {
    title: 'Izin Penyelenggaraan PUB',
    description: 'Nomor Surat Keputusan (SK) izin pengumpulan sumbangan dari Kemensos atau Dinas Sosial setempat.',
  },
  {
    title: 'Tanda Daftar & Akreditasi LKSA',
    description: 'Tampilkan nomor registrasi resmi dan status akreditasi pada setiap profil panti yang terdaftar di web untuk menjamin panti tersebut bukan panti fiktif.',
  },
  {
    title: 'Tanda Daftar PSE (Komdigi)',
    description: 'Bukti pendaftaran Penyelenggara Sistem Elektronik Lingkup Privat agar platform sah beroperasi secara digital.',
  },
  {
    title: 'Laporan Audit / Penyaluran Donasi',
    description: 'Ringkasan laporan keuangan atau bukti serah terima donasi ke panti secara berkala sesuai amanat transparansi PUB.',
  },
];

function FooterInfoModal({ mode, selectedDocument, onSelectDocument, onBack, onClose }) {
  const isPreviewingDocument = mode === 'regulations' && Boolean(selectedDocument);
  const isAbout = mode === 'about';
  const title = isAbout
    ? 'Tentang Kami'
    : isPreviewingDocument
      ? selectedDocument.title
      : 'Regulasi & Dasar Hukum';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="footer-info-title"
        style={{
          width: 'min(100%, 1040px)',
          height: isPreviewingDocument ? 'min(92vh, 900px)' : 'auto',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #dbeafe',
          borderRadius: '20px',
          boxShadow: '0 28px 80px rgba(2, 6, 23, 0.35)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fbff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {isPreviewingDocument ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Kembali ke daftar regulasi"
                title="Kembali ke daftar"
                style={iconButtonStyle}
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <span style={modalIconStyle}>
                {isAbout ? <Shield size={20} /> : <BookOpen size={20} />}
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <h2
                id="footer-info-title"
                style={{
                  color: '#0b1f5c',
                  fontSize: '1.05rem',
                  lineHeight: 1.3,
                  fontWeight: 800,
                  overflowWrap: 'anywhere',
                }}
              >
                {title}
              </h2>
              {!isPreviewingDocument && (
                <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  {isAbout ? 'Informasi dan gambaran platform HaloKids.' : 'Dokumen hukum yang menjadi referensi informasi HaloKids.'}
                </p>
              )}
            </div>
          </div>

          <button type="button" onClick={onClose} aria-label="Tutup" style={iconButtonStyle}>
            <X size={19} />
          </button>
        </header>

        {isPreviewingDocument ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                {selectedDocument.description}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <a href={selectedDocument.file} target="_blank" rel="noreferrer" style={secondaryActionStyle}>
                  <ExternalLink size={15} /> Buka tab baru
                </a>
                <a href={selectedDocument.file} download style={primaryActionStyle}>
                  <Download size={15} /> Unduh
                </a>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', background: '#e2e8f0' }}>
              <iframe
                key={selectedDocument.file}
                title={selectedDocument.title}
                src={`${selectedDocument.file}#toolbar=1&navpanes=0&view=FitH`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  minHeight: '360px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}
              />
            </div>
          </>
        ) : isAbout ? (
          <div style={{ padding: '1.15rem 1.25rem 1.35rem', overflowY: 'auto' }}>
            <p style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Berikut lima jenis dokumen dan informasi kelembagaan yang dicantumkan sebagai gambaran transparansi platform.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #e2e8f0' }}>
              {ABOUT_ITEMS.map((item, index) => (
                <div
                  key={item.title}
                  className="footer-about-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.7fr)',
                    gap: '1rem',
                    padding: '0.95rem 0.25rem',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <span style={numberBadgeStyle}>{index + 1}</span>
                    <strong style={{ color: '#0b1f5c', fontSize: '0.86rem', lineHeight: 1.5 }}>
                      {item.title}
                    </strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.6, margin: 0 }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.73rem', marginTop: '0.9rem' }}>
              Informasi ini merupakan konten tampilan untuk keperluan proyek mahasiswa, bukan pernyataan bahwa dokumen tersebut telah dimiliki atau diverifikasi.
            </p>
          </div>
        ) : (
          <div style={{ padding: '1.15rem 1.25rem 1.35rem', overflowY: 'auto' }}>
            <p style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              Pilih salah satu nomor untuk melihat dokumen hukum dalam pratinjau.
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {LEGAL_DOCUMENTS.map((document, index) => (
                <li key={document.file}>
                  <button
                    type="button"
                    onClick={() => onSelectDocument(document)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.9rem',
                      textAlign: 'left',
                      border: '1px solid #dbeafe',
                      borderRadius: '12px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'background 150ms ease, border-color 150ms ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = '#eff6ff';
                      event.currentTarget.style.borderColor = '#93c5fd';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = '#ffffff';
                      event.currentTarget.style.borderColor = '#dbeafe';
                    }}
                  >
                    <span style={numberBadgeStyle}>{index + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', color: '#0b1f5c', fontSize: '0.88rem', lineHeight: 1.45 }}>
                        {document.title}
                      </strong>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.15rem' }}>
                        {document.description}
                      </span>
                    </span>
                    <ChevronRight size={19} color="#2563eb" style={{ flexShrink: 0 }} />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
      <style>{`
        @media (max-width: 640px) {
          .footer-about-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const modalIconStyle = {
  width: '40px',
  height: '40px',
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  color: '#1d4ed8',
  background: '#dbeafe',
  borderRadius: '12px',
};

const iconButtonStyle = {
  width: '38px',
  height: '38px',
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  background: '#ffffff',
  cursor: 'pointer',
};

const numberBadgeStyle = {
  width: '30px',
  height: '30px',
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  color: '#ffffff',
  background: '#1d4ed8',
  borderRadius: '9px',
  fontSize: '0.82rem',
  fontWeight: 800,
};

const secondaryActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  padding: '0.45rem 0.7rem',
  color: '#1e40af',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  background: '#eff6ff',
  fontSize: '0.76rem',
  fontWeight: 700,
  textDecoration: 'none',
};

const primaryActionStyle = {
  ...secondaryActionStyle,
  color: '#ffffff',
  background: '#1d4ed8',
  borderColor: '#1d4ed8',
};

export default function Footer() {
  const [activePanel, setActivePanel] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setSelectedDocument(null);
  }, []);

  const openRegulations = () => {
    setSelectedDocument(null);
    setActivePanel('regulations');
  };

  const openAbout = () => {
    setSelectedDocument(null);
    setActivePanel('about');
  };

  return (
    <>
      <footer style={{ background: '#07153b', color: '#cbd5e1', paddingTop: '3.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container">
          <div className="footer-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: '2.5rem',
            paddingBottom: '3rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Shield size={20} />
                </div>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                  HaloKids <span style={{ color: '#60a5fa', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>LAYANAN SOSIAL TERPADU</span>
                </span>
              </div>

              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                Sistem Informasi Manajemen Terpadu Panti Asuhan, Layanan Perlindungan Korban Kekerasan Anak, dan Pengawasan Pengangkatan Anak Terintegrasi Dinas Sosial.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} color="#34d399" /> Terverifikasi Kemenkominfo RI
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} color="#34d399" /> Audit Sistem Keamanan Siber BSSN
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.85rem', fontSize: '0.825rem' }}>
                <button
                  type="button"
                  onClick={openRegulations}
                  className="footer-link"
                  style={{ ...footerLinkStyle, fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.15rem' }}
                >
                  Regulasi & Dasar Hukum
                </button>
                <button type="button" onClick={openAbout} className="footer-link" style={{ ...footerLinkStyle, fontSize: '0.825rem', fontWeight: 400 }}>
                  Tentang Kami
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>
                Kontak & Posko Pelayanan
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <MapPin size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Gedung Pelayanan Terpadu Dinas Sosial, Komplek Perkantoran Pemda</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Phone size={15} color="#60a5fa" />
                  <span>129 / (021) 879-2000 (Ext 1102)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Mail size={15} color="#60a5fa" />
                  <span>dinsos-pelindungananak@pemkab.go.id</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Clock size={15} color="#60a5fa" />
                  <span>Jam Pelayanan Kantor: 08.00 - 16.00 WIB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {activePanel && (
        <FooterInfoModal
          mode={activePanel}
          selectedDocument={selectedDocument}
          onSelectDocument={setSelectedDocument}
          onBack={() => setSelectedDocument(null)}
          onClose={closePanel}
        />
      )}

      <style>{`
        .footer-link { color: #cbd5e1; text-decoration: none; font: inherit; padding: 0; background: transparent; border: 0; cursor: pointer; text-align: left; }
        .footer-link:hover { color: #60a5fa !important; text-decoration: underline !important; }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; } }
        @media (max-width: 640px) {
          .footer-about-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

const footerLinkStyle = {
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: '0.86rem',
  fontWeight: 600,
  padding: '0.2rem 0',
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
  textAlign: 'left',
};
