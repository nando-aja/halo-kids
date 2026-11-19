import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  User,
  Shield,
  CheckCheck,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  HeartHandshake,
  Users,
  Info,
  ChevronRight,
  LogIn,
  CheckCircle2,
  Sparkles,
  ChevronDown
} from 'lucide-react';

/**
 * HaloKidsHeader - Komponen Header / Top Navbar Terpadu (PRD Dinas Sosial)
 *
 * Menerapkan logika kondisional tampilan berdasarkan status autentikasi user:
 * 1. Kondisi Sudah Login (User Login):
 *    [ Breadcrumb / Info Portal ] --- flex spacer --- [ Tombol/Input "Lacak Tiket" ] [ Ikon Lonceng Notifikasi ] [ Profil User (Ahmad) ]
 *    - Posisi ikon lonceng tepat di sebelah KANAN tombol "Lacak Tiket" dan di sebelah KIRI menu profil user.
 *
 * 2. Kondisi Belum Login / Pengunjung Publik (Guest):
 *    [ Beranda Informasi ] [ Formulir Pengaduan ] [ Ikon Lonceng Notifikasi Publik / Tracking Notif ] [ Tombol "Login User" ]
 *    - Posisi ikon lonceng tepat di sebelah KIRI tombol "Login User".
 */

// Mock data notifikasi untuk User Login
const INITIAL_USER_NOTIFICATIONS = [
  {
    id: 'usr-notif-1',
    category: 'Pengaduan TRC',
    title: 'Update Pengaduan #TKT-8841',
    summary: 'Petugas TRC Cibinong telah menuju ke lokasi asesmen darurat lapangan pengaduan Anda.',
    time: '10 menit lalu',
    is_read: false,
    icon: ShieldAlert,
    iconBg: 'bg-red-50 text-red-600',
    actionType: 'lacak',
    targetTicket: 'TKT-8841'
  },
  {
    id: 'usr-notif-2',
    category: 'Relawan',
    title: 'Pendaftaran Relawan Disetujui!',
    summary: 'LKSA Kasih Bunda Mandiri telah mengonfirmasi Anda sebagai Tutor Belajar Anak.',
    time: '45 menit lalu',
    is_read: false,
    icon: Users,
    iconBg: 'bg-indigo-50 text-indigo-600',
    actionType: 'tab',
    actionTab: 'volunteer'
  },
  {
    id: 'usr-notif-3',
    category: 'Adopsi COTA',
    title: 'Verifikasi Berkas COTA Lengkap',
    summary: 'Jadwal Asesmen Home Visit Tim Pertimbangan PIPA Dinsos telah disetujui untuk keluarga Anda.',
    time: '2 jam lalu',
    is_read: false,
    icon: FileCheck2,
    iconBg: 'bg-blue-50 text-blue-600',
    actionType: 'tab',
    actionTab: 'adopsi'
  },
  {
    id: 'usr-notif-4',
    category: 'Donasi',
    title: 'Donasi Logistik Diterima LKSA',
    summary: 'Paket sembako & nutrisi telah diverifikasi oleh panti dan masuk dalam pembukuan audit Dinsos.',
    time: 'Kemarin',
    is_read: true,
    icon: HeartHandshake,
    iconBg: 'bg-emerald-50 text-emerald-600',
    actionType: 'tab',
    actionTab: 'donasi'
  }
];

// Mock data notifikasi untuk Pengunjung Publik (Guest)
const INITIAL_GUEST_NOTIFICATIONS = [
  {
    id: 'gst-notif-1',
    category: 'Pelacakan Cepat',
    title: 'Lacak Tiket Pengaduan Publik',
    summary: 'Pantau tindak lanjut laporan pengaduan anak Anda dengan Kode Tiket (SLA respon < 2 jam).',
    time: 'Aktif',
    is_read: false,
    icon: Search,
    iconBg: 'bg-blue-50 text-blue-600',
    actionType: 'lacak',
    targetTicket: 'TKT-LIVE'
  },
  {
    id: 'gst-notif-2',
    category: 'Layanan Siaga',
    title: 'Hotline Darurat TRC 24 Jam',
    summary: 'Pusat Panggilan Darurat Kekerasan Anak Dinsos siaga melayani laporan darurat dan pendampingan.',
    time: '3 jam lalu',
    is_read: false,
    icon: Info,
    iconBg: 'bg-amber-50 text-amber-600',
    actionType: 'info'
  },
  {
    id: 'gst-notif-3',
    category: 'Maklumat Publik',
    title: 'Layanan HaloKids Bebas Biaya',
    summary: 'Seluruh proses pelaporan darurat dan pengurusan berkas di bawah naungan Dinsos gratis tanpa pungli.',
    time: '1 hari lalu',
    is_read: true,
    icon: Sparkles,
    iconBg: 'bg-slate-100 text-slate-600',
    actionType: 'info'
  }
];

