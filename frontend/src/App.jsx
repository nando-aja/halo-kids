import React, { useState, useEffect, useRef, useCallback } from 'react';
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


// Kunci penyimpanan snapshot navigasi di history.state browser.
const NAV_HISTORY_KEY = 'halokidsNav';

// Batas waktu pengguna boleh kembali ke halaman akun (lewat Forward) setelah
// menekan Back ke halaman sebelum login. Lewat dari ini, wajib login ulang.
const AUTH_RETURN_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit

const getAuthenticatedRole = (user) => {
  const value = user?.peran || user?.roleCode || user?.role || '';

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
};

const DINSOS_ROLES = [
  'admin',
  'super-admin',
  'superadmin',
  'admin-dinsos',
  'dinas-sosial-(super-admin)',
  'dinas-sosial-super-admin',
];

const LKSA_MANAGER_ROLES = [
  'admin-panti',
  'admin-lksa',
  'pengelola-panti',
  'pengelola-lksa',
  'pantiadmin',
];

const isLksaManager = (user) => {
  return LKSA_MANAGER_ROLES.includes(getAuthenticatedRole(user));
};

const canUseAdminDashboard = (user) => {
  const role = getAuthenticatedRole(user);

  return (
    DINSOS_ROLES.includes(role) ||
    isLksaManager(user)
  );
};

const canUseAdminAI = (user) => {
  return DINSOS_ROLES.includes(getAuthenticatedRole(user));
};

const getInitialViewMode = (user) => {
  if (DINSOS_ROLES.includes(getAuthenticatedRole(user))) {
    return 'dashboard';
  }

  if (isLksaManager(user)) {
    return 'dashboard';
  }

  return 'landing';
};



