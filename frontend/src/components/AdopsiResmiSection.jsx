import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  Search,
  UserCheck,
  Building2,
  BadgeCheck,
  Bot,
  Scale,
  Award
} from 'lucide-react';

export default function AdopsiResmiSection({ onOpenAdopsi }) {
  // Mini Quick Qualifier state directly on landing page
  const [quickUsia, setQuickUsia] = useState(34);
  const [quickNikah, setQuickNikah] = useState(6);

  const isEligible = quickUsia >= 30 && quickUsia <= 55 && quickNikah >= 5;

  return (
    <section
      id="adopsi-resmi-section"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%)',
        padding: '4rem 0',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background glow decoration */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(29, 78, 216, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none'
      }}></div>

      <div className="container">

        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.85rem', borderRadius: '50px', marginBottom: '0.85rem' }}>
            <Heart size={16} color="#1d4ed8" fill="#1d4ed8" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.05em' }}>
              PROSEDUR RESMI COTA • DINAS SOSIAL KABUPATEN
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            fontWeight: 800,
            color: '#0b1f5c',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.02em'
          }}>
            Layanan Permohonan Izin Adopsi Anak Resmi (Alur COTA)
          </h2>

          <p style={{ fontSize: '1rem', color: '#475569', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Prosedur pengangkatan anak yang sah secara hukum, transparan, dan terlindungi undang-undang. Didukung validasi berbasis AI OCR dan pendampingan Pekerja Sosial Profesional (Peksos).
          </p>
        </div>

        {/* 3 Main Highlights Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>

          {/* Card 1: Syarat Hukum & Kelayakan */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, boxShadow 0.2s'
          }}>
            <div>
              <div style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Scale size={24} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem' }}>
                1. Filter Kelayakan Legal COTA
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                Filter otomatis syarat batas usia hukum pemohon (30 - 55 tahun), usia pernikahan resmi minimal 5 tahun, serta status kesehatan jiwa dari RS Pemerintah.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> <span>Usia COTA: 30–55 Tahun</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> <span>Lama Menikah: Min. 5 Tahun</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} color="#16a34a" /> <span>Persetujuan Tertulis Pasangan</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAdopsi}
              style={{
                marginTop: '1.5rem',
                background: 'transparent',
                border: 'none',
                color: '#1d4ed8',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0
              }}
            >
              Cek Kelayakan Otomatis <ArrowRight size={16} />
            </button>
          </div>

          {/* Card 2: Profiling & Unggah Berkas AI OCR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, boxShadow 0.2s'
          }}>
            <div>
              <div style={{
                background: '#f0fdf4',
                color: '#16a34a',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Bot size={26} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem' }}>
                2. Verifikasi Berkas AI Agentic OCR
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                Unggah 5 kategori dokumen fisik (KTP, KK, Dokumen Medis, SKCK, Pasfoto &amp; Foto Rumah) yang akan divalidasi langsung oleh sistem AI OCR Dinsos.
              </p>

              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Sparkles size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>
                  <strong>AI OCR Agent:</strong> Otomatis mencocokkan data KTP/KK ke format Pydantic JSON schema database Dinsos.
                </span>
              </div>
            </div>

            <button
              onClick={onOpenAdopsi}
              style={{
                marginTop: '1.5rem',
                background: 'transparent',
                border: 'none',
                color: '#15803d',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0
              }}
            >
              Isi Formulir &amp; Upload Berkas <ArrowRight size={16} />
            </button>
          </div>

          {/* Card 3: Sidang PIPA & Penetapan Pengadilan */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, boxShadow 0.2s'
          }}>
            <div>
              <div style={{
                background: '#fff7ed',
                color: '#ea580c',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Award size={26} />
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.5rem' }}>
                3. Sidang PIPA &amp; Penetapan Pengadilan
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                Pendampingan Home Visit oleh Pekerja Sosial Dinsos, rekomendasi Sidang Tim PIPA, dilanjutkan pengasuhan sementara 6 bulan hingga SK Pengadilan terbit.
              </p>

              <div style={{
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                color: '#c2410c',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <BadgeCheck size={18} color="#ea580c" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tim PIPA Dinsos:</strong> Menjamin transparansi status pengajuan melalui nomor tiket resmi (PIPA Ticket).
                </span>
              </div>
            </div>

            <button
              onClick={onOpenAdopsi}
              style={{
                marginTop: '1.5rem',
                background: 'transparent',
                border: 'none',
                color: '#ea580c',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0
              }}
            >
              Lacak Status Tiket PIPA <ArrowRight size={16} />
            </button>
          </div>

        </div>

        {/* Embedded Interactive Quick Qualifier Bar */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
          borderRadius: '20px',
          padding: '2rem',
          color: '#ffffff',
          boxShadow: '0 20px 40px -15px rgba(29, 78, 216, 0.3)',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '2rem',
          alignItems: 'center'
        }} className="adopsi-cta-grid">

          <div>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '50px', textTransform: 'uppercase' }}>
              Simulasi Cepat COTA
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.5rem 0 0.4rem 0', color: '#ffffff' }}>
              Ingin Mengajukan Adopsi Anak Legal Secara Resmi?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#bfdbfe', margin: 0, lineHeight: 1.5 }}>
              Uji kualifikasi usia &amp; usia pernikahan Anda sekarang atau buka portal lengkap formulir pengajuan COTA Dinas Sosial.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button
                onClick={onOpenAdopsi}
                className="btn btn-primary"
                style={{
                  background: '#ffffff',
                  color: '#0b1f5c',
                  padding: '0.75rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}
              >
                <UserCheck size={18} /> Buka Formulir COTA Resmi
              </button>

              <button
                onClick={onOpenAdopsi}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Search size={16} /> Lacak Tiket Adopsi
              </button>
            </div>
          </div>

          {/* Embedded Mini Calculator */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h4 style={{ fontSize: '0.925rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="#fbbf24" /> Simulasi Kualifikasi COTA Cepat:
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#bfdbfe', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Usia Pemohon (Thn):
                </label>
                <input
                  type="number"
                  value={quickUsia}
                  onChange={(e) => setQuickUsia(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: '#ffffff', color: '#0b1f5c', fontWeight: 700, fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#bfdbfe', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Lama Menikah (Thn):
                </label>
                <input
                  type="number"
                  value={quickNikah}
                  onChange={(e) => setQuickNikah(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: '#ffffff', color: '#0b1f5c', fontWeight: 700, fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{
              background: isEligible ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
              border: `1px solid ${isEligible ? '#4ade80' : '#f87171'}`,
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>
                {isEligible
                  ? '🟢 Memenuhi Kriteria Syarat Usia & lama Pernikahan!'
                  : '🔴 Belum Memenuhi Kriteria Usia/Menikah'}
              </span>
              <button
                onClick={onOpenAdopsi}
                style={{ background: '#ffffff', color: '#0b1f5c', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Detail →
              </button>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 850px) {
          .adopsi-cta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
