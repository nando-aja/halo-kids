import React, { useState, useEffect } from 'react';
import CotaTrackingModal from './Modals/CotaTrackingModal';
import {
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  Heart,
  HeartHandshake,
  ChevronRight,
  ArrowRight,
  PhoneCall,
  Building2,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import relawanService from '../api/relawanService';
import donasiService from '../api/donasiService';
import adopsiService from '../api/adopsiService';
import pengaduanService from '../api/pengaduanService';

/**
 * Dashboard Personal Warga
 * Tampilan khusus untuk Warga / User Terverifikasi yang sudah login pada "Beranda Informasi".
 * Menggantikan landing page promosi umum dengan kontrol panel ringkas dan terpadu.
 */
export default function DashboardPersonalWarga({
  currentUser,
  onSwitchToPengaduan = () => {},
  onSwitchToAdopsi = () => {},
  onSwitchToDonasi = () => {},
  onSwitchToVolunteer = () => {},
  onSwitchToPanti = () => {},
  onOpenLapor = () => {},
  onOpenLacak = () => {},
  onOpenAdopsi = () => {},
  onOpenHotline = () => {},
  onSelectPanti = () => {}
}) {
  const [isCotaTrackingOpen, setIsCotaTrackingOpen] = useState(false);
  const [isVolunteerListOpen, setIsVolunteerListOpen] = useState(false);
  const [verifiedVolunteers, setVerifiedVolunteers] = useState([]);
  const [isUserVerifiedVolunteer, setIsUserVerifiedVolunteer] = useState(false);
  const [myVolunteerData, setMyVolunteerData] = useState(null);

  const [isDonationHistoryOpen, setIsDonationHistoryOpen] = useState(false);
  const [userDonations, setUserDonations] = useState([]);
  const [totalNominalVerified, setTotalNominalVerified] = useState(0);
  const [verifiedDonationCount, setVerifiedDonationCount] = useState(0);

  const [userAdoptions, setUserAdoptions] = useState([]);
  const [userReports, setUserReports] = useState([]);

  // Nama Pengguna Dinamis
  const userName = currentUser?.name?.trim() ? currentUser.name : 'Warga';

  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      // 1. Muat riwayat dan kontribusi donasi nyata milik user
      try {
        const donations = await donasiService.getMyDonations();
        if (isMounted && Array.isArray(donations)) {
          setUserDonations(donations);
          const verified = donations.filter(d => d.status_verifikasi === 'terverifikasi');
          const sumNominal = verified.reduce((acc, d) => acc + (Number(d.jumlah_nominal) || 0), 0);
          setTotalNominalVerified(sumNominal);
          setVerifiedDonationCount(verified.length);
        }
      } catch (err) {
        console.warn('Gagal memuat donasi warga:', err);
      }

      // 2. Muat status relawan user & daftar relawan terverifikasi
      try {
        const [myRegistrations, allVerified] = await Promise.allSettled([
          relawanService.getMyRelawan(),
          relawanService.getVerifiedVolunteers()
        ]);

        if (isMounted) {
          let userApprovedRelawan = null;
          if (myRegistrations.status === 'fulfilled' && Array.isArray(myRegistrations.value)) {
            userApprovedRelawan = myRegistrations.value.find(r => r.status === 'disetujui');
            setMyVolunteerData(userApprovedRelawan || myRegistrations.value[0] || null);
            setIsUserVerifiedVolunteer(!!userApprovedRelawan);
          }

          if (allVerified.status === 'fulfilled' && Array.isArray(allVerified.value)) {
            setVerifiedVolunteers(allVerified.value);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat data relawan:', err);
      }

      // 3. Muat status adopsi COTA & laporan pengaduan nyata milik user
      try {
        const [adoptionsRes, reportsRes] = await Promise.allSettled([
          adopsiService.getMyAdoptions(),
          pengaduanService.getMyPengaduan()
        ]);

        if (isMounted) {
          if (adoptionsRes.status === 'fulfilled' && Array.isArray(adoptionsRes.value)) {
            setUserAdoptions(adoptionsRes.value);
          }
          if (reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value)) {
            setUserReports(reportsRes.value);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat data adopsi/pengaduan:', err);
      }
    }

    loadUserData();
    return () => { isMounted = false; };
  }, [currentUser]);

  // 1. Data Ringkasan Status Layanan (4 Kotak Kartu Berdampingan)
  const summaryCards = [
    {
      id: 'cota',
      title: 'Status Pengajuan Adopsi (COTA)',
      value: userAdoptions.length > 0 
        ? `${userAdoptions.length} Berkas Diajukan` 
        : 'Belum Ada Pengajuan',
      badgeText: userAdoptions.length > 0 
        ? (userAdoptions[0].status ? `Status: ${userAdoptions[0].status.replace(/_/g, ' ')}` : 'Diproses') 
        : 'Belum Ada Berkas',
      badgeColor: userAdoptions.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200',
      badgeDot: userAdoptions.length > 0 ? 'bg-blue-600' : 'bg-slate-400',
      icon: UserCheck,
      iconBg: userAdoptions.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200',
      accentBorder: 'hover:border-blue-300',
      action: userAdoptions.length > 0 ? () => setIsCotaTrackingOpen(true) : onSwitchToAdopsi,
      actionLabel: userAdoptions.length > 0 ? 'Lihat Pengajuan' : 'Ajukan Adopsi'
    },
    {
      id: 'pengaduan',
      title: 'Laporan Pengaduan Aktif',
      value: userReports.length > 0 
        ? `${userReports.length} Laporan Diajukan` 
        : 'Belum Ada Laporan',
      badgeText: userReports.length > 0 
        ? (userReports[0].status ? `Status: ${userReports[0].status.replace(/_/g, ' ')}` : 'Diproses') 
        : 'Aman & Terkendali',
      badgeColor: userReports.length > 0 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200',
      badgeDot: userReports.length > 0 ? 'bg-amber-500' : 'bg-slate-400',
      icon: ShieldAlert,
      iconBg: userReports.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200',
      accentBorder: 'hover:border-amber-300',
      action: userReports.length > 0 ? onOpenLacak : (onOpenLapor || onSwitchToPengaduan),
      actionLabel: userReports.length > 0 ? 'Lacak Kasus' : 'Buat Laporan'
    },
    {
      id: 'relawan',
      title: 'Program Relawan (Volunteer)',
      value: isUserVerifiedVolunteer ? 'Terdaftar / Aktif' : 'Belum Terdaftar',
      badgeText: isUserVerifiedVolunteer ? 'Disetujui LKSA' : 'Belum Terdaftar',
      badgeColor: isUserVerifiedVolunteer ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
      badgeDot: isUserVerifiedVolunteer ? 'bg-emerald-500' : 'bg-slate-400',
      icon: HeartHandshake,
      iconBg: isUserVerifiedVolunteer ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200',
      accentBorder: 'hover:border-emerald-300',
      action: () => setIsVolunteerListOpen(true),
      actionLabel: 'Lihat Peserta Relawan'
    },
    {
      id: 'donasi',
      title: 'Kontribusi Donasi',
      value: verifiedDonationCount > 0
        ? `Rp ${totalNominalVerified.toLocaleString('id-ID')} (${verifiedDonationCount}x Donasi)`
        : 'Rp 0 (Belum Ada Donasi)',
      badgeText: verifiedDonationCount > 0 ? 'Tervalidasi Audit' : 'Belum Berdonasi',
      badgeColor: verifiedDonationCount > 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200',
      badgeDot: verifiedDonationCount > 0 ? 'bg-indigo-600' : 'bg-slate-400',
      icon: Heart,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      accentBorder: 'hover:border-rose-300',
      action: () => setIsDonationHistoryOpen(true),
      actionLabel: 'Riwayat Donasi'
    }
  ];

  // 2. Tombol Pintasan Aksi Cepat (Quick Actions Grid)
  const quickActions = [
    {
      id: 'lapor',
      title: 'Buat Laporan Aduan',
      badge: 'Respon Cepat 24 Jam',
      icon: ShieldAlert,
      themeColor: 'from-red-500 to-rose-600',
      cardBg: 'bg-gradient-to-br from-rose-50/80 via-white to-red-50/40 border-rose-200 hover:border-rose-400',
      iconContainer: 'bg-rose-600 text-white shadow-md shadow-rose-200',
      textColor: 'text-rose-950',
      action: onOpenLapor || onSwitchToPengaduan
    },
    {
      id: 'adopsi',
      title: 'Ajukan Adopsi COTA',
      badge: 'Resmi Dinsos',
      icon: UserCheck,
      themeColor: 'from-blue-600 to-indigo-600',
      cardBg: 'bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border-blue-200 hover:border-blue-400',
      iconContainer: 'bg-blue-600 text-white shadow-md shadow-blue-200',
      textColor: 'text-blue-950',
      action: onSwitchToAdopsi
    },
    {
      id: 'donasi',
      title: 'Kirim Donasi Panti',
      badge: 'Audit Akuntabel',
      icon: Heart,
      themeColor: 'from-rose-500 to-pink-600',
      cardBg: 'bg-gradient-to-br from-pink-50/80 via-white to-rose-50/40 border-pink-200 hover:border-pink-400',
      iconContainer: 'bg-pink-600 text-white shadow-md shadow-pink-200',
      textColor: 'text-slate-900',
      action: onSwitchToDonasi
    },
    {
      id: 'relawan',
      title: 'Daftar Relawan',
      badge: 'Sertifikat Dinsos',
      icon: HeartHandshake,
      themeColor: 'from-teal-600 to-emerald-600',
      cardBg: 'bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/40 border-teal-200 hover:border-teal-400',
      iconContainer: 'bg-teal-600 text-white shadow-md shadow-teal-200',
      textColor: 'text-slate-900',
      action: onSwitchToVolunteer
    }
  ];

  return (
    <div className="flex-1 w-full pb-14 bg-slate-50 min-h-screen">
      
      {/* =========================================================================
          BARIS 1: BANNER BIRU SAMBUTAN PENGGUNA
          Sapaan Ramah: "Selamat Datang, [Nama User]!" + Badge "Warga Terverifikasi"
          Subjudul: Pantau status pengajuan adopsi, laporan pengaduan kasus, kontribusi donasi, serta program relawan Anda di sini.
         ========================================================================= */}
      <section
        aria-label="Banner Sambutan Pengguna"
        className="w-full relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white border-b border-blue-900/40 shadow-xs"
      >
        {/* Dekorasi Visual Latar Belakang */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
          <div className="space-y-2.5 max-w-3xl">
            {/* Judul Sapaan Hangat */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Selamat Datang, {userName}!</span>
              <span className="inline-block text-2xl animate-bounce" role="img" aria-label="Melambai">👋</span>
            </h1>

            {/* Subjudul Ringkas Sesuai Kebutuhan */}
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl">
              Pantau status pengajuan adopsi, laporan pengaduan kasus, kontribusi donasi, serta program relawan Anda di sini.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          KONTAINER KONTEN UTAMA (MENGALIR LURUS KE BAWAH TANPA TUMPANG TINDIH)
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 space-y-8 sm:space-y-9">
        
        {/* =========================================================================
            BARIS 2: KARTU RINGKASAN STATUS LAYANAN (4 KOTAK KARTU BERDAMPINGAN)
            - Kartu 1: Status Pengajuan Adopsi (COTA) -> "1 Berkas Diproses" (Badge Biru)
            - Kartu 2: Laporan Pengaduan Aktif -> "1 Kasus Sedang Ditangani" (Badge Oranye)
            - Kartu 3: Program Relawan (Volunteer) -> "Terdaftar / Aktif" (Badge Hijau)
            - Kartu 4: Kontribusi Donasi -> "Rp 250.000 Terverifikasi"
           ========================================================================= */}
        <section aria-labelledby="status-summary-heading" className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="status-summary-heading" className="text-base sm:text-lg font-bold text-slate-900">
                Ringkasan Status Layanan Anda
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {summaryCards.map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={card.action}
                  className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${card.accentBorder}`}
                >
                  {/* Highlight bar di pojok atas */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${card.iconBg}`}>
                      <IconComp size={22} />
                    </div>
                  </div>

                  {/* Isi Konten Kartu */}
                  <div className="space-y-1 mb-3.5">
                    <p className="text-xs font-semibold text-slate-500">
                      {card.title}
                    </p>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {card.value}
                    </p>
                  </div>

                  {/* Tombol Aksi Bawah */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-800">
                    <span>{card.actionLabel}</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            BAGIAN 3: TOMBOL PINTASAN AKSI CEPAT (QUICK ACTIONS GRID)
            - Tombol 1: "Buat Laporan Aduan" (ikon pengaduan/darurat)
            - Tombol 2: "Ajukan Adopsi COTA" (ikon adopsi)
            - Tombol 3: "Kirim Donasi Panti" (ikon donasi/hati)
            - Tombol 4: "Daftar Relawan" (ikon relawan/tangan)
           ========================================================================= */}
        <section aria-labelledby="quick-actions-heading" className="space-y-3.5">
          <div>
            <h2 id="quick-actions-heading" className="text-base sm:text-lg font-bold text-slate-900">
              Pintasan Aksi Cepat Warga
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((btn) => {
              const ActionIcon = btn.icon;
              return (
                <button
                  key={btn.id}
                  onClick={btn.action}
                  className={`text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-2xs hover:shadow-md ${btn.cardBg}`}
                >
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${btn.iconContainer}`}>
                        <ActionIcon size={24} />
                      </div>
                    </div>

                    <div>
                      <h3 className={`font-bold text-base transition-colors ${btn.textColor} group-hover:text-blue-900`}>
                        {btn.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-700">
                    <span>Mulai Sekarang</span>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all border border-slate-200">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            BAGIAN PENDUKUNG: BANNER INFORMASI DINSOS & PANTI TERDEKAT
           ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Direktori Panti Asuhan */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Direktori Lembaga Anak (LKSA)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Temukan 18 LKSA resmi binaan Dinas Sosial untuk menyalurkan bantuan langsung atau survei lapangan.
              </p>
            </div>
            <button
              onClick={onSwitchToPanti}
              className="mt-4 inline-flex items-center justify-between w-full text-xs font-bold text-blue-700 hover:text-blue-800 pt-3 border-t border-slate-100"
            >
              <span>Jelajahi Direktori Panti</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Card 2: Pengangkatan Anak Legal (COTA) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Panduan Hak & Regulasi Adopsi</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pelajari 9 langkah verifikasi hukum, batas usia COTA, dan ketentuan sidang pertimbangan izin pengangkatan anak.
              </p>
            </div>
            <button
              onClick={onSwitchToAdopsi}
              className="mt-4 inline-flex items-center justify-between w-full text-xs font-bold text-indigo-700 hover:text-indigo-800 pt-3 border-t border-slate-100"
            >
              <span>Baca Panduan Sidang PIPA</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Card 3: Layanan Darurat TRC */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50/60 rounded-2xl p-5 border border-rose-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
                <PhoneCall size={20} />
              </div>
              <h3 className="font-bold text-rose-950 text-sm">Layanan Darurat Siaga 24 Jam</h3>
              <p className="text-xs text-rose-800/80 leading-relaxed">
                Temukan kasus darurat anak di jalanan atau kekerasan saat ini? Hubungi langsung Posko TRC Dinsos.
              </p>
            </div>
            <button
              onClick={onOpenHotline}
              className="mt-4 inline-flex items-center justify-between w-full text-xs font-bold text-rose-700 hover:text-rose-800 pt-3 border-t border-rose-200/60"
            >
              <span>Hubungi Hotline Darurat TRC</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>
           <CotaTrackingModal
        isOpen={isCotaTrackingOpen}
        onClose={() => setIsCotaTrackingOpen(false)}
      />

      {/* MODAL DAFTAR PESERTA VOLUNTEER TERVERIFIKASI */}
      {isVolunteerListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <HeartHandshake size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daftar Peserta Relawan Terverifikasi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sahabat Panti &amp; Bakti Sosial Dinsos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVolunteerListOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {/* Keterangan jika user belum terdaftar / belum disetujui (murni kalimat tanpa tombol) */}
              {!isUserVerifiedVolunteer ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold">
                  anda tidak masuk daftar, ayo segera daftar jadi relawan!
                </div>
              ) : (
                /* User Sendiri Wajib Tampil Paling Atas */
                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-500 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5">
                      <span>{userName} (Anda)</span>
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Akun Anda
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Disetujui / Aktif
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-900 flex flex-wrap gap-x-3 gap-y-1">
                    <span><strong>Bidang:</strong> {myVolunteerData?.bidang || 'Bakti Sosial & Edukasi'}</span>
                    <span><strong>Tujuan:</strong> {myVolunteerData?.panti_tujuan || 'LKSA Binaan'}</span>
                  </div>
                </div>
              )}

              {/* Daftar Peserta Relawan Lainnya Yang Terverifikasi */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-slate-700">
                  Peserta Relawan Terverifikasi Lainnya:
                </p>

                {verifiedVolunteers.filter(v => v.id_user !== currentUser?.id).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Belum ada peserta relawan terverifikasi lainnya saat ini.
                  </p>
                ) : (
                  verifiedVolunteers
                    .filter(v => v.id_user !== currentUser?.id)
                    .map((vol, index) => (
                      <div
                        key={vol.id || index}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {vol.nama}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {vol.bidang || 'Relawan'} • {vol.panti_tujuan || 'LKSA Terdaftar'}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          Terverifikasi
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVolunteerListOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT KONTRIBUSI DONASI USER */}
      {isDonationHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Heart size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Riwayat Kontribusi Donasi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Total: Rp {totalNominalVerified.toLocaleString('id-ID')} ({verifiedDonationCount} kali donasi berhasil)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDonationHistoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {userDonations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-2">
                  <Heart size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-medium">
                    Anda belum memiliki riwayat donasi dari akun ini.
                  </p>
                </div>
              ) : (
                userDonations.map((item) => {
                  const isVerified = item.status_verifikasi === 'terverifikasi';
                  const isRejected = item.status_verifikasi === 'ditolak';
                  const nominalStr = Number(item.jumlah_nominal || 0).toLocaleString('id-ID');

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isVerified
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isRejected
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-amber-50/30 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {item.nama_panti || 'Panti Asuhan Binaan Dinsos'}
                          </p>
                          <p className="text-sm font-extrabold text-blue-900">
                            {item.jenis_donasi === 'uang'
                              ? `Rp ${nominalStr}`
                              : `${item.nama_barang || 'Donasi Barang'} (${item.jumlah_barang || 1} unit)`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isVerified ? 'Berhasil' : isRejected ? 'Ditolak' : 'Menunggu Verifikasi'}
                        </span>
                      </div>

                      {/* Notifikasi alasan jika donasi ditolak admin/dinsos */}
                      {isRejected && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-900 text-[11px] font-medium flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-rose-600 shrink-0" />
                          <span>
                            {item.catatan_admin || 'Donasi ditolak karena data bukti transfer tidak sesuai dengan nominal yang diajukan.'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDonationHistoryOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