export default function App() {
  // Saat aplikasi dibuka ulang, arahkan berdasarkan role akun yang tersimpan.
  // Super Admin / Admin LKSA masuk Workspace; User Publik masuk Portal Warga.

const [viewMode, setViewMode] = useState(() => {
  try {
    const sess = localStorage.getItem('halokids_active_session');

    if (!sess) return 'landing';

    return getInitialViewMode(JSON.parse(sess));
  } catch {
    return 'landing';
  }
});
  const [activeTab, setActiveTab] = useState('beranda');

  // Auth User State: loaded from localStorage if exists
  const [hasSession, setHasSession] = useState(() => {
    try {
      const sess = localStorage.getItem('halokids_active_session');
      return !!sess;
    } catch {
      return false;
    }
  });
  const [sessionUser, setSessionUser] = useState(() => {
    try {
      const sess = localStorage.getItem('halokids_active_session');
      return sess ? JSON.parse(sess) : null;
    } catch {
      return null;
    }
  });

  // Sesi ditangguhkan: pengguna menekan Back dari halaman akun ke halaman
  // sebelum login. Tampilan jadi seperti tamu, tapi sesi belum dihapus
  // sehingga Forward (sebelum batas waktu) bisa kembali tanpa login ulang.
  const [isSessionSuspended, setIsSessionSuspended] = useState(false);
  const isLoggedIn = hasSession && !isSessionSuspended;
  const currentUser = isSessionSuspended ? null : sessionUser;

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
  // Preset untuk membuka LoginModal langsung di form daftar (mis. dari slide hero "Daftar Panti")
  const [loginPreset, setLoginPreset] = useState(null);
  const [isAdopsiOpen, setIsAdopsiOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedPanti, setSelectedPanti] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ----------------------------------------------------------------
  // SINKRONISASI RIWAYAT BROWSER (tombol Back / Forward)
  // Aplikasi ini berpindah halaman lewat state (bukan URL), jadi tanpa
  // sinkronisasi ini browser menganggap hanya ada 1 halaman dan tombol
  // Back langsung keluar dari web. Setiap perpindahan halaman dicatat
  // sebagai entri riwayat, dan Back/Forward memulihkan state tersebut.
  //
  // Tiap entri juga mencatat `authed` (apakah saat itu pengguna login):
  //  - Back ke entri sebelum login  -> sesi ditangguhkan (tampil sebagai tamu)
  //  - Forward ke entri setelah login:
  //      * sebelum batas waktu -> sesi dilanjutkan
  //      * lewat batas waktu / sesi sudah berakhir -> wajib login ulang
  // ----------------------------------------------------------------
  const hasSessionRef = useRef(hasSession);
  const sessionUserRef = useRef(sessionUser);
  const suspendedRef = useRef(isSessionSuspended);
  const suspendedAtRef = useRef(0);
  const historyReadyRef = useRef(false);

  useEffect(() => { hasSessionRef.current = hasSession; }, [hasSession]);
  useEffect(() => { sessionUserRef.current = sessionUser; }, [sessionUser]);
  useEffect(() => { suspendedRef.current = isSessionSuspended; }, [isSessionSuspended]);

  // Akhiri sesi sepenuhnya (token + data sesi dihapus).
  const endSession = useCallback(() => {
    authService.logout();
    setHasSession(false);
    setSessionUser(null);
    setIsSessionSuspended(false);
    try {
      localStorage.removeItem('halokids_active_session');
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sesi yang ditangguhkan otomatis berakhir setelah batas waktu.
  useEffect(() => {
    if (!isSessionSuspended) return undefined;
    const timer = setTimeout(endSession, AUTH_RETURN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isSessionSuspended, endSession]);

  // Catat setiap perubahan halaman / status login sebagai entri riwayat baru.
  useEffect(() => {
    const snapshot = { viewMode, activeTab, authed: isLoggedIn };
    const saved = window.history.state?.[NAV_HISTORY_KEY];

    // Entri pertama (saat web dibuka) cukup di-replace, jangan di-push,
    // supaya tidak ada entri kembar.
    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
      window.history.replaceState({ ...window.history.state, [NAV_HISTORY_KEY]: snapshot }, '');
      return;
    }

    // State ini berasal dari Back/Forward (sudah cocok dengan riwayat): jangan push lagi.
    if (
      saved &&
      saved.viewMode === viewMode &&
      saved.activeTab === activeTab &&
      saved.authed === isLoggedIn
    ) {
      return;
    }

    window.history.pushState({ ...window.history.state, [NAV_HISTORY_KEY]: snapshot }, '');
  }, [viewMode, activeTab, isLoggedIn]);

  // Pulihkan halaman saat pengguna menekan Back / Forward.
  useEffect(() => {
    const handlePopState = (event) => {
      const saved = event.state?.[NAV_HISTORY_KEY];
      if (!saved) return;

      let nextMode = saved.viewMode;
      let nextTab = saved.activeTab;

      // Tutup modal/overlay agar tidak "menempel" di halaman sebelumnya.
      setIsLaporOpen(false);
      setIsLacakOpen(false);
      setIsHotlineOpen(false);
      setIsLoginOpen(false);
      setIsAdopsiOpen(false);
      setIsMapOpen(false);
      setSelectedPanti(null);
      setIsMobileSidebarOpen(false);

      // Halaman ini dulunya dibuka dalam keadaan login: tentukan nasib sesinya.
      const requireRelogin = () => {
        nextMode = 'landing';
        nextTab = 'beranda';
        window.history.replaceState(
          {
            ...event.state,
            [NAV_HISTORY_KEY]: { viewMode: 'landing', activeTab: 'beranda', authed: false },
          },
          ''
        );
        setIsLoginOpen(true);
      };

      if (saved.authed) {
        if (!hasSessionRef.current) {
          requireRelogin();
        } else if (suspendedRef.current) {
          const awayMs = Date.now() - suspendedAtRef.current;
          if (awayMs > AUTH_RETURN_TIMEOUT_MS) {
            endSession();
            requireRelogin();
          } else {
            setIsSessionSuspended(false);
          }
        }
      } else if (hasSessionRef.current && !suspendedRef.current) {
        // Kembali ke halaman sebelum login: tangguhkan sesi, mulai hitung waktu.
        suspendedAtRef.current = Date.now();
        setIsSessionSuspended(true);
      }

      // Jangan biarkan Back/Forward membuka Workspace untuk akun yang tidak berhak.
      if (
        nextMode === 'dashboard' &&
        (!hasSessionRef.current || !canUseAdminDashboard(sessionUserRef.current))
      ) {
        nextMode = 'landing';
        nextTab = 'beranda';
      }

      setViewMode(nextMode);
      setActiveTab(nextTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [endSession]);

  // Listen to 401 Unauthorized globally from apiClient interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setHasSession(false);
      setSessionUser(null);
      setIsSessionSuspended(false);
      setIsLoginOpen(true);
    };

    window.addEventListener('halokids:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('halokids:auth_expired', handleAuthExpired);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setHasSession(true);
    setIsSessionSuspended(false);
    const loggedUser = user || { name: 'Warga', role: 'User Publik', email: 'warga@gmail.com' };
    setSessionUser(loggedUser);
    try {
      localStorage.setItem('halokids_active_session', JSON.stringify(loggedUser));
    } catch (e) {
      console.error(e);
    }

    // Workspace hanya untuk akun admin/pengelola panti; User Publik langsung ke portal warga.
    setViewMode(getInitialViewMode(loggedUser));
    setActiveTab('beranda');
  };

  // Gabungkan data terbaru ke sesi (mis. status pengajuan LKSA berubah
  // setelah Dinsos memutuskan) dan simpan agar tetap ada setelah refresh.
  const handleUserUpdate = (patch) => {
    setSessionUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('halokids_active_session', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleLogout = () => {
    authService.logout();
    setHasSession(false);
    setSessionUser(null);
    setIsSessionSuspended(false);
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
              onOpenRegisterPanti={() => { setLoginPreset({ role: 'pengelola panti', register: true }); setIsLoginOpen(true); }}
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
            onOpenRegisterPanti={() => { setLoginPreset({ role: 'pengelola panti', register: true }); setIsLoginOpen(true); }}
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
          onUserUpdate={handleUserUpdate}
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
        initialRole={loginPreset?.role}
        initialRegister={loginPreset?.register}
        onClose={() => { setIsLoginOpen(false); setLoginPreset(null); }}
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