export default function HaloKidsHeader({
  isLoggedIn = false,
  currentUser = { name: 'Warga', role: 'Warga Terverifikasi' },
  activeTab = 'beranda',
  onSelectTab = () => {},
  onOpenLacak = () => {},
  onOpenLogin = () => {},
  onLogout = () => {}
}) {
  // State dropdown notifikasi
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    isLoggedIn ? INITIAL_USER_NOTIFICATIONS : INITIAL_GUEST_NOTIFICATIONS
  );
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unread'
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Sinkronkan notifikasi saat status autentikasi berubah
  useEffect(() => {
    setNotifications(isLoggedIn ? INITIAL_USER_NOTIFICATIONS : INITIAL_GUEST_NOTIFICATIONS);
  }, [isLoggedIn]);

  // Handler Click Outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    }

    function handleEsc(e) {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (item) => {
    // Tandai sudah dibaca
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );

    if (item.actionType === 'lacak') {
      onOpenLacak(item.targetTicket);
      setIsNotifOpen(false);
    } else if (item.actionType === 'tab' && item.actionTab) {
      onSelectTab(item.actionTab);
      setIsNotifOpen(false);
    }
  };

  const displayedNotifications =
    filterMode === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ======================================================== */}
        {/* BAGIAN KIRI: LOGO & BRANDING / BREADCRUMB               */}
        {/* ======================================================== */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Shield size={20} className="text-blue-300" />
          </div>

          {isLoggedIn ? (
            /* Breadcrumb / Info Portal (Untuk User Login) */
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-slate-800 tracking-tight sm:text-sm">
                Portal Layanan Warga
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Dinas Sosial Kabupaten
              </span>
            </div>
          ) : (
            /* Logo & Portal Name (Untuk Pengunjung Publik / Guest) */
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-blue-950 tracking-tight leading-none">
                Halo<span className="text-blue-600">Kids</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Dinas Sosial Kab.
              </span>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* FLEX SPACER                                              */}
        {/* ======================================================== */}
        <div className="flex-1" />

        {/* ======================================================== */}
        {/* BAGIAN KANAN: SESUAI ATURAN KONDISIONAL SPESIFIKASI     */}
        {/* ======================================================== */}

        {isLoggedIn ? (
          /* ---------------------------------------------------- */
          /* 1. KONDISI SUDAH LOGIN (USER LOGIN):                 */
          /*    [ Lacak Tiket ] [ Lonceng Notif ] [ Profil User ] */
          /* ---------------------------------------------------- */
          <div className="flex items-center gap-2 sm:gap-3">

            {/* [1] Tombol / Input "Lacak Tiket" */}
            <button
              type="button"
              id="header-btn-lacak-tiket"
              onClick={() => onOpenLacak()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-900 border border-slate-200 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Lacak status pengaduan TRC"
            >
              <Search size={14} className="text-sky-600" />
              <span className="hidden xs:inline">Lacak Tiket</span>
            </button>

            {/* [2] Ikon Lonceng Notifikasi */}
            {/* Tepat di KANAN "Lacak Tiket" dan KIRI menu profil user */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                id="header-btn-notifikasi-user"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`relative p-2 rounded-full border transition-all duration-200 cursor-pointer outline-none ${
                  isNotifOpen
                    ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
                }`}
                aria-label="Notifikasi Pengguna"
                title={unreadCount > 0 ? `${unreadCount} Notifikasi Belum Dibaca` : 'Notifikasi'}
              >
                <Bell size={18} className={isNotifOpen ? 'text-blue-700' : 'text-slate-700'} />

                {/* Badge Counter Merah (unreadCount > 0) */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Popover Notifikasi (User Login) */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  {/* Popover Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Bell size={13} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Notifikasi
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-600">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCheck size={14} />
                        <span>Tandai sudah dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Subheader */}
                  <div className="px-4 py-1.5 bg-white border-b border-slate-100 flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer ${
                        filterMode === 'all'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Semua ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('unread')}
                      className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer ${
                        filterMode === 'unread'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Belum Dibaca ({unreadCount})
                    </button>
                  </div>

                  {/* List Item Notifikasi (Status Pengaduan, COTA, Relawan, Donasi) */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {displayedNotifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        <CheckCircle2 size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      displayedNotifications.map((item) => {
                        const IconComp = item.icon || Info;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                              !item.is_read ? 'bg-blue-50/40' : 'bg-white'
                            }`}
                          >
                            {!item.is_read && (
                              <span className="absolute left-1.5 top-4 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            )}
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                item.iconBg || 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              <IconComp size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <h5 className="text-xs font-bold text-slate-900 truncate">
                                  {item.title}
                                </h5>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                                  <Clock size={10} />
                                  {item.time}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {item.summary}
                              </p>
                              {item.actionType === 'lacak' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 mt-1">
                                  Lacak status tiket <ChevronRight size={12} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-4">
                    <span>Layanan Terpadu HaloKids</span>
                    <span className="font-semibold text-blue-900">{currentUser?.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* [3] Profil User (Ahmad) */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                id="header-btn-profil-user"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[11px]">
                  {currentUser?.name ? currentUser.name.trim().charAt(0).toUpperCase() : 'W'}
                </div>
                <span className="max-w-[100px] truncate">{currentUser?.name || 'Warga'}</span>
                <ChevronDown size={12} className="text-blue-700" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser?.name || 'Warga'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {currentUser?.role || 'Warga Terverifikasi'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-semibold"
                  >
                    <span>Keluar Akun</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ---------------------------------------------------------------------- */
          /* 2. KONDISI BELUM LOGIN / PENGUNJUNG PUBLIK (GUEST):                    */
          /*    [ Beranda Informasi ] [ Formulir Pengaduan ] [ Bell Notif ] [ Login ] */
          /* ---------------------------------------------------------------------- */
          <div className="flex items-center gap-2 sm:gap-4">

            {/* [1] Beranda Informasi */}
            <button
              type="button"
              id="header-nav-beranda"
              onClick={() => onSelectTab('beranda')}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'beranda'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-700 hover:text-blue-900 hover:bg-slate-50'
              }`}
            >
              Beranda Informasi
            </button>

            {/* [2] Formulir Pengaduan */}
            <button
              type="button"
              id="header-nav-pengaduan"
              onClick={() => onSelectTab('pengaduan')}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'pengaduan'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-700 hover:text-blue-900 hover:bg-slate-50'
              }`}
            >
              Formulir Pengaduan
            </button>

            {/* [3] Ikon Lonceng Notifikasi Publik / Tracking Notif */}
            {/* Tepat di KIRI tombol "Login User" */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                id="header-btn-notifikasi-guest"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`relative p-2 rounded-full border transition-all duration-200 cursor-pointer outline-none ${
                  isNotifOpen
                    ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
                }`}
                aria-label="Notifikasi Publik"
                title="Notifikasi & Pantau Tiket"
              >
                <Bell size={18} className={isNotifOpen ? 'text-blue-700' : 'text-slate-700'} />

                {/* Badge Counter Merah */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Popover Notifikasi Publik (Guest) */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  {/* Popover Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Bell size={13} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Notifikasi & Info
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-600">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCheck size={14} />
                        <span>Tandai sudah dibaca</span>
                      </button>
                    )}
                  </div>

                  {/* List Notifikasi Publik / Tracking Cepat */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {displayedNotifications.map((item) => {
                      const IconComp = item.icon || Info;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                            !item.is_read ? 'bg-blue-50/40' : 'bg-white'
                          }`}
                        >
                          {!item.is_read && (
                            <span className="absolute left-1.5 top-4 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                          )}
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              item.iconBg || 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            <IconComp size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h5 className="text-xs font-bold text-slate-900 truncate">
                                {item.title}
                              </h5>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                                <Clock size={10} />
                                {item.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {item.summary}
                            </p>
                            {item.actionType === 'lacak' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 mt-1">
                                Klik untuk buka pelacak tiket <ChevronRight size={12} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Banner CTA Opsi "Login untuk riwayat lengkap" */}
                  <div className="p-3.5 bg-blue-50/90 border-t border-blue-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-950">
                        Login untuk riwayat lengkap
                      </p>
                      <p className="text-[11px] text-blue-700 truncate">
                        Pantau arsip pengaduan, COTA & donasi
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotifOpen(false);
                        onOpenLogin();
                      }}
                      className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer flex-shrink-0"
                    >
                      <LogIn size={13} />
                      <span>Masuk</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* [4] Tombol "Login" */}
            <button
              type="button"
              id="header-btn-login-user"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <LogIn size={14} />
              <span>Login</span>
            </button>

          </div>
        )}

      </div>
    </header>
  );
}
