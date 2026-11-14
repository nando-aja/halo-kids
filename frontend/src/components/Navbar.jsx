import React, { useState } from 'react';
import { HeartHandshake, UserCheck, Menu, X, MessageCircle, LogOut, User, Lock, Unlock, Building2, Heart, FileText, Home, LayoutDashboard } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({
  isLoggedIn = false,
  currentUser = null,
  onOpenHotline,
  onOpenLogin,
  onLogout,
  onToggleLoginDemo,
  activeTab,
  setActiveTab,
  onSwitchToPengaduan,
  onSwitchToLanding,
  onSwitchToPanti,
  onSwitchToDonasi,
  onSwitchToAdopsi,
  onSwitchToDashboard
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tabName) => {
    setActiveTab(tabName);
    setMobileMenuOpen(false);

    if (tabName === 'beranda' && onSwitchToLanding) {
      onSwitchToLanding();
    } else if (tabName === 'pengaduan' && onSwitchToPengaduan) {
      onSwitchToPengaduan();
    } else if (tabName === 'panti' && onSwitchToPanti) {
      onSwitchToPanti();
    } else if (tabName === 'donasi' && onSwitchToDonasi) {
      onSwitchToDonasi();
    } else if (tabName === 'adopsi' && onSwitchToAdopsi) {
      onSwitchToAdopsi();
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 4px 20px -5px rgba(11, 31, 92, 0.08)',
      borderBottom: '1px solid #e2e8f0'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.5rem',
        gap: '1rem'
      }}>
        {/* Brand Logo Div */}
        <div
          onClick={() => handleNavClick('beranda')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
            color: '#ffffff',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(29, 78, 216, 0.3)'
          }}>
            <HeartHandshake size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: '800',
                color: '#0b1f5c',
                letterSpacing: '-0.03em'
              }}>
                HaloKids
              </span>
              <span style={{
                background: '#1e40af',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: '800',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}>
                LAYANAN SOSIAL TERPADU
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500', margin: 0 }}>
              Pemerintah Kabupaten • Layanan Sosial Terpadu
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links (HANYA Beranda & Pengaduan saat belum login) */}
        <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto', marginRight: '0.5rem' }}>
          
          {/* Nav 1: Beranda Informasi (Always Visible) */}
          <button
            className={`nav-link ${activeTab === 'beranda' ? 'active' : ''}`}
            onClick={() => handleNavClick('beranda')}
          >
            Beranda Informasi
          </button>
          
          {/* Nav 2: Formulir Pengaduan (Always Visible) */}
          <button
            className={`nav-link ${activeTab === 'pengaduan' ? 'active' : ''}`}
            onClick={() => handleNavClick('pengaduan')}
            style={{
              color: activeTab === 'pengaduan' ? '#1d4ed8' : '#0b1f5c',
              fontWeight: 700
            }}
          >
            Formulir Pengaduan
          </button>

          {/* Nav 3, 4, 5 (Direktori Panti, Donasi, Adopsi Resmi) HANYA TAMPIL SETELAH LOGIN */}
          {isLoggedIn && (
            <>
              <button
                className={`nav-link ${activeTab === 'panti' ? 'active' : ''}`}
                onClick={() => handleNavClick('panti')}
              >
                Direktori Panti
              </button>

              <button
                className={`nav-link ${activeTab === 'donasi' ? 'active' : ''}`}
                onClick={() => handleNavClick('donasi')}
              >
                Donasi
              </button>

              <button
                className={`nav-link ${activeTab === 'adopsi' ? 'active' : ''}`}
                onClick={() => handleNavClick('adopsi')}
                style={{
                  color: activeTab === 'adopsi' ? '#1d4ed8' : '#0b1f5c',
                  fontWeight: 700
                }}
              >
                Adopsi Resmi
              </button>
            </>
          )}

        </nav>

        {/* Action Buttons & Login Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>

          {/* Ikon Lonceng Notifikasi Publik / Tracking Notif (Posisi tepat di sebelah KIRI tombol Login User) */}
          <NotificationDropdown
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'pengaduan' && onSwitchToPengaduan) onSwitchToPengaduan();
              else if (tab === 'panti' && onSwitchToPanti) onSwitchToPanti();
              else if (tab === 'donasi' && onSwitchToDonasi) onSwitchToDonasi();
              else if (tab === 'adopsi' && onSwitchToAdopsi) onSwitchToAdopsi();
            }}
          />

          {/* Login / User Profile Controls */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} className="desktop-only">
              {/* Tombol Akses Dashboard Admin / Super Admin */}
              {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Panti') && onSwitchToDashboard && (
                <button
                  onClick={onSwitchToDashboard}
                  style={{
                    background: currentUser?.role === 'Super Admin'
                      ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
                      : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                  title={`Buka Dashboard ${currentUser?.role}`}
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard {currentUser?.role}</span>
                </button>
              )}

              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '0.35rem 0.75rem',
                borderRadius: '50px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <User size={14} color="#1d4ed8" />
                <span>{currentUser?.name || 'Warga'}</span>
              </div>
              <button
                onClick={onLogout}
                title="Keluar / Logout"
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  padding: '0.45rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary desktop-only"
              onClick={onOpenLogin}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.825rem',
                borderRadius: '50px'
              }}
            >
              <UserCheck size={16} color="#0b1f5c" />
              Login User
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: '#f1f5f9',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'none'
            }}
          >
            {mobileMenuOpen ? <X size={22} color="#0b1f5c" /> : <Menu size={22} color="#0b1f5c" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}>
          <button className={`mobile-menu-item ${activeTab === 'beranda' ? 'active-mobile' : ''}`} onClick={() => handleNavClick('beranda')}>
            <Home size={18} /> Beranda
          </button>
          <button className={`mobile-menu-item ${activeTab === 'pengaduan' ? 'active-mobile' : ''}`} onClick={() => handleNavClick('pengaduan')}>
            <FileText size={18} /> Formulir Pengaduan
          </button>

          {/* Direktori Panti, Donasi, Adopsi Resmi di mobile drawer HANYA TAMPIL SETELAH LOGIN */}
          {isLoggedIn && (
            <>
              <button className={`mobile-menu-item ${activeTab === 'panti' ? 'active-mobile' : ''}`} onClick={() => handleNavClick('panti')}>
                <Building2 size={18} /> Direktori Panti
              </button>
              <button className={`mobile-menu-item ${activeTab === 'donasi' ? 'active-mobile' : ''}`} onClick={() => handleNavClick('donasi')}>
                <Heart size={18} /> Donasi (Uang &amp; Barang)
              </button>
              <button className={`mobile-menu-item ${activeTab === 'adopsi' ? 'active-mobile' : ''}`} onClick={() => handleNavClick('adopsi')}>
                <UserCheck size={18} /> Adopsi Resmi (COTA)
              </button>
            </>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

          {isLoggedIn && (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Panti') && onSwitchToDashboard && (
            <button
              className="mobile-menu-item"
              onClick={() => { setMobileMenuOpen(false); onSwitchToDashboard(); }}
              style={{ background: '#eff6ff', color: '#1d4ed8' }}
            >
              <LayoutDashboard size={18} /> Dashboard {currentUser?.role}
            </button>
          )}

          <button className="mobile-menu-item" onClick={() => { setMobileMenuOpen(false); onOpenHotline(); }} style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
            <MessageCircle size={18} color="#25d366" /> WhatsApp &amp; Hotline Call Center
          </button>

          {isLoggedIn ? (
            <button className="mobile-menu-item" onClick={() => { setMobileMenuOpen(false); onLogout(); }} style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
              <LogOut size={18} /> Logout ({currentUser?.name || 'User'})
            </button>
          ) : (
            <button className="mobile-menu-item" onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}>
              <UserCheck size={18} /> Login User
            </button>
          )}
        </div>
      )}

      <style>{`
        .nav-link {
          background: transparent;
          border: none;
          color: #475569;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .nav-link:hover {
          color: #0b1f5c;
          background: #f1f5f9;
        }
        .nav-link.active {
          color: #1d4ed8;
          background: #eff6ff;
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #0b1f5c;
          font-weight: 600;
          font-size: 0.9rem;
          text-align: left;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-toggle-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
