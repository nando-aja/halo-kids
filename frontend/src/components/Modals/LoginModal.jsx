import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  ShieldCheck,
  KeyRound,
  User,
  Building2,
  Shield,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Phone
} from 'lucide-react';
import authService from '../../api/authService';

const STORAGE_SESSION_KEY = 'halokids_active_session';

/**
 * Konfigurasi 3 Pintu Masuk Peran Akses Portal HaloKids DINSOS
 */
const PORTAL_ROLES = [
  {
    key: 'masyarakat',
    role: 'User Publik',
    title: 'Masyarakat / Warga Umum',
    badge: 'Portal Warga',
    submitLabel: 'Masuk sebagai Warga',
    icon: User,
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
    hoverBorder: 'hover:border-blue-500 hover:bg-blue-50/40',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
  },
  {
    key: 'pengelola panti',
    role: 'Admin Panti',
    title: 'Pengelola Panti Asuhan / LKSA',
    badge: 'Portal LKSA',
    submitLabel: 'Masuk sebagai Admin Panti',
    icon: Building2,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    hoverBorder: 'hover:border-amber-500 hover:bg-amber-50/40',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
  },
  {
    key: 'admin',
    role: 'Super Admin',
    title: 'Dinas Sosial (Super Admin)',
    badge: 'Portal Dinsos',
    submitLabel: 'Masuk sebagai Admin Dinsos',
    icon: Shield,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
    hoverBorder: 'hover:border-rose-500 hover:bg-rose-50/40',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
  }
];

