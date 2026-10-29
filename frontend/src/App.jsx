import React, { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import DashboardUtama from './views/DashboardUtama';
import FormulirPengaduanView from './views/FormulirPengaduanView';
import DirektoriPantiView from './views/DirektoriPantiView';
import HalamanDonasiView from './views/HalamanDonasiView';
import AdopsiResmiView from './views/AdopsiResmiView';
import VolunteerRegistrationView from './views/VolunteerRegistrationView';
import Navbar from './components/Navbar';
import UserSidebar from './components/UserSidebar';
import UserHeader from './components/UserHeader';
import MobileBottomNav from './components/MobileBottomNav';
import { authService } from './api';

// Modals
import LaporModal from './components/Modals/LaporModal';
import LacakModal from './components/Modals/LacakModal';
import HotlineModal from './components/Modals/HotlineModal';
import LoginModal from './components/Modals/LoginModal';
import PantiDetailModal from './components/Modals/PantiDetailModal';
import AdopsiModal from './components/Modals/AdopsiModal';
import MapModal from './components/Modals/MapModal';
import AiAssistant from './components/AiAssistant';

// AI Assistant hanya untuk Admin / Super Admin (bukan Admin Panti).
// Peran backend menjadi sumber utama. roleMode tidak boleh memberi akses,
// karena ia bisa berasal dari pilihan tampilan/demo yang lama.
const getAuthenticatedRole = (user) => {
  const value = user?.peran || user?.roleCode || user?.role || '';
  return String(value).trim().toLowerCase().replace(/[_\s]+/g, '-');
};

const canUseAdminDashboard = (user) => {
  const role = getAuthenticatedRole(user);
  return [
    'admin', 'super-admin', 'superadmin', 'admin-dinsos',
    'dinas-sosial-(super-admin)', 'dinas-sosial-super-admin',
    'admin-panti', 'admin-lksa', 'pengelola-panti', 'pengelola-lksa', 'pantiadmin'
  ].includes(role);
};

const canUseAdminAI = (user) => {
  const role = getAuthenticatedRole(user);
  // AI administrasi hanya untuk akun Dinsos, bukan pengelola LKSA atau warga.
  return [
    'admin', 'super-admin', 'superadmin', 'admin-dinsos',
    'dinas-sosial-(super-admin)', 'dinas-sosial-super-admin'
  ].includes(role);
};

export default function App() {
  // Saat aplikasi dibuka ulang, arahkan berdasarkan role akun yang tersimpan.
  // Super Admin / Admin LKSA masuk Workspace; User Publik masuk Portal Warga.
  const [viewMode, setViewMode] = useState(() => {
    try {
      const sess = localStorage.getItem('halokids_active_session');
      if (sess && canUseAdminDashboard(JSON.parse(sess))) return 'dashboard';
    } catch {
      // Abaikan sesi yang tidak valid dan tampilkan portal publik.
    }
    return 'landing';
  });
  const [activeTab, setActiveTab] = useState('beranda');

  // Auth User State: loaded from localStorage if exists
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const sess = localStorage.getItem('halokids_active_session');
      return !!sess;
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const sess = localStorage.getItem('halokids_active_session');
      return sess ? JSON.parse(sess) : null;
    } catch {
      return null;
    }
  });

  // Shared Volunteer Registrations State (Requirement Volunteer)
  const [volunteerRegistrations, setVolunteerRegistrations] = useState([
    {
      id: 'VOL-2024-8102',
      nama: 'Sarah Amanda Putri',
      nomorHp: '0812-9876-5432',
      alamat: 'Jl. Pajajaran No. 28, Baranangsiang, Kota Bogor',
      usia: 21,
      bidang: 'Pendidikan / Tutor Belajar',
      pantiTujuan: 'LKSA Kasih Bunda Mandiri',
      tanggal: '2024-10-14',
      sesiWaktu: 'Weekend Khusus (Sabtu & Minggu)',
      tujuanKerelawanan: 'Ingin mengajar bahasa Inggris dasar dan calistung untuk adik-adik asuh panti, serta mendampingi bimbingan tugas sekolah di akhir pekan.',
      ktpFileName: 'scan_ktm_sarah_amanda.pdf',
      ktpFileSize: '1.2 MB',
      status: 'Menunggu Persetujuan',
      submittedAt: 'Hari ini, 09:30 WIB'
    },
    {
      id: 'VOL-2024-7491',
      nama: 'Rizky Maulana Akbar',
      nomorHp: '0857-1122-3344',
      alamat: 'Perumahan Sukaraja Indah Blok C3, Kec. Sukaraja',
      usia: 24,
      bidang: 'Kesenian / Olahraga',
      pantiTujuan: 'LKSA Kasih Bunda Mandiri',
      tanggal: '2024-10-19',
      sesiWaktu: 'Siang / Sore Hari (13.30 - 16.30 WIB)',
      tujuanKerelawanan: 'Mengadakan pelatihan futsal dan senam kebugaran jasmani bersama adik-adik panti untuk membangun sportivitas dan kegembiraan.',
      ktpFileName: 'scan_ktp_rizky_maulana.jpg',
      ktpFileSize: '920 KB',
      status: 'Disetujui',
      submittedAt: 'Kemarin, 14:15 WIB'
    },
    {
      id: 'VOL-2024-6305',
      nama: 'Dina Lestari',
      nomorHp: '0813-4455-6677',
      alamat: 'Kecamatan Gunung Putri • Desa Wanaherang',
      usia: 16,
      bidang: 'Kesenian / Olahraga',
      pantiTujuan: 'LKSA Kasih Bunda Mandiri',
      tanggal: '2024-10-12',
      sesiWaktu: 'Pagi Hari (08.30 - 11.30 WIB)',
      tujuanKerelawanan: 'Ingin membantu mengajar menyanyi dan mewarnai gambar bersama anak balita panti.',
      ktpFileName: 'kartu_pelajar_dina.jpg',
      ktpFileSize: '450 KB',
      status: 'Ditolak',
      submittedAt: '03 Oct 2024, 11:00 WIB'
    }
  ]);

  const handleAddVolunteer = (newVol) => {
    setVolunteerRegistrations((prev) => [newVol, ...prev]);
  };

  // Modal Controls
  const [isLaporOpen, setIsLaporOpen] = useState(false);
  const [isLacakOpen, setIsLacakOpen] = useState(false);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdopsiOpen, setIsAdopsiOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedPanti, setSelectedPanti] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Listen to 401 Unauthorized globally from apiClient interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setIsLoginOpen(true);
    };

    window.addEventListener('halokids:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('halokids:auth_expired', handleAuthExpired);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    const loggedUser = user || { name: 'Warga', role: 'User Publik', email: 'warga@gmail.com' };
    setCurrentUser(loggedUser);
    try {
      localStorage.setItem('halokids_active_session', JSON.stringify(loggedUser));
    } catch (e) {
      console.error(e);
    }

    // Workspace hanya untuk akun admin/pengelola panti; User Publik langsung ke portal warga.
    setViewMode(canUseAdminDashboard(loggedUser) ? 'dashboard' : 'landing');
    setActiveTab('beranda');
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('halokids_active_session');
    } catch (e) {
      console.error(e);
    }
    setViewMode('landing');
    setActiveTab('beranda');
  };

  const handleToggleLoginDemo = () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      handleLoginSuccess({ name: 'Ahmad Rifai', role: 'User Publik', email: 'ahmad@gmail.com' });
    }
  };

  // Render current active view component for user portal
  const renderCurrentView = () => {
    switch (viewMode) {
      case 'pengaduan':
        return (
          <FormulirPengaduanView 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
      case 'panti':
        return (
          <DirektoriPantiView 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenAdopsi={() => setIsAdopsiOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onSelectPanti={(pantiObj) => setSelectedPanti(pantiObj)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
      case 'donasi':
        return (
          <HalamanDonasiView 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenAdopsi={() => setIsAdopsiOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
      case 'adopsi':
        return (
          <AdopsiResmiView 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenAdopsi={() => setIsAdopsiOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
      case 'volunteer':
        if (!isLoggedIn) {
          // Hanya tersedia setelah login sebagai user
          return (
            <LandingPage 
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              onLogout={handleLogout}
              onToggleLoginDemo={handleToggleLoginDemo}
              onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
              onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
              onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
              onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
              onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
              onOpenLapor={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
              onOpenLacak={() => setIsLacakOpen(true)}
              onOpenHotline={() => setIsHotlineOpen(true)}
              onOpenLogin={() => setIsLoginOpen(true)}
              onOpenAdopsi={() => setIsAdopsiOpen(true)}
              onOpenMap={() => setIsMapOpen(true)}
              onSelectPanti={(pantiObj) => setSelectedPanti(pantiObj)}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          );
        }
        return (
          <VolunteerRegistrationView 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onAddVolunteer={handleAddVolunteer}
          />
        );
      case 'landing':
      default:
        return (
          <LandingPage 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onSwitchToVolunteer={() => { setViewMode('volunteer'); setActiveTab('volunteer'); }}
            onOpenLapor={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onOpenLacak={() => setIsLacakOpen(true)}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenAdopsi={() => setIsAdopsiOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onSelectPanti={(pantiObj) => setSelectedPanti(pantiObj)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      
      {/* Dynamic View Router */}
      {viewMode === 'dashboard' && canUseAdminDashboard(currentUser) ? (
        <DashboardUtama 
          currentUser={currentUser}
          onLogout={handleLogout}
          volunteerList={volunteerRegistrations}
          setVolunteerList={setVolunteerRegistrations}
        />
      ) : !isLoggedIn ? (
        /* SEBELUM LOGIN / BELUM LOGIN: NAV TETAP DI ATAS SEPERTI SEMULA */
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          <Navbar 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSwitchToLanding={() => { setViewMode('landing'); setActiveTab('beranda'); }}
            onSwitchToPengaduan={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onSwitchToPanti={() => { setViewMode('panti'); setActiveTab('panti'); }}
            onSwitchToDonasi={() => { setViewMode('donasi'); setActiveTab('donasi'); }}
            onSwitchToAdopsi={() => { setViewMode('adopsi'); setActiveTab('adopsi'); }}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onOpenLapor={() => { setViewMode('pengaduan'); setActiveTab('pengaduan'); }}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenLacak={() => setIsLacakOpen(true)}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="pb-16 lg:pb-0">
            {renderCurrentView()}
          </main>

          {/* MOBILE BOTTOM NAVIGATION BAR UNTUK PENGUNJUNG SEBELUM LOGIN */}
          <MobileBottomNav 
            activeTab={activeTab}
            viewMode={viewMode}
            onNavigate={(newMode, newTab) => {
              // Workspace tidak boleh dibuka hanya melalui navigasi UI.
              if (newMode === 'dashboard' && !canUseAdminDashboard(currentUser)) return;
              setViewMode(newMode);
              setActiveTab(newTab);
            }}
            onToggleSidebar={() => setIsLoginOpen(true)}
          />
        </div>
      ) : (
        /* SETELAH LOGIN: HALAMAN USER PUBLIK DENGAN SIDE BAR */
        <div className="flex h-screen overflow-hidden bg-slate-50">
          
          {/* USER SIDEBAR NAVIGATION */}
          <UserSidebar 
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            activeTab={activeTab}
            viewMode={viewMode}
            onNavigate={(newMode, newTab) => {
              // Workspace tidak boleh dibuka hanya melalui navigasi UI.
              if (newMode === 'dashboard' && !canUseAdminDashboard(currentUser)) return;
              setViewMode(newMode);
              setActiveTab(newTab);
            }}
            onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
            onOpenLacak={() => setIsLacakOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onLogout={handleLogout}
            onToggleLoginDemo={handleToggleLoginDemo}
            mobileOpen={isMobileSidebarOpen}
            setMobileOpen={setIsMobileSidebarOpen}
          />

          {/* MAIN CONTENT AREA: CONTAINER KONTEN UTAMA */}
          <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0 bg-slate-50 relative">
            {/* STICKY TOP HEADER FOR USER PAGES */}
            <UserHeader 
              activeTab={activeTab}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              onOpenLogin={() => setIsLoginOpen(true)}
              onOpenLacak={() => setIsLacakOpen(true)}
              onSwitchToDashboard={() => { if (canUseAdminDashboard(currentUser)) setViewMode('dashboard'); }}
              onNavigateTab={(tab) => {
                if (tab === 'dashboard') {
                  if (canUseAdminDashboard(currentUser)) {
                    setViewMode('dashboard');
                    setActiveTab('beranda');
                  }
                  return;
                }

                setViewMode(tab === 'beranda' ? 'landing' : tab);
                setActiveTab(tab);
              }}
            />

            {/* DYNAMIC USER VIEW DENGAN PADDING BOTTOM DI MOBILE UNTUK BOTTOM BAR */}
            <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
              {renderCurrentView()}
            </main>

            {/* MOBILE BOTTOM NAVIGATION BAR UNTUK WARGA SETELAH LOGIN */}
            <MobileBottomNav 
              activeTab={activeTab}
              viewMode={viewMode}
              onNavigate={(newMode, newTab) => {
                // User Publik tidak dapat berpindah ke mode Workspace lewat navigasi.
                if (newMode === 'dashboard' && !canUseAdminDashboard(currentUser)) return;
                setViewMode(newMode);
                setActiveTab(newTab);
              }}
              onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />
          </div>
        </div>
      )}

      {/* Global Interactive Modals */}
      <LaporModal 
        isOpen={isLaporOpen}
        onClose={() => setIsLaporOpen(false)}
      />

      <LacakModal 
        isOpen={isLacakOpen}
        onClose={() => setIsLacakOpen(false)}
      />

      <HotlineModal 
        isOpen={isHotlineOpen}
        onClose={() => setIsHotlineOpen(false)}
        onOpenLapor={() => setIsLaporOpen(true)}
      />

      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <PantiDetailModal 
        panti={selectedPanti}
        onClose={() => setSelectedPanti(null)}
      />

      <AdopsiModal 
        isOpen={isAdopsiOpen}
        onClose={() => setIsAdopsiOpen(false)}
      />

      <MapModal 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
      />

      {/* AI Assistant & Verification Hub: khusus Admin / Super Admin */}
      {isLoggedIn && canUseAdminAI(currentUser) && (
        <AiAssistant
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onOpenAdopsi={() => setIsAdopsiOpen(true)}
          onOpenLapor={() => setIsLaporOpen(true)}
        />
      )}

    </div>
  );
}
