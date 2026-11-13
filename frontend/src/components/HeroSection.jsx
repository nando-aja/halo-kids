import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ShieldCheck, Lock, Award, HeartHandshake, ArrowRight, UserCheck, Megaphone,
  Building2, PhoneCall, FileCheck2, EyeOff, LogIn, ClipboardList, BadgeCheck, UserPlus
} from 'lucide-react';

const SLIDE_INTERVAL_MS = 3000;

export default function HeroSection({
  onOpenLapor,
  onOpenHotline,
  onOpenAdopsi,
  onOpenLogin,
  onOpenRegisterPanti
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const slides = [
    {
      id: 'info',
      tab: 'Tentang HaloKids',
      badge: { icon: ShieldCheck, text: 'PORTAL PELINDUNGAN TERPADU • DINAS SOSIAL KABUPATEN', tone: 'blue' },
      title: 'Bersama Lindungi',
      titleAccent: 'Masa Depan Anak Indonesia',
      accent: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
      desc: 'Sistem terintegrasi pemantauan 28 LKSA terakreditasi, penanganan darurat kekerasan anak dengan jaminan kerahasiaan identitas, dan transparansi donasi terverifikasi.',
      note: {
        icon: Lock,
        iconBg: '#e0e7ff',
        iconColor: '#3730a3',
        title: 'Komitmen Pelapor 100% Anonim',
        text: 'Laporan Anda dilindungi tingkat tinggi. Identitas pelapor/korban dilindungi UU Perlindungan Saksi dan Korban (LPSK) tanpa pungutan biaya.'
      },
      ctas: [],
      image: '/hero.jpg',
      imageAlt: 'Perlindungan Anak Indonesia Dinsos',
      tag: { icon: Award, iconColor: '#fbbf24', text: 'Kabupaten Layanan Anak (KLA) Nindya ★' },
      quote: '"Hak setiap anak adalah bertumbuh bebas dari rasa takut dan ditopang masa depannya."',
      quoteSrc: 'Dinsos Terkoordinasi • 2024',
      stat: { icon: HeartHandshake, label: 'Penanganan Khusus', value: '45 Anak Safehouse' }
    },
    {
      id: 'adopsi',
      tab: 'Adopsi Anak',
      badge: { icon: UserCheck, text: 'ADOPSI RESMI • PENGAJUAN COTA', tone: 'green' },
      title: 'Siap Menjadi Orang Tua?',
      titleAccent: 'Ajukan Adopsi Resmi',
      accent: 'linear-gradient(135deg, #15803d 0%, #0d9488 100%)',
      desc: 'Ajukan permohonan calon orang tua angkat (COTA) langsung dari rumah. Berkas Anda diperiksa Dinsos, dan setiap tahap prosesnya bisa dipantau kapan saja.',
      note: {
        icon: FileCheck2,
        iconBg: '#dcfce7',
        iconColor: '#15803d',
        title: 'Sah secara hukum, demi kepentingan terbaik anak',
        text: 'Setiap permohonan melewati verifikasi dokumen dan asesmen oleh Dinas Sosial sebelum ada keputusan.'
      },
      ctas: [
        { label: 'Ajukan Adopsi', icon: ArrowRight, onClick: onOpenAdopsi, variant: 'green' }
      ],
      image: '/lksa2.jpg',
      imageAlt: 'Anak-anak bermain bersama pengasuh di ruang bermain panti',
      tag: { icon: UserCheck, iconColor: '#86efac', text: 'Prosedur Resmi COTA' },
      quote: '"Setiap anak berhak tumbuh dalam keluarga yang menyayanginya."',
      quoteSrc: 'Layanan Adopsi Dinsos',
      stat: { icon: ClipboardList, label: 'Pengajuan', value: 'Online & Terlacak' }
    },
    {
      id: 'lapor',
      tab: 'Lapor Kekerasan',
      badge: { icon: Megaphone, text: 'LAPOR KEKERASAN ANAK • 24/7', tone: 'red' },
      title: 'Melihat Anak Disakiti?',
      titleAccent: 'Jangan Diam, Laporkan',
      accent: 'linear-gradient(135deg, #dc2626 0%, #be123c 100%)',
      desc: 'Satu laporan bisa menyelamatkan satu anak. Sampaikan kejadian yang Anda lihat atau alami, tim Dinsos akan menindaklanjutinya dengan cepat dan rahasia.',
      note: {
        icon: EyeOff,
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        title: 'Identitas pelapor dirahasiakan',
        text: 'Anda tidak perlu mengaku, tidak dipungut biaya, dan bisa melacak perkembangan laporan memakai nomor tiket.'
      },
      ctas: [
        { label: 'Laporkan Sekarang', icon: Megaphone, onClick: onOpenLapor, variant: 'red' },
        { label: 'Hubungi Hotline', icon: PhoneCall, onClick: onOpenHotline, variant: 'outline' }
      ],
      image: '/lapor.jpg',
      imagePos: '30% center',
      imageAlt: 'Anak duduk murung memeluk lutut di lorong rumah',
      tag: { icon: Megaphone, iconColor: '#fca5a5', text: 'Kanal Darurat 24/7' },
      quote: '"Anak yang aman adalah tanggung jawab kita bersama."',
      quoteSrc: 'Layanan Pengaduan Dinsos',
      stat: { icon: EyeOff, label: 'Identitas Pelapor', value: 'Dirahasiakan' }
    },
    {
      id: 'panti',
      tab: 'Daftar Panti',
      badge: { icon: Building2, text: 'MITRA LKSA • PENGELOLA PANTI', tone: 'blue' },
      title: 'Sudah Punya Panti?',
      titleAccent: 'Buat Akun Panti Anda',
      accent: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)',
      desc: 'Daftarkan panti Anda agar tercatat dan terpantau resmi di HaloKids. Kelola data anak asuh, kebutuhan, dan donasi dalam satu tempat.',
      steps: ['Buat akun pengelola', 'Lengkapi pengajuan & dokumen', 'Disetujui Dinsos'],
      ctas: [
        { label: 'Buat Akun Panti', icon: UserPlus, onClick: onOpenRegisterPanti, variant: 'blue' },
        { label: 'Sudah punya akun? Masuk', icon: LogIn, onClick: onOpenLogin, variant: 'outline' }
      ],
      image: '/lksa3.jpg',
      imageAlt: 'Anak-anak belajar di laboratorium komputer',
      tag: { icon: BadgeCheck, iconColor: '#93c5fd', text: 'Terhubung Langsung ke Dinsos' },
      quote: '"Panti yang terdata resmi memudahkan bantuan sampai ke anak yang membutuhkan."',
      quoteSrc: 'Program Kemitraan LKSA',
      stat: { icon: Building2, label: 'Status Panti', value: 'Resmi Setelah Verifikasi' }
    }
  ];

  const goTo = useCallback((i) => {
    setIndex((i + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay: pindah slide tiap SLIDE_INTERVAL_MS. Timer di-reset setiap slide berganti
  // (termasuk saat diklik manual) dan berhenti selama kursor/keyboard ada di hero.
  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  const handleTabKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
  };

  const badgeTones = {
    blue:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    green: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    red:   { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
  };

  return (
    <section
      id="hero"
      aria-roledescription="carousel"
      aria-label="Layanan utama HaloKids"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false); }}
      onFocus={(e) => { if (e.target.matches?.(':focus-visible')) setPaused(true); }}
      onBlur={() => setPaused(false)}
      style={{
        background: 'var(--bg-gradient-hero)',
        padding: '3rem 0 2.5rem 0',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decoration glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
        pointerEvents: 'none'
      }}></div>

      <div className="container">
        {/* Semua slide berjajar horizontal di dalam track; track digeser untuk pindah slide */}
        <div
          className="hero-stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
         <div
          className="hero-track"
          style={{ transform: `translateX(calc(${-index * 100}% - ${index * 3}rem))` }}
         >
          {slides.map((s, i) => {
            const active = i === index;
            const BadgeIcon = s.badge.icon;
            const tone = badgeTones[s.badge.tone];
            const NoteIcon = s.note?.icon;
            const TagIcon = s.tag.icon;
            const StatIcon = s.stat.icon;

            return (
              <div
                key={s.id}
                id={`hero-slide-${s.id}`}
                role="tabpanel"
                aria-roledescription="slide"
                aria-label={`${i + 1} dari ${slides.length}`}
                aria-hidden={!active}
                inert={!active}
                className={`hero-slide ${active ? 'is-active' : ''}`}
              >
                <div className="hero-grid">
                  {/* Kolom kiri: teks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <span className="badge badge-brand" style={{
                        fontSize: '0.725rem',
                        padding: '0.35rem 0.85rem',
                        background: tone.bg,
                        color: tone.color,
                        border: `1px solid ${tone.border}`
                      }}>
                        <BadgeIcon size={14} color={tone.color} />
                        {s.badge.text}
                      </span>
                    </div>

                    <h1 style={{
                      fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
                      fontWeight: 800,
                      lineHeight: 1.15,
                      color: '#0b1f5c',
                      margin: 0,
                      letterSpacing: '-0.03em'
                    }}>
                      {s.title} <br />
                      <span style={{
                        background: s.accent,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {s.titleAccent}
                      </span>
                    </h1>

                    <p style={{ fontSize: '1.025rem', color: '#475569', lineHeight: 1.6, maxWidth: '620px', margin: 0 }}>
                      {s.desc}
                    </p>

                    {/* Kartu info slide */}
                    {s.note && (
                      <div className="hero-note">
                        <div style={{
                          background: s.note.iconBg, color: s.note.iconColor, padding: '0.65rem',
                          borderRadius: '10px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0
                        }}>
                          <NoteIcon size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0b1f5c', marginBottom: '0.2rem' }}>
                            {s.note.title}
                          </h4>
                          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                            {s.note.text}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Langkah (khusus slide panti, memang urutan proses) */}
                    {s.steps && (
                      <ol className="hero-steps">
                        {s.steps.map((st, n) => (
                          <li key={st}>
                            <span className="hero-step-num">{n + 1}</span>
                            {st}
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Tombol aksi */}
                    {s.ctas.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {s.ctas.map((c) => {
                          const CIcon = c.icon;
                          return (
                            <button
                              key={c.label}
                              type="button"
                              onClick={c.onClick}
                              className={`hero-cta hero-cta-${c.variant}`}
                            >
                              <CIcon size={17} />
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Kolom kanan: visual */}
                  <div style={{ position: 'relative' }}>
                    <div className="hero-visual">
                      <img
                        src={s.image}
                        alt={s.imageAlt}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        style={{ objectPosition: s.imagePos || 'center' }}
                        className="hero-img"
                      />

                      <div className="hero-tag">
                        <TagIcon size={15} color={s.tag.iconColor} />
                        {s.tag.text}
                      </div>

                      <div className="hero-quote">
                        <p style={{
                          fontSize: '0.925rem', fontStyle: 'italic', fontWeight: 500,
                          lineHeight: 1.4, margin: '0 0 0.5rem 0', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                          {s.quote}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#93c5fd', opacity: 0.9 }}>
                          {s.quoteSrc}
                        </span>
                      </div>
                    </div>

                    <div className="hero-stat desktop-only">
                      <div style={{
                        background: '#eff6ff', color: '#1d4ed8', padding: '0.5rem', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <StatIcon size={20} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          {s.stat.label}
                        </span>
                        <strong style={{ fontSize: '0.95rem', color: '#0b1f5c' }}>
                          {s.stat.value}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
         </div>
        </div>

        {/* Navigasi slide: titik-titik */}
        <div className="hero-dots" role="tablist" aria-label="Pilih slide">
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`hero-slide-${s.id}`}
                aria-label={`Slide ${i + 1}: ${s.tab}`}
                tabIndex={active ? 0 : -1}
                onClick={() => goTo(i)}
                onKeyDown={handleTabKey}
                className={`hero-dot ${active ? 'is-active' : ''}`}
              >
                <span className="hero-dot-mark" />
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .hero-stage {
          overflow: hidden;
          /* ruang ekstra supaya bayangan & kartu melayang tidak terpotong */
          padding: 1.5rem 1rem 2.25rem;
          margin: -1.5rem -1rem -2.25rem;
        }
        .hero-track {
          display: flex;
          gap: 3rem;
          transition: transform 0.6s cubic-bezier(0.65, 0, 0.35, 1);
          will-change: transform;
        }
        .hero-slide {
          flex: 0 0 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .hero-slide.is-active { opacity: 1; pointer-events: auto; }
        .hero-slide > .hero-grid { width: 100%; }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2.5rem;
          align-items: center;
        }
        .hero-note {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          box-shadow: var(--shadow-sm);
        }
        .hero-steps {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin: 0;
          padding: 0;
        }
        .hero-steps li {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 50px;
          padding: 0.4rem 0.9rem 0.4rem 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0b1f5c;
          box-shadow: var(--shadow-sm);
        }
        .hero-step-num {
          width: 22px; height: 22px; border-radius: 50%;
          background: #1d4ed8; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700;
        }
        .hero-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-family: var(--font-heading);
          font-weight: 700; font-size: 0.925rem;
          padding: 0.8rem 1.4rem;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .hero-cta:hover { transform: translateY(-2px); }
        .hero-cta:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
        .hero-cta-green { background: #15803d; color: #fff; box-shadow: 0 6px 16px rgba(21,128,61,0.28); }
        .hero-cta-green:hover { background: #166534; }
        .hero-cta-red { background: #dc2626; color: #fff; box-shadow: 0 6px 16px rgba(220,38,38,0.3); }
        .hero-cta-red:hover { background: #b91c1c; }
        .hero-cta-blue { background: #1d4ed8; color: #fff; box-shadow: 0 6px 16px rgba(29,78,216,0.28); }
        .hero-cta-blue:hover { background: #1e40af; }
        .hero-cta-outline { background: #ffffff; color: #0b1f5c; border-color: #cbd5e1; }
        .hero-cta-outline:hover { background: #f8fafc; }

        .hero-visual {
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          border: 4px solid #ffffff;
          position: relative;
          background: #0b1f5c;
        }
        .hero-img { width: 100%; height: 460px; object-fit: cover; display: block; }
        .hero-tag {
          position: absolute; top: 1.25rem; left: 1.25rem;
          background: rgba(11, 31, 92, 0.85);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.4rem 0.85rem;
          border-radius: 50px;
          font-size: 0.75rem; font-weight: 700;
          display: flex; align-items: center; gap: 0.4rem;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .hero-quote {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(180deg, rgba(11,31,92,0) 0%, rgba(7,21,59,0.95) 100%);
          padding: 2rem 1.5rem 1.25rem 1.5rem;
          color: #ffffff;
        }
        .hero-stat {
          position: absolute; bottom: -1rem; left: -1rem;
          background: #ffffff;
          padding: 0.85rem 1.25rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid #e2e8f0;
          display: flex; align-items: center; gap: 0.75rem;
        }

        .hero-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.1rem;
          margin-top: 1.75rem;
        }
        .hero-dot {
          background: none; border: none; cursor: pointer;
          padding: 0.6rem 0.3rem;
          display: inline-flex; align-items: center;
        }
        .hero-dot:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; border-radius: 999px; }
        .hero-dot-mark {
          display: block; width: 10px; height: 10px; border-radius: 999px;
          background: #cbd5e1;
          transition: width 0.35s ease, background-color 0.25s ease;
        }
        .hero-dot:hover .hero-dot-mark { background: #94a3b8; }
        .hero-dot.is-active .hero-dot-mark { width: 28px; background: #1d4ed8; }

        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr; gap: 1.75rem; }
          .hero-img { height: 280px; }
          .hero-dots { margin-top: 1.25rem; }
          .hero-cta { flex: 1 1 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-track, .hero-slide { transition: none; }
          .hero-cta:hover { transform: none; }
        }
      `}</style>
    </section>
  );
}