export default function LoginModal({
  isOpen,
  onClose,
  isLoggedIn = false,
  currentUser = null,
  onLoginSuccess,
  onLogout
}) {
  // State Langkah Alur (Multi-Step SSO Flow)
  const [selectedRole, setSelectedRole] = useState(null); // 'masyarakat' | 'pengelola panti' | 'admin' | null
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form Login State
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState(null);
  const [loginPasswordError, setLoginPasswordError] = useState(null);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState(null);

  // Form Registrasi State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState(null);

  // Lock body scroll saat modal aktif
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Reset semua form dan error saat modal ditutup
  const handleCloseModal = () => {
    setSelectedRole(null);
    setIsRegisterMode(false);
    setIsLoading(false);
    setEmailInput('');
    setPassword('');
    setShowPassword(false);
    setLoginEmailError(null);
    setLoginPasswordError(null);
    setLoginSuccessNotice(null);
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
    setShowRegPassword(false);
    setShowRegConfirmPassword(false);
    setRegError(null);
    if (onClose) onClose();
  };

  // Role aktif yang dipilih di Langkah 1
  const activeRoleObj = PORTAL_ROLES.find((r) => r.key === selectedRole) || PORTAL_ROLES[0];

  // =========================================================================
  // LOGIKA VALIDASI LOGIN DENGAN FASTAPI BACKEND
  // =========================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    // Reset error state terdahulu
    setLoginEmailError(null);
    setLoginPasswordError(null);
    setLoginSuccessNotice(null);

    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Validasi input kosong
    if (!cleanEmail) {
      setLoginEmailError('Silakan masukkan email akun Anda.');
      return;
    }
    if (!password) {
      setLoginPasswordError('Silakan masukkan kata sandi akun Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // Panggil endpoint autentikasi FastAPI sungguhan: POST /api/auth/login
      const result = await authService.login(cleanEmail, password);
      setIsLoading(false);

      // Pastikan peran akun cocok jika pengguna memilih portal khusus admin/panti
      const userRole = (result.user?.roleCode || result.user?.peran || result.user?.role || '').toLowerCase();
      if (selectedRole === 'admin' && !['admin', 'super admin', 'superadmin'].includes(userRole)) {
        authService.logout();
        setLoginEmailError(`Akun ${cleanEmail} terdaftar sebagai ${result.user?.roleLabel || result.user?.role}, bukan Super Admin (Dinas Sosial).`);
        return;
      }
      if (selectedRole === 'pengelola panti' && !['pengelola-panti', 'pengelola panti', 'admin panti', 'pantiadmin'].includes(userRole)) {
        authService.logout();
        setLoginEmailError(`Akun ${cleanEmail} terdaftar sebagai ${result.user?.roleLabel || result.user?.role}, bukan Pengelola LKSA / Admin Panti.`);
        return;
      }

      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
      handleCloseModal();
    } catch (apiErr) {
      setIsLoading(false);
      const errDetail = apiErr.friendlyMessage || apiErr.response?.data?.detail;
      setLoginPasswordError(
        typeof errDetail === 'string'
          ? errDetail
          : 'Email atau kata sandi tidak cocok. Silakan periksa kembali kredensial Anda.'
      );
    }
  };

  // =========================================================================
  // LOGIKA REGISTRASI AKUN BARU KE FASTAPI BACKEND
  // =========================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();

    // 1. Validasi format nama dan email
    if (!cleanName) {
      setRegError('Nama lengkap wajib diisi.');
      return;
    }
    if (!cleanEmail) {
      setRegError('Alamat email wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setRegError('Format email tidak valid (contoh: nama@domain.com).');
      return;
    }

    // 2. Validasi panjang kata sandi
    if (regPassword.length < 6) {
      setRegError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi kata sandi tidak sesuai.');
      return;
    }

    setIsLoading(true);

    try {
      const targetRoleCode = selectedRole === 'pengelola panti' ? 'pengelola-panti' : selectedRole === 'admin' ? 'admin' : 'masyarakat';

      // Panggil endpoint registrasi FastAPI: POST /api/auth/register
      await authService.register({
        nama: cleanName,
        email: cleanEmail,
        password: regPassword,
        no_hp: regPhone.trim() || null,
        role: targetRoleCode
      });

      setIsLoading(false);
      setIsRegisterMode(false);
      setEmailInput(cleanEmail);
      setPassword(regPassword);
      setLoginSuccessNotice('Pendaftaran berhasil! Silakan masuk dengan akun baru Anda.');
    } catch (apiErr) {
      setIsLoading(false);
      const errDetail = apiErr.friendlyMessage || apiErr.response?.data?.detail;
      setRegError(
        typeof errDetail === 'string'
          ? errDetail
          : 'Pendaftaran gagal. Pastikan email belum pernah terdaftar sebelumnya.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={handleCloseModal}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-cyan-300 flex items-center justify-center ring-1 ring-cyan-400/30">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight leading-tight">
                Portal Akses HaloKids Dinsos
              </h3>
              <p className="text-[11px] text-blue-200/80">
                Sistem Autentikasi Publik &amp; Petugas Terpadu
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            aria-label="Tutup Modal"
            title="Tutup (ESC)"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* KONDISI 1: JIKA PENGGUNA SUDAH LOGIN (PROFIL AKTIF) */}
          {isLoggedIn ? (
            <div className="text-center py-2 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center ring-4 ring-emerald-50">
                <ShieldCheck size={36} />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-blue-950">
                  Selamat Datang, {currentUser?.name || 'Warga'}!
                </h4>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                  <span>Peran: {currentUser?.role || 'User Publik'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Status: <strong>{currentUser?.nip || 'Terotentikasi'}</strong>
                  <br />
                  Email Terdaftar: <strong>{currentUser?.email || 'user@gmail.com'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 text-left w-full space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 size={14} />
                  <span>Sesi Login Terverifikasi Aktif</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Akses fitur sistem telah dibuka penuh sesuai hak akses kewenangan Anda di portal HaloKids Dinas Sosial.
                </p>
              </div>

              {/* JIKA SUDAH SUPER ADMIN, TOMBOL MASUK KE DASHBOARD */}
              {(currentUser?.role === 'Super Admin' || currentUser?.roleCode === 'admin' || currentUser?.peran === 'admin') ? (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseModal();
                    if (onLoginSuccess) onLoginSuccess(currentUser);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Shield size={16} />
                  <span>Buka Dashboard Super Admin (Dinsos)</span>
                </button>
              ) : (
                /* JIKA MASIH LOGIN SEBAGAI WARGA / USER LAIN */
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(STORAGE_SESSION_KEY);
                    } catch (e) {}
                    if (onLogout) onLogout();
                    setSelectedRole('admin');
                    setEmailInput('');
                    setPassword('');
                    setLoginEmailError(null);
                    setLoginPasswordError(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>Ganti Akun & Masuk sebagai Super Admin</span>
                </button>
              )}

              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(STORAGE_SESSION_KEY);
                  } catch (e) {
                    console.error(e);
                  }
                  if (onLogout) onLogout();
                  handleCloseModal();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300 shadow-2xs"
              >
                Keluar (Logout) Akun
              </button>
            </div>
          ) : (
            /* KONDISI 2: ALUR SEBELUM LOGIN */
            <div>
              {/* ================= LANGKAH 1: PEMILIHAN PERAN PORTAL ================= */}
              {selectedRole === null ? (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Pilih Akses Masuk Portal
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Silakan pilih jenis portal akun Anda:
                    </p>
                  </div>

                  {/* 3 Interactive Cards Sesuai PRD */}
                  <div className="space-y-2.5 pt-1">
                    {PORTAL_ROLES.map((roleItem) => {
                      const IconComponent = roleItem.icon;
                      return (
                        <div
                          key={roleItem.key}
                          onClick={() => {
                            setSelectedRole(roleItem.key);
                            setIsRegisterMode(false);
                            setLoginEmailError(null);
                            setLoginPasswordError(null);
                            setLoginSuccessNotice(null);
                          }}
                          className={`group p-3.5 rounded-2xl border border-slate-200 ${roleItem.hoverBorder} cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs hover:shadow-md`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${roleItem.iconBg} group-hover:scale-105 transition-transform`}
                            >
                              <IconComponent size={20} />
                            </div>
                            <div className="min-w-0">
                              <strong className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-900 truncate block">
                                {roleItem.title}
                              </strong>
                            </div>
                          </div>

                          <ChevronRight
                            size={18}
                            className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ================= LANGKAH 2: FORM LOGIN / REGISTRASI ================= */
                <div className="space-y-4 animate-in fade-in">
                  {/* Top Bar Langkah 2: Navigasi Kembali & Badge Peran Aktif */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole(null);
                        setIsRegisterMode(false);
                        setLoginEmailError(null);
                        setLoginPasswordError(null);
                        setLoginSuccessNotice(null);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition"
                    >
                      <ArrowLeft size={14} />
                      <span>Pilih Peran Lain</span>
                    </button>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${activeRoleObj?.badgeClass}`}
                    >
                      {isRegisterMode ? 'Daftar Baru' : 'Login'}: {activeRoleObj?.title}
                    </span>
                  </div>

                  {/* ================= FORM LOGIN AKTIF ================= */}
                  {!isRegisterMode ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-3.5 pt-1" noValidate>
                      {/* Banner Pesan Sukses (Misal setelah registrasi akun baru) */}
                      {loginSuccessNotice && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>{loginSuccessNotice}</span>
                        </div>
                      )}

                      {/* Input Email Akun */}
                      <div>
                        <label
                          htmlFor="login-email"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Email Akun
                        </label>
                        <div className="relative">
                          <input
                            id="login-email"
                            type="email"
                            placeholder={
                              selectedRole === 'pengelola panti'
                                ? 'admin@panti.or.id'
                                : selectedRole === 'admin'
                                ? 'petugas@dinsos.go.id'
                                : 'nama@email.com'
                            }
                            value={emailInput}
                            onChange={(e) => {
                              setEmailInput(e.target.value);
                              if (loginEmailError) setLoginEmailError(null);
                            }}
                            autoFocus
                            className={`w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border transition-all bg-white ${
                              loginEmailError
                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-rose-900'
                                : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                          <Mail
                            size={16}
                            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                              loginEmailError ? 'text-rose-500' : 'text-slate-400'
                            }`}
                          />
                        </div>

                        {/* Pesan Error Email Belum Terdaftar */}
                        {loginEmailError && (
                          <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 mt-1.5 animate-in fade-in">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>{loginEmailError}</span>
                          </p>
                        )}
                      </div>

                      {/* Input Kata Sandi */}
                      <div>
                        <label
                          htmlFor="login-password"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Kata Sandi
                        </label>
                        <div className="relative">
                          <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Masukkan kata sandi"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (loginPasswordError) setLoginPasswordError(null);
                            }}
                            className={`w-full text-xs sm:text-sm pl-9 pr-10 py-2.5 rounded-xl border transition-all bg-white ${
                              loginPasswordError
                                ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/20 text-rose-900'
                                : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                          />
                          <Lock
                            size={16}
                            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                              loginPasswordError ? 'text-rose-500' : 'text-slate-400'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        {/* Pesan Error Kata Sandi Salah */}
                        {loginPasswordError && (
                          <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 mt-1.5 animate-in fade-in">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>{loginPasswordError}</span>
                          </p>
                        )}
                      </div>

                      {/* Tombol Submit Masuk */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md mt-2 ${activeRoleObj?.btnClass} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Memproses Masuk...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound size={16} />
                            <span>{activeRoleObj?.submitLabel}</span>
                          </>
                        )}
                      </button>

                      {/* Tombol Daftar Akun Baru (Dinamis Sesuai Peran Aktif) */}
                     {/* Registrasi hanya tersedia untuk Warga dan Admin Panti */}
{selectedRole !== 'admin' && (
  <div className="text-center pt-2">
    <span className="text-xs text-slate-500">
      {selectedRole === 'pengelola panti'
        ? 'Belum memiliki akun pengelola panti? '
        : 'Belum memiliki akun warga? '}

      <button
        type="button"
        onClick={() => {
          setIsRegisterMode(true);
          setLoginEmailError(null);
          setLoginPasswordError(null);
          setLoginSuccessNotice(null);
          setRegError(null);
        }}
        className="text-blue-600 hover:text-blue-800 font-bold underline transition"
      >
        Daftar Akun Baru
      </button>
    </span>
  </div>
)}
                    </form>
                  ) : (
                    /* ================= FORM REGISTRASI (DAFTAR AKUN BARU) ================= */
                    <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-1" noValidate>
                      {/* Alert Error Registrasi */}
                      {regError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                          <AlertCircle size={16} className="text-rose-600 shrink-0" />
                          <span>{regError}</span>
                        </div>
                      )}

                      {/* Pilihan Peran Pendaftaran */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Peran / Kategori Akun *
                        </label>
                        <select
                          value={selectedRole || 'masyarakat'}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                        >
                          <option value="masyarakat">Masyarakat / Warga Umum</option>
                          <option value="pengelola panti">Pengelola Panti Asuhan / LKSA</option>
                        </select>
                      </div>

                      {/* Nama Lengkap */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nama Lengkap
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Contoh: Budi Santoso"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <User size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Email Akun */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Akun
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder={
                              selectedRole === 'pengelola panti'
                                ? 'admin@panti.or.id'
                                : selectedRole === 'admin'
                                ? 'petugas@dinsos.go.id'
                                : 'nama@email.com'
                            }
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <Mail size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Nomor WhatsApp / HP */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nomor WhatsApp / HP
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <Phone size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      {/* Password & Confirm Password */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Kata Sandi
                          </label>
                          <div className="relative">
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              placeholder="Minimal 6 karakter"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              required
                              className="w-full text-xs pl-7 pr-7 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <Lock size={13} className="text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showRegPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Konfirmasi Sandi
                          </label>
                          <div className="relative">
                            <input
                              type={showRegConfirmPassword ? 'text' : 'password'}
                              placeholder="Ulangi kata sandi"
                              value={regConfirmPassword}
                              onChange={(e) => setRegConfirmPassword(e.target.value)}
                              required
                              className={`w-full text-xs pl-7 pr-7 py-2 rounded-xl border bg-white ${
                                regConfirmPassword && regPassword !== regConfirmPassword
                                  ? 'border-rose-400 ring-1 ring-rose-200'
                                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                              }`}
                            />
                            <Lock size={13} className="text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showRegConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Buat Akun Dinamis */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition mt-3 shadow-md ${
                          selectedRole === 'pengelola panti'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                            : selectedRole === 'admin'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                        } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Mendaftarkan ke Server...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            <span>
                              {selectedRole === 'pengelola panti'
                                ? 'Daftar Akun Admin Panti'
                                : selectedRole === 'admin'
                                ? 'Daftar Akun Admin Dinsos'
                                : 'Daftar Akun Warga Baru'}
                            </span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        <span className="text-xs text-slate-500">
                          Sudah memiliki akun?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setIsRegisterMode(false);
                              setRegError(null);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold underline transition"
                          >
                            Masuk di Sini
                          </button>
                        </span>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
