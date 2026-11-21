import React from 'react';
import { Megaphone, Search, Building2, UserCheck, ArrowRight } from 'lucide-react';

export default function QuickActions({ onOpenLapor, onOpenLacak, onOpenKonsultasi, onScrollPanti, onOpenAdopsi }) {
  const actions = [
    {
      id: 'adopsi',
      title: 'Permohonan Adopsi Resmi (COTA)',
      desc: 'Alur izin & pengajuan orang tua angkat legal',
      icon: UserCheck,
      bgIcon: '#dcfce7',
      colorIcon: '#15803d',
      onClick: onOpenAdopsi
    },
    {
      id: 'lapor',
      title: 'Lapor Kekerasan / Eksploitasi',
      desc: 'Kanal rahasia pelindungan anak 24/7',
      icon: Megaphone,
      bgIcon: '#fee2e2',
      colorIcon: '#dc2626',
      onClick: onOpenLapor
    },
    {
      id: 'lacak',
      title: 'Lacak Status Tiket',
      desc: 'Pantau pengaduan & COTA real-time',
      icon: Search,
      bgIcon: '#e0e7ff',
      colorIcon: '#3730a3',
      onClick: onOpenLacak
    },
    {
      id: 'direktori',
      title: 'Direktori Panti Terakreditasi',
      desc: '28 Lembaga Kesejahteraan Sosial Anak',
      icon: Building2,
      bgIcon: '#dbeafe',
      colorIcon: '#1d4ed8',
      onClick: onScrollPanti
    }
  ];

  return (
    <section style={{ padding: '2rem 0', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {actions.map((act) => {
            const IconComp = act.icon;
            return (
              <div 
                key={act.id}
                onClick={act.onClick}
                className="quick-action-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.25rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-normal)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    background: act.bgIcon,
                    color: act.colorIcon,
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.04)'
                  }}>
                    <IconComp size={24} />
                  </div>

                  {act.badge && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '50px',
                      background: act.bgIcon,
                      color: act.colorIcon
                    }}>
                      {act.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0b1f5c',
                    marginBottom: '0.25rem',
                    lineHeight: 1.3
                  }}>
                    {act.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    {act.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: act.colorIcon,
                  marginTop: '0.25rem'
                }}>
                  Akses Layanan <ArrowRight size={15} className="arrow-icon" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: #cbd5e1;
        }
        .quick-action-card:hover .arrow-icon {
          transform: translateX(4px);
          transition: transform 0.2s ease;
        }
      `}</style>
    </section>
  );
}
