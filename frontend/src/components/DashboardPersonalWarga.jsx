import React, { useState } from 'react';
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
  Building2
} from 'lucide-react';

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
  // Nama Pengguna Dinamis
  const userName = currentUser?.name?.trim() ? currentUser.name : 'Warga';

  // 1. Data Ringkasan Status Layanan (4 Kotak Kartu Berdampingan)
  const summaryCards = [
{
  id: 'cota',
  title: 'Status Pengajuan Adopsi (COTA)',
  value: '1 Berkas Diproses',
  badgeText: 'Tahap Verifikasi PIPA',
  badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
  badgeDot: 'bg-blue-600',
  icon: UserCheck,
  iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
  accentBorder: 'hover:border-blue-300',

  // Buka pencarian nomor pengajuan COTA
  action: () => setIsCotaTrackingOpen(true),

  actionLabel: 'Lihat Pengajuan'
},
    {
      id: 'pengaduan',
      title: 'Laporan Pengaduan Aktif',
      value: '1 Kasus Sedang Ditangani',
      badgeText: 'Investigasi TRC',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      badgeDot: 'bg-amber-500',
      icon: ShieldAlert,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      accentBorder: 'hover:border-amber-300',
      action: onOpenLacak,
      actionLabel: 'Lacak Kasus'
    },
    {
      id: 'relawan',
      title: 'Program Relawan (Volunteer)',
      value: 'Terdaftar / Aktif',
      badgeText: 'Disetujui LKSA',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeDot: 'bg-emerald-500',
      icon: HeartHandshake,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      accentBorder: 'hover:border-emerald-300',
      action: onSwitchToVolunteer,
      actionLabel: 'Jadwal Relawan'
    },
    {
      id: 'donasi',
      title: 'Kontribusi Donasi',
      value: 'Rp 250.000 Terverifikasi',
      badgeText: 'Tervalidasi Audit',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      badgeDot: 'bg-indigo-600',
      icon: Heart,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      accentBorder: 'hover:border-rose-300',
      action: onSwitchToDonasi,
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
            
            {/* Badge Warga Terverifikasi */}
            <div className="flex items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm shadow-xs">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Warga Terverifikasi
              </span>
            </div>

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
              <h2 id="status-summary-heading" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Ringkasan Status Layanan Anda</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Update Realtime
                </span>
              </h2>
            </div>
            <span className="text-xs text-blue-700 font-semibold cursor-default">
              4 Layanan Terhubung
            </span>
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
                    
                    {/* Badge Status Berwarna Sesuai Spesifikasi */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${card.badgeColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${card.badgeDot}`} />
                      {card.badgeText}
                    </span>
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
                      <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/80 text-slate-600">
                        {btn.badge}
                      </span>
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
    </div>
  );
}
