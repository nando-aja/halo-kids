import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Eye,
  Search,
  LogOut,
  FileSpreadsheet,
  Download,
  MapPin,
  Calendar,
  ShieldCheck,
  Package,
  Wallet,
  TrendingUp,
  X,
  UserPlus,
  HeartHandshake,
  GraduationCap,
  Palette,
  XCircle,
  MessageCircle,
  Bot,
  Trash2,
  User,
  FileText,
  RefreshCw,
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdminDocumentReview } from '../components/AiVerification';
import {
  pantiService,
  donasiService,
  adopsiService,
  relawanService,
  pengaduanService
} from '../api';

export default function DashboardUtama({ onSwitchToLanding, onLogout, currentUser, volunteerList, setVolunteerList }) {
  const getRoleMode = (u) => {
    if (!u) return 'user';

    // Samakan prioritas pembacaan role dengan App.jsx.
    // Jangan gunakan roleMode karena dapat berasal dari mode demo/tampilan lama.
    // The backend's canonical role takes precedence over UI/demo aliases.
    // Do not infer access from roleMode or manually selected display state.
    const rawRole = u.peran || u.role || u.roleCode || '';
    const role = String(rawRole).trim().toLowerCase().replace(/[_\s]+/g, '-');

    if ([
      'admin',
      'super-admin',
      'superadmin',
      'admin-dinsos',
      'dinas-sosial-(super-admin)',
      'dinas-sosial-super-admin'
    ].includes(role)) {
      return 'superadmin';
    }

    if ([
      'admin-panti',
      'admin-lksa',
      'pengelola-panti',
      'pengelola-lksa',
      'pantiadmin'
    ].includes(role)) {
      return 'pantiadmin';
    }

    return 'user';
  };

  // Role mode is derived from the authenticated account; it is not user-switchable.
  const dashboardRoleMode = getRoleMode(currentUser);

  // Active Menu Tab for User Publik
  const [userTab, setUserTab] = useState('adopsi'); // 'adopsi' | 'pengaduan' | 'donasi' | 'panti'

  // Active Menu Tab for Super Admin
  const [superAdminTab, setSuperAdminTab] = useState('approval_panti'); // 'approval_panti' | 'supervisi_adopsi' | 'monitoring_hilang' | 'audit_donasi' | 'analitik_eksekutif'

  // Active Menu Tab for Admin Panti
  const [pantiAdminTab, setPantiAdminTab] = useState('daftar_anak'); // 'daftar_anak' | 'input_donasi' | 'laporan_hilang_panti' | 'formulir_adopsi_panti' | 'volunteer_panti'

  // AI Verification Review Modal (PRD Single-Agent AI)
  const [showAiAdminReviewModal, setShowAiAdminReviewModal] = useState(false);
  const [selectedAdopsiApplicant, setSelectedAdopsiApplicant] = useState(null);

  // Common UI Notification Toast
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ----------------------------------------------------
  // DATA STATES FOR VOLUNTEER (REQUIREMENT VOLUNTEER)
  // ----------------------------------------------------
  const defaultVolunteers = [
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
  ];

  const [localVolunteers, setLocalVolunteers] = useState(defaultVolunteers);
  const currentVolunteers = volunteerList && volunteerList.length > 0 ? volunteerList : localVolunteers;

  const [volunteerFilter, setVolunteerFilter] = useState('Semua');
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [selectedKtpDoc, setSelectedKtpDoc] = useState(null);

  const handleApproveVolunteer = async (vol) => {
    try {
      const targetId = vol.rawId || (typeof vol.id === 'string' && vol.id.includes('-') ? parseInt(vol.id.split('-')[1], 10) : vol.id);
      if (targetId && !isNaN(targetId)) {
        await relawanService.updateStatus(targetId, 'disetujui');
      }
    } catch (err) {
      console.warn('API approve volunteer fallback:', err);
    }
    const updated = currentVolunteers.map(v => v.id === vol.id ? { ...v, status: 'Disetujui' } : v);
    if (setVolunteerList) setVolunteerList(updated);
    setLocalVolunteers(updated);
    showToast(`Relawan ${vol.nama} BERHASIL DISETUJUI! Notifikasi penerimaan diterbitkan.`);
  };

  const handleRejectVolunteer = async (vol) => {
    try {
      const targetId = vol.rawId || (typeof vol.id === 'string' && vol.id.includes('-') ? parseInt(vol.id.split('-')[1], 10) : vol.id);
      if (targetId && !isNaN(targetId)) {
        await relawanService.updateStatus(targetId, 'ditolak');
      }
    } catch (err) {
      console.warn('API reject volunteer fallback:', err);
    }
    const updated = currentVolunteers.map(v => v.id === vol.id ? { ...v, status: 'Ditolak' } : v);
    if (setVolunteerList) setVolunteerList(updated);
    setLocalVolunteers(updated);
    showToast(`Pendaftaran relawan ${vol.nama} DITOLAK.`);
  };

  // ----------------------------------------------------
  // DATA STATES FOR SUPER ADMIN (DINSOS)
  // ----------------------------------------------------

  // 1. Panti Approval & Status LKSA (Super Admin Req #1)
  const [pantiRegistrations, setPantiRegistrations] = useState([
    { id: 'REG-LKSA-091', name: 'LKSA Nurul Hidayah Cileungsi', pengurus: 'Ust. Abdul Karim', email: 'pengurus@panti-nurulhidayah.or.id', phone: '0812-3344-5566', address: 'Kec. Cileungsi', status: 'Menunggu Verifikasi Dinsos', akreditasi: 'Pengajuan Baru' },
    { id: 'REG-LKSA-088', name: 'Yayasan Mutiara Kasih Gunung Putri', pengurus: 'Ir. Ahmad Subagja', email: 'admin@mutiarakasih.org', phone: '0813-9988-7711', address: 'Kec. Gunung Putri', status: 'Disetujui / Aktif', akreditasi: 'AKREDITASI A' },
    { id: 'REG-LKSA-075', name: 'LKSA Kasih Bunda Mandiri', pengurus: 'Dra. Hj. Siti Aminah', email: 'admin@kasihbunda.or.id', phone: '0812-9988-7711', address: 'Kec. Cibinong', status: 'Disetujui / Aktif', akreditasi: 'AKREDITASI A' },
    { id: 'REG-LKSA-062', name: 'Panti Balita Tunas Bangsa', pengurus: 'Ns. Ratna Juwita', email: 'info@tunasbangsa.or.id', phone: '0813-8822-4400', address: 'Kec. Cibinong', status: 'Disetujui / Aktif', akreditasi: 'AKREDITASI A' }
  ]);

  // 2. Master Data Anak & Validasi Adopsi PIPA (Super Admin Req #2)
  // Daftar COTA harus berasal dari backend; jangan tampilkan pemohon demo sebagai data nyata.
  const [adopsiApplications, setAdopsiApplications] = useState([]);

  // 3. Control Pelaporan Anak Hilang & Eskalasi (Super Admin Req #3)
  // Data contoh anak hilang untuk panel pencocokan panti (bukan daftar pengaduan sensitif).
  const [lostChildReports, setLostChildReports] = useState([
    { id: 'HILANG-DEMO-099', childName: 'Contoh kasus sintetis Rian (L, 8 Thn)', reporter: 'Pemeran sintetis', location: 'Kec. Cibinong', date: 'Data demo', photo: '/lksa1.jpg', status: 'Dalam simulasi', officer: 'Tim Demo' },
    { id: 'HILANG-DEMO-082', childName: 'Contoh kasus sintetis Nayla (P, 5 Thn)', reporter: 'Pemeran sintetis', location: 'Kec. Ciawi', date: 'Data demo', photo: '/lksa2.jpg', status: 'Dalam simulasi', officer: 'Tim Demo' }
  ]);
  // Pengaduan sensitif selalu berasal dari API admin dan dipisah dari data contoh panti.
  const [complaintReports, setComplaintReports] = useState([]);
  const [reportSyncStatus, setReportSyncStatus] = useState('loading');
  const [reportAttachments, setReportAttachments] = useState({});
  const [reportAttachmentsLoading, setReportAttachmentsLoading] = useState({});
  const [reportAttachmentsErrors, setReportAttachmentsErrors] = useState({});
  const [reportSyncError, setReportSyncError] = useState('');

  // 4. Audit Donasi Daerah & Pemetaan Kebutuhan (Super Admin Req #4)
  const regionalDonationAudit = [
    { panti: 'LKSA Kasih Bunda Mandiri', location: 'Cibinong', moneyReceived: 'Rp 45.500.000', goodsReceived: '85 Paket Sembako & Seragam', priorityNeed: 'Sedang', mainNeed: 'Buku Tulis & Sepatu' },
    { panti: 'Panti Balita Tunas Bangsa', location: 'Cibinong', moneyReceived: 'Rp 62.000.000', goodsReceived: '120 Pax Popok & Susu', priorityNeed: 'KRITIS (Mendesak)', mainNeed: 'Susu Formula SGM & Perlak' },
    { panti: 'LKSA Bina Harapan Ciawi', location: 'Ciawi', moneyReceived: 'Rp 28.100.000', goodsReceived: '15 Unit Komputer & Alat Boga', priorityNeed: 'Tinggi', mainNeed: 'Bahan Pelatihan Boga' }
  ];

  // ----------------------------------------------------
  // DATA STATES FOR ADMIN PANTI (REQUIREMENT 2)
  // ----------------------------------------------------

  // 1. Daftar Anak Asuh Panti (Admin Panti Req 2.1)
  const [pantiChildren, setPantiChildren] = useState([
    { id: 'ANK-001', name: 'Ahmad Faiz', age: '3 Tahun', gender: 'Laki-Laki', status: 'Yatim Piatu', education: 'PAUD Belum Sekolah', joinDate: '12 Jan 2023', health: 'Sehat Walafiat' },
    { id: 'ANK-002', name: 'Siti Nurhaliza', age: '6 Tahun', gender: 'Perempuan', status: 'Yatim', education: 'TK B', joinDate: '05 Mar 2022', health: 'Sehat' },
    { id: 'ANK-003', name: 'Budi Santoso', age: '14 Tahun', gender: 'Laki-Laki', status: 'Anak Terlantar', education: 'SMP Kelas 8', joinDate: '19 Aug 2021', health: 'Sehat' },
    { id: 'ANK-004', name: 'Annisa Putri', age: '10 Tahun', gender: 'Perempuan', status: 'Piatu', education: 'SD Kelas 5', joinDate: '10 Feb 2024', health: 'Sehat' }
  ]);

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newChildStatus, setNewChildStatus] = useState('Yatim Piatu');

  // 2. Input Donasi Barang Dibutuhkan & Keterangan Uang Masuk (Admin Panti Req 2.2)
  const [pantiNeededGoods, setPantiNeededGoods] = useState([
    { id: 1, item: 'Sembako Beras 10kg & Minyak', qty: '20 Paket', status: 'Mendesak / Barang Habis' },
    { id: 2, item: 'Seragam SD/SMP Lengkap', qty: '15 Pasang', status: 'Hampir Habis' },
    { id: 3, item: 'Buku Tulis & Alat Sekolah', qty: '40 Paket', status: 'Tersedia Sebagian' }
  ]);

  const [pantiCashIncome, setPantiCashIncome] = useState([
    { id: 'TRX-9941', date: 'Hari ini, 11:20 WIB', donor: 'Hamba Allah (BCA)', amount: 'Rp 1.500.000', program: 'Donasi Sembako Panti' },
    { id: 'TRX-9938', date: 'Kemarin', donor: 'Bpk. Rahmat (QRIS)', amount: 'Rp 500.000', program: 'Operasional Panti' },
    { id: 'TRX-9920', date: '04 Oct 2024', donor: 'PT Mitra Mulia (Mandiri)', amount: 'Rp 10.000.000', program: 'Beasiswa Anak Asuh' }
  ]);

  const [newNeedItem, setNewNeedItem] = useState('');
  const [newNeedQty, setNewNeedQty] = useState('');
  const [newNeedUrgency, setNewNeedUrgency] = useState('');

  // ----------------------------------------------------
  // DATA STATES UNTUK DASHBOARD PERSONAL WARGA (REQ #3)
  // ----------------------------------------------------
  const [userAdoptions, setUserAdoptions] = useState([]);
  const [userPengaduan, setUserPengaduan] = useState([]);
  const [userRelawan, setUserRelawan] = useState([]);
  const [userDonasi, setUserDonasi] = useState([]);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);
  const [userTrackTicketInput, setUserTrackTicketInput] = useState('');
  const [userTrackResult, setUserTrackResult] = useState(null);
  const [isTrackingTicket, setIsTrackingTicket] = useState(false);

  // Additional End-to-End Live States
  const [adminDonations, setAdminDonations] = useState([]);
  const [pantiAdoptions, setPantiAdoptions] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  // ----------------------------------------------------
  // SINKRONISASI DATA DARI FASTAPI BACKEND
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function syncBackendData() {
      try {
        if (dashboardRoleMode === 'user') {
          setIsUserDataLoading(true);
          try {
            const adopsiRes = await adopsiService.getMyAdoptions();
            if (isMounted && Array.isArray(adopsiRes)) setUserAdoptions(adopsiRes);
          } catch (e) {
            console.warn('My adoptions sync:', e);
          }
          try {
            const pengaduanRes = await pengaduanService.getMyPengaduan();
            if (isMounted && Array.isArray(pengaduanRes)) setUserPengaduan(pengaduanRes);
          } catch (e) {
            console.warn('My pengaduan sync:', e);
          }
          try {
            const relawanRes = await relawanService.getMyRelawan();
            if (isMounted && Array.isArray(relawanRes)) setUserRelawan(relawanRes);
          } catch (e) {
            console.warn('My relawan sync:', e);
          }
          try {
            const donasiRes = await donasiService.getMyDonations();
            if (isMounted && Array.isArray(donasiRes)) setUserDonasi(donasiRes);
          } catch (e) {
            console.warn('My donasi sync:', e);
          }
          if (isMounted) setIsUserDataLoading(false);
        } else if (dashboardRoleMode === 'pantiadmin') {
          // 1. Ambil Wishlist Panti LKSA dari API
          try {
            const rawWishlist = await pantiService.getWishlist();
            if (isMounted && Array.isArray(rawWishlist) && rawWishlist.length > 0) {
              setPantiNeededGoods(rawWishlist.map(w => ({
                id: w.id,
                item: w.nama_barang,
                qty: `${w.jumlah_terpenuhi}/${w.jumlah_kebutuhan} Unit`,
                status: w.jumlah_terpenuhi >= w.jumlah_kebutuhan ? 'Tercukupi' : 'Mendesak / Barang Habis'
              })));
            }
          } catch (wErr) {
            console.warn('Wishlist sync fallback:', wErr);
          }

          // 2. Ambil Rekapitulasi Donasi Masuk Panti dari API
          try {
            const rawDonasi = await pantiService.getPantiDonations();
            if (isMounted && Array.isArray(rawDonasi) && rawDonasi.length > 0) {
              setPantiCashIncome(rawDonasi.map(d => ({
                id: `TRX-${d.id}`,
                rawId: d.id,
                date: d.tanggal_donasi ? new Date(d.tanggal_donasi).toLocaleDateString('id-ID') : 'Hari ini',
                donor: d.id_user ? `Donatur #${d.id_user}` : 'Warga Umum',
                amount: d.jenis_donasi === 'uang' ? `Rp ${Number(d.jumlah_nominal).toLocaleString('id-ID')}` : `${d.nama_barang || 'Paket Logistik'} (${d.jumlah_barang || 1} ${d.satuan_barang || 'Paket'})`,
                program: d.jenis_donasi === 'uang' ? 'Donasi Uang Masuk' : 'Donasi Logistik Panti',
                jenis: d.jenis_donasi,
                bukti_transfer: d.bukti_transfer,
                status: d.status_verifikasi
              })));
            }
          } catch (dErr) {
            console.warn('Panti donation sync fallback:', dErr);
          }

          // 3. Ambil Permohonan Adopsi Masuk Panti dari API
          try {
            const rawPantiAdoptions = await pantiService.getPantiAdoptions();
            if (isMounted && Array.isArray(rawPantiAdoptions) && rawPantiAdoptions.length > 0) {
              setPantiAdoptions(rawPantiAdoptions.map(a => ({
                id: `PIPA-2024-${a.id}`,
                rawId: a.id,
                applicant: a.nama_pemohon,
                targetChild: 'Anak Asuh Panti',
                originPanti: 'LKSA Kasih Bunda Mandiri',
                status: a.status === 'diverifikasi' ? 'Disetujui / Rekomendasi Terbit' : a.status === 'ditolak' ? 'Ditolak' : 'Menunggu Verifikasi Berkas Awal'
              })));
            }
          } catch (adpErr) {
            console.warn('Panti adoptions sync fallback:', adpErr);
          }
        } else if (dashboardRoleMode === 'superadmin') {
          // 1. Ambil Antrean Adopsi COTA
          try {
            const rawAdoptions = await adopsiService.getAdminAdoptions();
            if (isMounted && Array.isArray(rawAdoptions)) {
              setAdopsiApplications(rawAdoptions.map((a) => {
                const rawStatus = String(a.status || '').toLowerCase();
                const statusLabels = {
                  diverifikasi: 'SK Pengangkatan Anak Terbit (Disetujui)',
                  ditolak: 'Berkas Ditolak Sidang PIPA',
                  butuh_dokumen_tambahan: 'Menunggu Unggah Ulang Berkas',
                  menunggu_tinjauan_manual: 'Menunggu Tinjauan Manual AI',
                  diajukan: 'Pengajuan Diajukan',
                };
                const supporting = a.dokumen_pendukung;
                const supportingNames = Array.isArray(supporting)
                  ? supporting.map((value, index) => typeof value === 'string' ? value.split(/[\\/]/).pop() : `Dokumen tambahan ${index + 1}`)
                  : Object.entries(supporting || {})
                      .filter(([, value]) => Boolean(value))
                      .map(([key]) => key.replace(/[_-]+/g, ' '));
                const docs = [
                  ...(a.dokumen_ktp ? ['KTP'] : []),
                  ...(a.dokumen_kk ? ['KK'] : []),
                  ...supportingNames,
                ];
                return {
                  id: `PIPA-2024-${a.id}`,
                  rawId: a.id,
                  applicant: a.nama_pemohon || `Pemohon #${a.id}`,
                  targetChild: 'Calon Anak Binaan',
                  originPanti: 'LKSA Binaan Dinsos',
                  score: a.hasil_ekstraksi_ai ? 'Hasil analisis AI tersedia' : 'Belum ada hasil analisis AI',
                  rawStatus,
                  status: statusLabels[rawStatus] || 'Verifikasi Sidang PIPA Dinsos',
                  docs,
                  dokumen_ktp: a.dokumen_ktp ?? null,
                  dokumen_kk: a.dokumen_kk ?? null,
                  dokumen_pendukung: a.dokumen_pendukung ?? null,
                  hasil_ekstraksi_ai: a.hasil_ekstraksi_ai ?? null,
                };
              }));
            }
          } catch (aErr) {
            console.warn('Adoption admin sync fallback:', aErr);
          }

          // 2. Ambil Seluruh Pendaftar Relawan
          try {
            const rawVolunteers = await relawanService.getAdminRelawan();
            if (isMounted && Array.isArray(rawVolunteers) && rawVolunteers.length > 0) {
              const mappedVols = rawVolunteers.map(v => ({
                id: `VOL-${v.id}`,
                rawId: v.id,
                nama: v.nama,
                nomorHp: v.nomor_hp,
                alamat: v.alamat,
                usia: v.usia,
                bidang: v.bidang,
                pantiTujuan: v.panti_tujuan || 'LKSA Kasih Bunda Mandiri',
                tanggal: v.tanggal,
                sesiWaktu: v.sesi_waktu,
                tujuanKerelawanan: v.tujuan_kerelawanan,
                ktpFileName: 'scan_identitas_relawan.jpg',
                ktpFileSize: '900 KB',
                status: v.status === 'disetujui' ? 'Disetujui' : v.status === 'ditolak' ? 'Ditolak' : 'Menunggu Persetujuan',
                submittedAt: v.created_at ? new Date(v.created_at).toLocaleDateString('id-ID') : 'Baru saja'
              }));
              if (setVolunteerList) setVolunteerList(mappedVols);
              setLocalVolunteers(mappedVols);
            }
          } catch (vErr) {
            console.warn('Volunteer admin sync fallback:', vErr);
          }

          // Data audit donasi sudah disinkronkan pada blok di atas.

          // 4. Ambil Seluruh Pengaduan Masuk (Monitoring Kedaruratan)
          try {
            const rawReports = await pengaduanService.getAdminPengaduan();
            if (isMounted && Array.isArray(rawReports)) {
              setComplaintReports(rawReports.map(r => ({
                id: r.kode_tiket || `HK-${r.id}`,
                rawId: r.id,
                childName: r.jenis_laporan || 'Laporan Pengaduan Anak',
                reporter: r.id_user ? `Warga #${r.id_user}` : 'Pelapor Publik',
                location: 'Wilayah Kabupaten',
                date: r.tanggal_lapor ? new Date(r.tanggal_lapor).toLocaleString('id-ID') : 'Waktu tidak tersedia',
                status: r.status === 'selesai' ? 'Selesai / Ditangani' : r.status === 'diproses' ? 'Eskalasi TRC & Kepolisian' : 'Baru Masuk / Menunggu Tindakan',
                officer: 'Tim Dinsos',
                isi_laporan: r.isi_laporan
              })));
              setReportSyncStatus('loaded');
              setReportSyncError('');
            }
          } catch (rErr) {
            console.warn('Admin reports sync fallback:', rErr);
            if (isMounted) {
              setComplaintReports([]);
              setReportSyncStatus('error');
              setReportSyncError(rErr?.friendlyMessage || 'Gagal mengambil laporan dari backend. Periksa login Admin Dinsos dan koneksi API.');
            }
          }
        }
      } catch (globalErr) {
        console.warn('Dashboard sync error:', globalErr);
      }
    }
    syncBackendData();

    // Event listener untuk auto update real-time saat form publik submit data
    const handleDataUpdated = () => {
      syncBackendData();
    };
    window.addEventListener('halokids:data_updated', handleDataUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('halokids:data_updated', handleDataUpdated);
    };
  }, [dashboardRoleMode, currentUser]);
  // Memuat audit donasi hanya ketika menu Audit Donasi dibuka.
  // Hook ini berada di tingkat teratas komponen, bukan di dalam fungsi async.
  useEffect(() => {
    if (
      dashboardRoleMode !== 'superadmin' ||
      superAdminTab !== 'audit_donasi'
    ) {
      return;
    }

    let active = true;

    const syncAdminDonations = async () => {
      try {
        const rawDonations = await donasiService.getAdminDonations();
        if (!active || !Array.isArray(rawDonations)) return;

        setAdminDonations(rawDonations.map((d) => ({
          id: `DNS-${d.id}`,
          rawId: d.id,
          date: d.tanggal_donasi
            ? new Date(d.tanggal_donasi).toLocaleDateString('id-ID')
            : 'Hari ini',
          donor: d.id_user ? `Donatur #${d.id_user}` : 'Warga Anonim',
          panti: d.panti_asuhan?.nama_panti || `LKSA Panti #${d.id_panti || 1}`,
          jenis: d.jenis_donasi,
          amount: d.jenis_donasi === 'uang'
            ? `Rp ${Number(d.jumlah_nominal).toLocaleString('id-ID')}`
            : `${d.nama_barang || 'Paket Logistik'} (${d.jumlah_barang || 1} ${d.satuan_barang || 'Paket'})`,
          bukti_transfer: d.bukti_transfer,
          status: d.status_verifikasi,
        })));
      } catch (err) {
        if (active) {
          console.error(
            'Gagal memuat data audit donasi:',
            err?.friendlyMessage || err?.message || err
          );
        }
      }
    };

    syncAdminDonations();
    return () => { active = false; };
  }, [dashboardRoleMode, superAdminTab, currentUser]);

  // Memuat laporan pengaduan ketika menu pengaduan dibuka.
  useEffect(() => {
    if (
      dashboardRoleMode !== 'superadmin' ||
      superAdminTab !== 'monitoring_hilang'
    ) {
      return;
    }

    let active = true;

    const loadComplaintReports = async () => {
      setReportSyncStatus('loading');
      setReportSyncError('');

      try {
        const reports = await pengaduanService.getAdminPengaduan();

        if (!active) return;

        if (!Array.isArray(reports)) {
          throw new Error('Format data laporan dari backend tidak valid.');
        }

        const mappedReports = reports.map((r) => ({
          id: r.kode_tiket || `HK-${r.id}`,
          rawId: r.id,
          childName: r.jenis_laporan || 'Laporan Pengaduan Anak',
          reporter: r.id_user
            ? `Warga #${r.id_user}`
            : 'Pelapor Publik',
          location: 'Wilayah Kabupaten',
          date: r.tanggal_lapor
            ? new Date(r.tanggal_lapor).toLocaleString('id-ID')
            : 'Waktu tidak tersedia',
          status:
            r.status === 'selesai'
              ? 'Selesai / Ditangani'
              : r.status === 'diproses'
                ? 'Eskalasi TRC & Kepolisian'
                : 'Baru Masuk / Menunggu Tindakan',
          officer: 'Tim Dinsos',
          isi_laporan: r.isi_laporan,
        }));

        setComplaintReports(mappedReports);
        setReportSyncStatus('loaded');
        setReportSyncError('');
      } catch (err) {
        if (!active) return;

        console.error('Gagal memuat pengaduan:', err);

        setReportSyncError(
          err?.friendlyMessage ||
          err?.message ||
          'Gagal mengambil laporan dari backend.'
        );

        setReportSyncStatus('error');
      }
    };

    loadComplaintReports();

    return () => {
      active = false;
    };
  }, [dashboardRoleMode, superAdminTab]);

  const handleTrackUserTicket = async (e) => {
    e?.preventDefault();
    const clean = userTrackTicketInput.trim();
    if (!clean) return;
    setIsTrackingTicket(true);
    setUserTrackResult(null);
    try {
      const res = await pengaduanService.trackPengaduan(clean);
      setUserTrackResult(res);
      showToast(`Tiket ${res.kode_tiket} berhasil ditemukan! Status: ${res.status}`);
    } catch (err) {
      setUserTrackResult({ error: true, message: err.friendlyMessage || 'Nomor tiket tidak ditemukan dalam database.' });
    } finally {
      setIsTrackingTicket(false);
    }
  };

  const handleLoadReportAttachments = async (report) => {
    const reportId = report?.rawId;
    if (!reportId) {
      showToast('ID laporan tidak tersedia untuk mengambil lampiran.');
      return;
    }

    setReportAttachmentsLoading((prev) => ({ ...prev, [reportId]: true }));
    setReportAttachmentsErrors((prev) => ({ ...prev, [reportId]: '' }));
    try {
      const response = await pengaduanService.getAdminReportAttachments(reportId);
      const attachments = Array.isArray(response?.lampiran) ? response.lampiran : [];
      setReportAttachments((prev) => ({ ...prev, [reportId]: attachments }));
      if (!attachments.length) {
        showToast('Tidak ada lampiran tersimpan untuk tiket ini.');
      }
    } catch (err) {
      const message = err?.friendlyMessage || err?.message || 'Lampiran gagal dimuat.';
      setReportAttachmentsErrors((prev) => ({ ...prev, [reportId]: message }));
      showToast(message);
    } finally {
      setReportAttachmentsLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  // Konversi status API menjadi label yang dipakai pada dashboard.
  const adoptionStatusLabel = (status) => ({
    diverifikasi: 'SK Pengangkatan Anak Terbit (Disetujui)',
    ditolak: 'Berkas Ditolak Sidang PIPA',
    butuh_dokumen_tambahan: 'Menunggu Unggah Ulang Berkas',
    menunggu_tinjauan_manual: 'Menunggu Tinjauan Manual AI',
    diajukan: 'Pengajuan Diajukan',
  }[String(status || '').toLowerCase()] || 'Verifikasi Sidang PIPA Dinsos');

  const updateAdoptionApplicationInState = (rawId, updatedFields) => {
    setAdopsiApplications((prev) => prev.map((app) =>
      app.rawId === rawId ? { ...app, ...updatedFields } : app
    ));
    setSelectedAdopsiApplicant((prev) =>
      prev?.rawId === rawId ? { ...prev, ...updatedFields } : prev
    );
  };

  // Callback ini dipakai AdminDocumentReview supaya keputusan tersimpan di backend
  // sebelum UI menampilkan keberhasilan.
  const handleModalAdoptionStatus = async (newStatus) => {
    const selected = selectedAdopsiApplicant;
    if (!selected?.rawId) {
      throw new Error('ID pengajuan database tidak tersedia. Pilih pengajuan dari daftar backend.');
    }
    const loadingKey = `adopsi-modal-${selected.rawId}`;
    if (actionLoading[loadingKey]) return;

    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const saved = await adopsiService.updateAdoptionStatus(selected.rawId, newStatus);
      const persistedStatus = String(saved?.status || newStatus).toLowerCase();
      const status = adoptionStatusLabel(persistedStatus);
      updateAdoptionApplicationInState(selected.rawId, {
        rawStatus: persistedStatus,
        status,
      });
      showToast(`Status pengajuan berhasil disimpan: ${status}.`);
      return saved;
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menyimpan status pengajuan ke backend.');
      throw err;
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleReanalyzeSelectedAdoptionAI = async () => {
    const selected = selectedAdopsiApplicant;
    if (!selected?.rawId) {
      throw new Error('ID pengajuan database tidak tersedia. Pilih pengajuan dari daftar backend.');
    }
    const loadingKey = `adopsi-ai-${selected.rawId}`;
    if (actionLoading[loadingKey]) return;

    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      const result = await adopsiService.reanalyzeAdoptionAI(selected.rawId);
      const persistedStatus = String(result?.status || selected.rawStatus || '').toLowerCase();
      const fields = {
        rawStatus: persistedStatus,
        status: adoptionStatusLabel(persistedStatus),
        hasil_ekstraksi_ai: result?.hasil_ekstraksi_ai ?? selected.hasil_ekstraksi_ai ?? null,
      };
      updateAdoptionApplicationInState(selected.rawId, fields);
      showToast('Analisis ulang selesai dan respons backend diterima.');
      return result;
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Analisis ulang AI gagal dijalankan.');
      throw err;
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handlers for Super Admin
  const handleApprovePanti = (id) => {
    setPantiRegistrations(prev => prev.map(p => p.id === id ? { ...p, status: 'Disetujui / Aktif', akreditasi: 'AKREDITASI A' } : p));
    showToast(`Panti ${id} telah DISETUJUI & Akun Admin Panti Diaktifkan!`);
  };

  const handleApproveAdopsi = async (id) => {
    if (actionLoading[id]) return;
    const app = adopsiApplications.find((item) => item.id === id);
    if (!app?.rawId) {
      showToast('ID pengajuan dari database tidak tersedia.');
      return;
    }

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const saved = await adopsiService.updateAdoptionStatus(app.rawId, 'diverifikasi');
      const rawStatus = String(saved?.status || 'diverifikasi').toLowerCase();
      const status = adoptionStatusLabel(rawStatus);
      updateAdoptionApplicationInState(app.rawId, { rawStatus, status });
      showToast(`Permohonan ${id} berhasil diperbarui di backend.`);
      triggerConfetti();
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menyetujui pengajuan di backend.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectAdopsi = async (id) => {
    if (actionLoading[id]) return;
    const app = adopsiApplications.find((item) => item.id === id);
    if (!app?.rawId) {
      showToast('ID pengajuan dari database tidak tersedia.');
      return;
    }

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const saved = await adopsiService.updateAdoptionStatus(app.rawId, 'ditolak');
      const rawStatus = String(saved?.status || 'ditolak').toLowerCase();
      const status = adoptionStatusLabel(rawStatus);
      updateAdoptionApplicationInState(app.rawId, { rawStatus, status });
      showToast(`Permohonan ${id} berhasil ditolak dan tersimpan di backend.`);
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal menolak pengajuan di backend.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleVerifyDonationAdmin = async (donationId, newStatus) => {
    if (actionLoading[donationId]) return;
    setActionLoading(prev => ({ ...prev, [donationId]: true }));
    try {
      await donasiService.updateDonasiStatus(donationId, newStatus);
      setAdminDonations(prev => prev.map(d => d.rawId === donationId ? { ...d, status: newStatus } : d));
      showToast(`Donasi #${donationId} berhasil di-${newStatus === 'terverifikasi' ? 'setujui' : 'tolak'}!`);
      if (newStatus === 'terverifikasi') triggerConfetti();
    } catch (err) {
      showToast(err.friendlyMessage || `Gagal memperbarui status donasi #${donationId}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [donationId]: false }));
    }
  };

  const handleVerifyDonationPanti = async (donationId, newStatus) => {
    if (actionLoading[donationId]) return;
    setActionLoading(prev => ({ ...prev, [donationId]: true }));
    try {
      await pantiService.updateDonationStatus(donationId, newStatus);
      setPantiCashIncome(prev => prev.map(d => d.rawId === donationId ? { ...d, status: newStatus } : d));
      showToast(`Donasi #${donationId} berhasil ${newStatus === 'terverifikasi' ? 'diterima' : 'ditolak'} oleh panti!`);
      if (newStatus === 'terverifikasi') triggerConfetti();
    } catch (err) {
      showToast(err.friendlyMessage || `Gagal memperbarui status donasi`);
    } finally {
      setActionLoading(prev => ({ ...prev, [donationId]: false }));
    }
  };

  const handlePantiRecommendAdopsi = async (adp, action) => {
    if (actionLoading[adp.id]) return;
    setActionLoading(prev => ({ ...prev, [adp.id]: true }));
    try {
      if (adp.rawId) {
        await pantiService.recommendAdoption(adp.rawId, action);
      }
      setPantiAdoptions(prev => prev.map(a => a.id === adp.id ? { ...a, status: action === 'tolak' ? 'Ditolak' : 'Disetujui / Rekomendasi Terbit' } : a));
      showToast(`Permohonan ${adp.id} berhasil ${action === 'tolak' ? 'ditolak' : 'diverifikasi panti & diteruskan ke Dinsos PIPA'}!`);
      if (action !== 'tolak') triggerConfetti();
    } catch (err) {
      showToast(err.friendlyMessage || 'Gagal memproses permohonan adopsi panti');
    } finally {
      setActionLoading(prev => ({ ...prev, [adp.id]: false }));
    }
  };

  // Ubah status melalui API backend agar perubahan tercatat di database/audit trail.
  const handleUpdateReportStatus = async (report, newStatus) => {
    const id = report?.id;
    if (!report?.rawId) {
      showToast('Laporan ini tidak memiliki ID database yang dapat diperbarui.');
      return;
    }
    if (!['baru', 'diproses', 'selesai'].includes(newStatus)) {
      showToast('Status laporan tidak valid.');
      return;
    }
    if (actionLoading[id]) return;

    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await pengaduanService.updatePengaduanStatus(report.rawId, newStatus);

      const displayStatus = {
        baru: 'Baru Masuk / Menunggu Tindakan',
        diproses: 'Eskalasi TRC & Kepolisian',
        selesai: 'Selesai / Ditangani',
      }[newStatus];

      setComplaintReports(prev => prev.map(rep =>
        rep.id === id ? { ...rep, status: displayStatus } : rep
      ));
      showToast(`Status laporan ${id} berhasil diubah menjadi: ${displayStatus}.`);
      if (newStatus === 'selesai') triggerConfetti();
    } catch (err) {
      showToast(err?.friendlyMessage || err?.message || 'Gagal mengubah status laporan di backend.');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };


  // Handlers for Admin Panti
  const handleAddChild = (e) => {
    e.preventDefault();
    if (!newChildName) return;
    const newChild = {
      id: `ANK-00${pantiChildren.length + 1}`,
      name: newChildName,
      age: `${newChildAge} Tahun`,
      gender: 'Laki-Laki',
      status: newChildStatus,
      education: 'SD',
      joinDate: 'Hari Ini',
      health: 'Sehat'
    };
    setPantiChildren([newChild, ...pantiChildren]);
    setShowAddChildModal(false);
    setNewChildName('');
    setNewChildAge('');
    showToast(`Anak asuh baru (${newChild.name}) berhasil ditambahkan ke database panti!`);
  };

  const handleAddGoodsNeed = async (e) => {
    e.preventDefault();
    if (!newNeedItem.trim()) return;
    const urgency = newNeedUrgency || 'Mendesak / Barang Habis';
    const targetQtyNumber = parseInt(newNeedQty.replace(/\D/g, '') || '10', 10);

    try {
      const res = await pantiService.createWishlist({
        nama_barang: newNeedItem.trim(),
        jumlah_kebutuhan: targetQtyNumber
      });
      setPantiNeededGoods(prev => [
        {
          id: res.id,
          item: res.nama_barang,
          qty: `0/${res.jumlah_kebutuhan} Unit`,
          status: urgency
        },
        ...prev
      ]);
      showToast('Kebutuhan barang panti berhasil ditambahkan ke database & ditayangkan di direktori publik!');
    } catch (err) {
      console.warn('Fallback local wishlist add:', err);
      setPantiNeededGoods([
        ...pantiNeededGoods,
        {
          id: Date.now(),
          item: newNeedItem.trim(),
          qty: newNeedQty.trim() || '10 Unit',
          status: urgency
        }
      ]);
      showToast('Kebutuhan barang panti tersimpan.');
    }
    setNewNeedItem('');
    setNewNeedQty('');
    setNewNeedUrgency('');
  };

  const handleDeleteGoodsNeed = async (wishlistId) => {
    try {
      if (typeof wishlistId === 'number' && wishlistId < 1000000000) {
        await pantiService.deleteWishlist(wishlistId);
      }
    } catch (err) {
      console.warn('Delete wishlist error:', err);
    }
    setPantiNeededGoods(prev => prev.filter(item => item.id !== wishlistId));
    showToast('Barang kebutuhan berhasil dihapus dari daftar wishlist.');
  };

  const handleVerifyPantiDonation = async (cashItem, newStatus) => {
    try {
      if (cashItem.rawId) {
        await pantiService.updateDonationStatus(cashItem.rawId, newStatus);
      }
    } catch (err) {
      console.warn('Update donation status error:', err);
    }
    setPantiCashIncome(prev => prev.map(c => c.id === cashItem.id ? { ...c, status: newStatus } : c));
    showToast(`Status donasi ${cashItem.id} berhasil diubah menjadi ${newStatus}!`);
  };

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
    } catch (e) { }
  };

  const handleExportReport = (format) => {
    showToast(`Laporan Eksekutif Dinsos Berhasil Di-export dalam format ${format}! File siap diunduh.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: '#f8fafc', color: '#0f172a' }}>

      {/* Toast Alert Notice */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          background: '#0b1f5c',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          borderLeft: '4px solid #34d399'
        }}>
          <CheckCircle2 size={18} color="#34d399" />
          <span>{toastMsg}</span>
        </div>
      )}



      {/* WORKSPACE TOP HEADER BAR */}
      <header style={{
        background: '#0b1f5c',
        color: '#ffffff',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutDashboard size={18} color="#60a5fa" />
              {dashboardRoleMode === 'superadmin' ? 'HaloKids • Dinsos Control Center' : 'HaloKids • Workspace Admin LKSA'}
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#bfdbfe' }}>
              {dashboardRoleMode === 'superadmin'
                ? 'Pengawasan, persetujuan, dan audit layanan sosial kabupaten'
                : 'Pengelolaan operasional dan layanan LKSA'}
            </span>
          </div>
        </div>

        {/* Role ditampilkan sebagai label, bukan tombol pengganti role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: dashboardRoleMode === 'superadmin' ? 'rgba(225, 29, 72, 0.18)' : 'rgba(217, 119, 6, 0.18)',
            border: `1px solid ${dashboardRoleMode === 'superadmin' ? 'rgba(251, 113, 133, 0.45)' : 'rgba(252, 211, 77, 0.45)'}`,
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '9px',
            fontSize: '0.75rem',
            fontWeight: 800,
            whiteSpace: 'nowrap'
          }}>
            {dashboardRoleMode === 'superadmin' ? (
              <><ShieldCheck size={14} color="#fda4af" /> Super Admin Dinsos</>
            ) : dashboardRoleMode === 'pantiadmin' ? (
              <><Building2 size={14} color="#fcd34d" /> Admin LKSA</>
            ) : (
              <><User size={14} color="#93c5fd" /> User Publik</>
            )}
          </div>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.775rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                {currentUser?.name || 'Admin Dinsos'}
              </div>
              <div style={{ fontSize: '0.675rem', color: '#93c5fd' }}>
                {dashboardRoleMode === 'superadmin'
                  ? 'Super Admin Dinsos'
                  : dashboardRoleMode === 'pantiadmin'
                    ? 'Admin LKSA'
                    : 'User Publik'}
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar / Logout"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>

      </header>

      {/* DASHBOARD LAYOUT (SIDEBAR + MAIN CONTENT) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* SIDEBAR NAVIGATION */}
        <aside style={{
          width: '270px',
          background: '#07153b',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          height: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem 1rem', overflowY: 'auto', flex: 1 }}>
            <div style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {dashboardRoleMode === 'user' ? 'Workspace Fitur Publik' : dashboardRoleMode === 'superadmin' ? 'Dinsos Control Center' : 'Panel Admin LKSA'}
              </h3>
              <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                {dashboardRoleMode === 'user' ? 'Layanan Publik Terpadu' : dashboardRoleMode === 'superadmin' ? 'Supervising 28 Panti & TRC' : 'LKSA Kasih Bunda Mandiri'}
              </span>
            </div>

            {/* USER PUBLIK MENU */}
            {dashboardRoleMode === 'user' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                  { id: 'adopsi', label: '1. Adopsi Resmi (Alur COTA)', icon: Heart, count: null },
                  { id: 'pengaduan', label: '2. Pengaduan & Pelaporan', icon: ShieldAlert, count: null },
                  { id: 'donasi', label: '3. Pusat Donasi Transparan', icon: Wallet, count: null },
                  { id: 'panti', label: '4. Direktori & Wishlist Panti', icon: Building2, count: null }
                ].map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setUserTab(menu.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: userTab === menu.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: userTab === menu.id ? '#ffffff' : '#94a3b8',
                      fontWeight: userTab === menu.id ? 700 : 500,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <menu.icon size={17} color={userTab === menu.id ? '#60a5fa' : '#94a3b8'} />
                      <span>{menu.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : dashboardRoleMode === 'superadmin' ? (
              /* SUPER ADMIN MENU */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                  { id: 'approval_panti', label: '1. Approval & Status LKSA', icon: Building2, count: pantiRegistrations.filter(p => p.status.includes('Menunggu')).length },
                  { id: 'supervisi_adopsi', label: '2. Supervisi Adopsi (PIPA)', icon: Users, count: adopsiApplications.length },
                  { id: 'monitoring_hilang', label: '3. Pengaduan & Kedaruratan', icon: ShieldAlert, count: complaintReports.filter(r => !r.status.includes('Selesai')).length },
                  { id: 'audit_donasi', label: '4. Audit & Map Donasi', icon: Wallet, count: null },
                  { id: 'analitik_eksekutif', label: '5. Dashboard Analitis', icon: TrendingUp, count: null }
                ].map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setSuperAdminTab(menu.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: superAdminTab === menu.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: superAdminTab === menu.id ? '#ffffff' : '#94a3b8',
                      fontWeight: superAdminTab === menu.id ? 700 : 500,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <menu.icon size={17} color={superAdminTab === menu.id ? '#60a5fa' : '#94a3b8'} />
                      <span>{menu.label}</span>
                    </div>
                    {menu.count > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '50px' }}>
                        {menu.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* ADMIN PANTI MENU */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {[
                  { id: 'daftar_anak', label: '1. Daftar Anak Asuh Panti', icon: Users, count: pantiChildren.length },
                  { id: 'input_donasi', label: '2. Input Donasi & Uang Masuk', icon: Package, count: null },
                  { id: 'laporan_hilang_panti', label: '3. Pelaporan Anak Hilang', icon: ShieldAlert, count: lostChildReports.length },
                  { id: 'formulir_adopsi_panti', label: '4. Permohonan Adopsi Anak', icon: Heart, count: adopsiApplications.length },
                  { id: 'volunteer_panti', label: '5. Verifikasi Volunteer', icon: HeartHandshake, count: currentVolunteers.filter(v => v.status === 'Menunggu Persetujuan').length }
                ].map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setPantiAdminTab(menu.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: pantiAdminTab === menu.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: pantiAdminTab === menu.id ? '#ffffff' : '#94a3b8',
                      fontWeight: pantiAdminTab === menu.id ? 700 : 500,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <menu.icon size={17} color={pantiAdminTab === menu.id ? '#60a5fa' : '#94a3b8'} />
                      <span>{menu.label}</span>
                    </div>
                    {menu.count > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '50px' }}>
                        {menu.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: '#07153b' }}>
            <button
              onClick={onLogout || onSwitchToLanding}
              style={{
                width: '100%',
                padding: '0.65rem',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <LogOut size={16} /> Keluar Portal
            </button>
          </div>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', minHeight: 0, height: '100%' }}>

          {/* ==================================================== */}
          {/* VIEW TYPE USER: PUBLIK USER WORKSPACE                */}
          {/* ==================================================== */}
          {dashboardRoleMode === 'user' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 1. TOP USER GREETING BANNER & PROFIL DINAMIS */}
              <div style={{
                background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    color: '#67e8f9',
                    border: '2px solid rgba(103, 232, 249, 0.4)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.15)', color: '#bfdbfe', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '50px' }}>
                        DASHBOARD PERSONAL WARGA
                      </span>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '50px' }}>
                        ✔ Akun Terverifikasi
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0.35rem 0 0.2rem 0', color: '#ffffff' }}>
                      Selamat Datang, {currentUser?.name || 'Warga'}!
                    </h2>
                    <p style={{ fontSize: '0.825rem', color: '#bfdbfe', margin: 0 }}>
                      Email: <strong>{currentUser?.email || 'warga@gmail.com'}</strong> • No. HP/WA: <strong>{currentUser?.phone || '-'}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (onSwitchToLanding) onSwitchToLanding();
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '50px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Ke Halaman Utama
                  </button>
                  <button
                    onClick={() => setUserTab('pengaduan')}
                    style={{
                      background: '#ffffff',
                      color: '#0b1f5c',
                      border: 'none',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '50px',
                      fontSize: '0.825rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <ShieldAlert size={15} color="#dc2626" /> Lapor Kasus Baru
                  </button>
                </div>
              </div>

              {/* 2. FORM PENCARIAN & LACAK STATUS TIKET CEPAT KE FASTAPI BACKEND */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={18} color="#1d4ed8" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Lacak Status Tiket Pengaduan Langsung (SIM-Kemensos API)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Koneksi Real-time ke Endpoint: <code>/api/public/pengaduan/{'{kode_tiket}'}</code>
                  </span>
                </div>

                <form onSubmit={handleTrackUserTicket} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <input
                      type="text"
                      placeholder="Masukkan Kode Tiket Laporan Anda (cth: HK-20261011-XXXXXXXX)"
                      value={userTrackTicketInput}
                      onChange={(e) => setUserTrackTicketInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTrackingTicket}
                    style={{
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #0b1f5c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.65rem 1.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isTrackingTicket ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>Mencari...</span>
                      </>
                    ) : (
                      <>
                        <Search size={15} /> Lacak Tiket
                      </>
                    )}
                  </button>
                </form>

                {/* Hasil Pencarian Tiket */}
                {userTrackResult && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: userTrackResult.error ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${userTrackResult.error ? '#fecaca' : '#bbf7d0'}`,
                    fontSize: '0.85rem'
                  }}>
                    {userTrackResult.error ? (
                      <div style={{ color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} />
                        <span>{userTrackResult.message}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
                            Tiket Ditemukan: {userTrackResult.kode_tiket}
                          </div>
                          <div style={{ color: '#374151', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            Kategori: <strong>{userTrackResult.jenis_laporan || 'Pengaduan Anak'}</strong> • Tanggal: {userTrackResult.created_at ? new Date(userTrackResult.created_at).toLocaleString('id-ID') : 'Tercatat'}
                          </div>
                        </div>
                        <span style={{
                          background: userTrackResult.status === 'selesai' ? '#15803d' : userTrackResult.status === 'diproses' ? '#0284c7' : '#d97706',
                          color: '#ffffff',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '50px',
                          fontWeight: 800,
                          fontSize: '0.775rem',
                          textTransform: 'uppercase'
                        }}>
                          Status: {userTrackResult.status}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. EMPAT KARTU STATUS LAYANAN UTAMA (4 METRIC CARDS) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {/* KARTU 1: STATUS ADOPSI COTA */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                      <Heart size={20} fill="#1d4ed8" />
                    </div>
                    <span style={{
                      background: userAdoptions.length > 0 ? '#dcfce7' : '#f1f5f9',
                      color: userAdoptions.length > 0 ? '#15803d' : '#64748b',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '50px'
                    }}>
                      {userAdoptions.length > 0 ? 'Berkas Aktif' : 'Belum Ada'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Permohonan Adopsi COTA</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0b1f5c', margin: '0.25rem 0' }}>
                    {userAdoptions.length > 0 ? `${userAdoptions.length} Berkas` : '0 Pengajuan'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    Status Terkini: <strong>{userAdoptions[0]?.status ? (userAdoptions[0].status === 'diverifikasi' ? 'Disetujui Dinsos' : userAdoptions[0].status) : 'Siap Diajukan'}</strong>
                  </div>
                </div>

                {/* KARTU 2: TIKET PENGADUAN KASUS */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                      <ShieldAlert size={20} />
                    </div>
                    <span style={{
                      background: userPengaduan.length > 0 ? '#fee2e2' : '#f1f5f9',
                      color: userPengaduan.length > 0 ? '#b91c1c' : '#64748b',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '50px'
                    }}>
                      {userPengaduan.length > 0 ? `${userPengaduan.length} Tiket` : '0 Tiket'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Tiket Pengaduan Anda</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0b1f5c', margin: '0.25rem 0' }}>
                    {userPengaduan.length > 0 ? `${userPengaduan.length} Laporan` : '0 Laporan'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    Laporan Terbaru: <strong>{userPengaduan[0]?.kode_tiket ? `${userPengaduan[0].kode_tiket} (${userPengaduan[0].status})` : 'Belum Ada'}</strong>
                  </div>
                </div>

                {/* KARTU 3: PROGRAM RELAWAN (VOLUNTEER) */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                      <HeartHandshake size={20} />
                    </div>
                    <span style={{
                      background: userRelawan.length > 0 ? '#f3e8ff' : '#f1f5f9',
                      color: userRelawan.length > 0 ? '#7e22ce' : '#64748b',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '50px'
                    }}>
                      {userRelawan.length > 0 ? 'Terdaftar' : 'Belum Ada'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Program Relawan / Tutor</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0b1f5c', margin: '0.25rem 0' }}>
                    {userRelawan.length > 0 ? `${userRelawan.length} Kegiatan` : '0 Program'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    Status Kegiatan: <strong>{userRelawan[0]?.bidang ? `${userRelawan[0].bidang} (${userRelawan[0].status})` : 'Siap Bergabung'}</strong>
                  </div>
                </div>

                {/* KARTU 4: TOTAL KONTRIBUSI DONASI */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                      <Wallet size={20} />
                    </div>
                    <span style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.725rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '50px'
                    }}>
                      {userDonasi.length} Donasi
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Total Kontribusi Donasi</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0b1f5c', margin: '0.25rem 0' }}>
                    Rp {userDonasi.filter(d => d.jenis_donasi === 'uang').reduce((acc, curr) => acc + Number(curr.jumlah_nominal || 0), 0).toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    Terakhir: <strong>{userDonasi[0] ? `${userDonasi[0].jenis_donasi === 'uang' ? `Rp ${Number(userDonasi[0].jumlah_nominal).toLocaleString('id-ID')}` : 'Paket Barang'} (${userDonasi[0].status_verifikasi})` : 'Belum Ada Transaksi'}</strong>
                  </div>
                </div>
              </div>

              {/* 4. RIWAYAT AKTIVITAS & DETAIL LAYANAN WARGA */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      Riwayat Aktivitas &amp; Pengajuan Berkas Saya
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                      Data tersinkronisasi otomatis dari database REST API FastAPI HaloKids
                    </p>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
                    {[
                      { key: 'adopsi', label: 'Adopsi COTA' },
                      { key: 'pengaduan', label: 'Pengaduan' },
                      { key: 'relawan', label: 'Relawan' },
                      { key: 'donasi', label: 'Donasi' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setUserTab(tab.key)}
                        style={{
                          background: userTab === tab.key ? '#ffffff' : 'transparent',
                          color: userTab === tab.key ? '#0b1f5c' : '#64748b',
                          fontWeight: userTab === tab.key ? 800 : 600,
                          fontSize: '0.775rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: userTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isUserDataLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #1d4ed8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Memuat data akun Anda dari database API...</p>
                  </div>
                ) : (
                  <div>
                    {/* TAB ADOPSI */}
                    {userTab === 'adopsi' && (
                      <div>
                        {userAdoptions.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <Heart size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem 0' }}>
                              Belum ada berkas pengajuan adopsi COTA yang diajukan.
                            </p>
                            <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                              Anda dapat mengajukan permohonan izin adopsi resmi lengkap dengan verifikasi berkas AI OCR & Permensos.
                            </p>
                            <button
                              onClick={() => {
                                if (onSwitchToLanding) onSwitchToLanding();
                              }}
                              className="btn btn-primary"
                              style={{ padding: '0.5rem 1.25rem', fontSize: '0.825rem' }}
                            >
                              Ajukan Adopsi COTA Sekarang
                            </button>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '0.75rem' }}>ID Permohonan</th>
                                  <th style={{ padding: '0.75rem' }}>Nama Pemohon</th>
                                  <th style={{ padding: '0.75rem' }}>Tanggal Lahir</th>
                                  <th style={{ padding: '0.75rem' }}>Tanggal Pernikahan</th>
                                  <th style={{ padding: '0.75rem' }}>Status Sidang PIPA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userAdoptions.map((ad, idx) => (
                                  <tr key={ad.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1d4ed8' }}>PIPA-REG-{ad.id}</td>
                                    <td style={{ padding: '0.75rem' }}>{ad.nama_pemohon}</td>
                                    <td style={{ padding: '0.75rem' }}>{ad.tanggal_lahir_pemohon || '-'}</td>
                                    <td style={{ padding: '0.75rem' }}>{ad.tanggal_pernikahan || '-'}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span style={{
                                        background: ad.status === 'diverifikasi' ? '#dcfce7' : ad.status === 'ditolak' ? '#fee2e2' : '#fef3c7',
                                        color: ad.status === 'diverifikasi' ? '#15803d' : ad.status === 'ditolak' ? '#b91c1c' : '#b45309',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        fontWeight: 800,
                                        fontSize: '0.725rem'
                                      }}>
                                        {ad.status === 'diverifikasi' ? 'Disetujui Dinsos' : ad.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB PENGADUAN */}
                    {userTab === 'pengaduan' && (
                      <div>
                        {userPengaduan.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <ShieldAlert size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem 0' }}>
                              Belum ada riwayat pengaduan yang dibuat melalui akun Anda.
                            </p>
                            <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                              Jika Anda melihat tindakan kekerasan atau penelantaran anak, laporkan segera demi keselamatan anak.
                            </p>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '0.75rem' }}>Kode Tiket</th>
                                  <th style={{ padding: '0.75rem' }}>Jenis Laporan</th>
                                  <th style={{ padding: '0.75rem' }}>Tanggal Masuk</th>
                                  <th style={{ padding: '0.75rem' }}>Status TRC</th>
                                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userPengaduan.map((rep) => (
                                  <tr key={rep.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#1d4ed8' }}>{rep.kode_tiket}</td>
                                    <td style={{ padding: '0.75rem' }}>{rep.jenis_laporan}</td>
                                    <td style={{ padding: '0.75rem' }}>{rep.created_at ? new Date(rep.created_at).toLocaleString('id-ID') : '-'}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span style={{
                                        background: rep.status === 'selesai' ? '#dcfce7' : rep.status === 'diproses' ? '#e0f2fe' : '#fef3c7',
                                        color: rep.status === 'selesai' ? '#15803d' : rep.status === 'diproses' ? '#0369a1' : '#b45309',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        fontWeight: 800,
                                        fontSize: '0.725rem'
                                      }}>
                                        {rep.status}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                      <button
                                        onClick={() => {
                                          setUserTrackTicketInput(rep.kode_tiket);
                                          handleTrackUserTicket({ preventDefault: () => { } });
                                        }}
                                        style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Lacak Status
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB RELAWAN */}
                    {userTab === 'relawan' && (
                      <div>
                        {userRelawan.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <HeartHandshake size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem 0' }}>
                              Belum ada pendaftaran program relawan yang tercatat.
                            </p>
                            <p style={{ fontSize: '0.775rem', color: '#64748b' }}>
                              Daftarkan diri Anda untuk menjadi pengajar atau pendamping anak asuh di LKSA terdekat.
                            </p>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '0.75rem' }}>ID Pendaftaran</th>
                                  <th style={{ padding: '0.75rem' }}>Bidang Relawan</th>
                                  <th style={{ padding: '0.75rem' }}>Panti Tujuan</th>
                                  <th style={{ padding: '0.75rem' }}>Tanggal &amp; Sesi</th>
                                  <th style={{ padding: '0.75rem' }}>Status Dinsos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userRelawan.map((vol) => (
                                  <tr key={vol.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#7e22ce' }}>VOL-{vol.id}</td>
                                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{vol.bidang}</td>
                                    <td style={{ padding: '0.75rem' }}>{vol.panti_tujuan || 'LKSA Binaan'}</td>
                                    <td style={{ padding: '0.75rem' }}>{vol.tanggal} ({vol.sesi_waktu})</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span style={{
                                        background: vol.status === 'disetujui' ? '#dcfce7' : vol.status === 'ditolak' ? '#fee2e2' : '#fef3c7',
                                        color: vol.status === 'disetujui' ? '#15803d' : vol.status === 'ditolak' ? '#b91c1c' : '#b45309',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        fontWeight: 800,
                                        fontSize: '0.725rem'
                                      }}>
                                        {vol.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB DONASI */}
                    {userTab === 'donasi' && (
                      <div>
                        {userDonasi.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <Wallet size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: '0 0 0.35rem 0' }}>
                              Belum ada transaksi donasi yang tercatat di akun Anda.
                            </p>
                            <p style={{ fontSize: '0.775rem', color: '#64748b' }}>
                              Dukungan donasi uang atau paket sembako sangat berarti bagi masa depan adik-adik asuh panti.
                            </p>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '0.75rem' }}>ID Donasi</th>
                                  <th style={{ padding: '0.75rem' }}>Jenis Donasi</th>
                                  <th style={{ padding: '0.75rem' }}>Nominal / Barang</th>
                                  <th style={{ padding: '0.75rem' }}>Tanggal</th>
                                  <th style={{ padding: '0.75rem' }}>Status Verifikasi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userDonasi.map((dn) => (
                                  <tr key={dn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#15803d' }}>TRX-{dn.id}</td>
                                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{dn.jenis_donasi}</td>
                                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                                      {dn.jenis_donasi === 'uang' ? `Rp ${Number(dn.jumlah_nominal).toLocaleString('id-ID')}` : `${dn.nama_barang || 'Paket Logistik'} (${dn.jumlah_barang || 1} ${dn.satuan_barang || 'Paket'})`}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{dn.created_at ? new Date(dn.created_at).toLocaleDateString('id-ID') : '-'}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <span style={{
                                        background: dn.status_verifikasi === 'terverifikasi' ? '#dcfce7' : dn.status_verifikasi === 'ditolak' ? '#fee2e2' : '#fef3c7',
                                        color: dn.status_verifikasi === 'terverifikasi' ? '#15803d' : dn.status_verifikasi === 'ditolak' ? '#b91c1c' : '#b45309',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '50px',
                                        fontWeight: 800,
                                        fontSize: '0.725rem'
                                      }}>
                                        {dn.status_verifikasi}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW TYPE A: SUPER ADMIN DINSOS (REQUIREMENT 3)     */}
          {/* ==================================================== */}
          {dashboardRoleMode === 'superadmin' && (
            <div>
              {/* MODULE 1: MANAJEMEN & APPROVAL AKUN ADMIN PANTI */}
              {superAdminTab === 'approval_panti' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                        1. Verifikasi Akun &amp; Legalitas LKSA Panti Asuhan
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Persetujuan pendaftaran panti asuhan baru dan monitoring izin operasional tingkat kabupaten.
                      </p>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700 }}>
                      ✔ 28 Panti Terdaftar Resmi
                    </span>
                  </div>

                  {/* Table of Orphanage Approvals */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '1rem' }}>ID &amp; Nama Panti Asuhan</th>
                          <th style={{ padding: '1rem' }}>Pengurus &amp; Kontak</th>
                          <th style={{ padding: '1rem' }}>Kecamatan</th>
                          <th style={{ padding: '1rem' }}>Akreditasi / Status</th>
                          <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi Approval</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pantiRegistrations.map((panti) => (
                          <tr key={panti.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem' }}>
                              <strong style={{ color: '#0b1f5c', display: 'block' }}>{panti.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{panti.id} • {panti.email}</span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span>{panti.pengurus}</span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{panti.phone}</span>
                            </td>
                            <td style={{ padding: '1rem' }}>{panti.address}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                background: panti.status.includes('Disetujui') ? '#dcfce7' : '#fef3c7',
                                color: panti.status.includes('Disetujui') ? '#15803d' : '#92400e',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '50px',
                                fontSize: '0.725rem',
                                fontWeight: 800
                              }}>
                                {panti.status}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              {panti.status.includes('Menunggu') ? (
                                <button
                                  onClick={() => handleApprovePanti(panti.id)}
                                  style={{ background: '#15803d', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  ✔ Approve / Setujui Akun
                                </button>
                              ) : (
                                <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.775rem' }}>✔ Terverifikasi Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 2: SUPERVISI DATA ANAK & PENGANGKATAN ANAK (ADOPSI - PIPA) */}
              {superAdminTab === 'supervisi_adopsi' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                        2. Validasi Permohonan Adopsi Anak (Sidang PIPA Dinsos)
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Peninjauan legalitas berkas calon orang tua angkat dan penerbitan izin pengangkatan anak resmi.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const nextApplicant = adopsiApplications.find((app) =>
                          !['diverifikasi', 'ditolak'].includes(String(app.rawStatus || '').toLowerCase())
                        ) || adopsiApplications[0];
                        if (!nextApplicant?.rawId) {
                          showToast('Belum ada pengajuan COTA dari backend untuk diperiksa.');
                          return;
                        }
                        setSelectedAdopsiApplicant(nextApplicant);
                        setShowAiAdminReviewModal(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '50px',
                        fontSize: '0.825rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)'
                      }}
                    >
                      <Bot size={16} /> Buka Panel Inspeksi AI OCR (Split-Screen)
                    </button>
                  </div>

                  {adopsiApplications.length === 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#475569', fontSize: '0.85rem' }}>
                      Belum ada pengajuan COTA yang berhasil dimuat dari backend. Periksa koneksi API atau coba muat ulang halaman.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {adopsiApplications.map((app) => (
                      <div key={app.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.725rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '50px' }}>
                            {app.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: app.status.includes('Disetujui') ? '#15803d' : '#b45309', fontWeight: 700 }}>
                            {app.status}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.35rem 0' }}>
                          Pemohon: {app.applicant}
                        </h3>
                        <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0 0 0.85rem 0' }}>
                          Anak Asuh Tujuan: <strong>{app.targetChild}</strong> ({app.originPanti})
                        </p>

                        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.775rem', color: '#334155', marginBottom: '1rem' }}>
                          <strong>Verifikasi Dokumen PIPA:</strong>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                            {app.docs.map((d, i) => (
                              <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                ✔ {d}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Aksi Super Admin: Periksa Berkas AI & Sahkan SK */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button
                            onClick={() => {
                              setSelectedAdopsiApplicant(app);
                              setShowAiAdminReviewModal(true);
                            }}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              padding: '0.65rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Bot size={16} /> Periksa Berkas dengan AI
                          </button>

                          {!app.status.includes('Disetujui') && !app.status.includes('Ditolak') && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <button
                                onClick={() => handleApproveAdopsi(app.id)}
                                disabled={actionLoading[app.id]}
                                className="btn btn-primary"
                                style={{ flex: 1, borderRadius: '8px', fontSize: '0.8rem', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                              >
                                {actionLoading[app.id] ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={16} />}
                                <span>Sahkan SK (PIPA)</span>
                              </button>
                              <button
                                onClick={() => handleRejectAdopsi(app.id)}
                                disabled={actionLoading[app.id]}
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.8rem', padding: '0.6rem 0.85rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODULE 3: LAPORAN PENGADUAN NYATA DARI BACKEND */}
              {superAdminTab === 'monitoring_hilang' && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                      3. Pusat Kontrol Pengaduan &amp; Kedaruratan
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      Memantau aduan masyarakat dan melakukan eskalasi darurat ke Tim Reaksi Cepat (TRC) Dinsos &amp; Kepolisian.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reportSyncStatus === 'error' ? (
                      <div role="alert" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem' }}>
                        <strong>Data laporan gagal dimuat.</strong> {reportSyncError}
                      </div>
                    ) : reportSyncStatus === 'loading' ? (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', color: '#475569' }}>
                        Memuat laporan dari backend...
                      </div>
                    ) : complaintReports.length === 0 ? (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', color: '#475569' }}>
                        Belum ada laporan pengaduan tersimpan di database.
                      </div>
                    ) : complaintReports.map((report) => (
                      <div key={report.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '1.1rem', color: '#0b1f5c' }}>{report.childName}</strong>
                            <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '50px' }}>
                              TIKET: {report.id}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0 0 0.35rem 0' }}>
                            Pelapor: <strong>{report.reporter}</strong> • Wilayah: <strong>{report.location}</strong> ({report.date})
                          </p>
                          <span style={{ fontSize: '0.75rem', color: report.status.includes('Selesai') ? '#15803d' : '#0284c7', fontWeight: 700 }}>
                            Status Penanganan: {report.status} ({report.officer})
                          </span>
                          {report.isi_laporan && (
                            <details style={{ marginTop: '0.75rem', maxWidth: '720px' }}>
                              <summary style={{ cursor: 'pointer', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 700 }}>
                                Lihat isi laporan (akses petugas berwenang)
                              </summary>
                              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontSize: '0.8rem', fontFamily: 'inherit' }}>
                                {report.isi_laporan}
                              </pre>
                            </details>
                          )}
                          <div style={{ marginTop: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={() => handleLoadReportAttachments(report)}
                              disabled={Boolean(reportAttachmentsLoading[report.rawId])}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.45rem 0.7rem', fontSize: '0.775rem', fontWeight: 700, cursor: reportAttachmentsLoading[report.rawId] ? 'wait' : 'pointer' }}
                            >
                              {reportAttachmentsLoading[report.rawId] ? 'Memuat lampiran...' : 'Muat / Perbarui Tautan Lampiran Privat'}
                            </button>
                            {reportAttachmentsErrors[report.rawId] && (
                              <p role="alert" style={{ color: '#b91c1c', fontSize: '0.75rem', margin: '0.45rem 0 0' }}>
                                {reportAttachmentsErrors[report.rawId]}
                              </p>
                            )}
                            {Array.isArray(reportAttachments[report.rawId]) && reportAttachments[report.rawId].length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                                {reportAttachments[report.rawId].map((attachment, index) => (
                                  <a
                                    key={`${attachment.nama_file}-${index}`}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 700, overflowWrap: 'anywhere' }}
                                  >
                                    <FileText size={14} style={{ display: 'inline', marginRight: '0.35rem' }} />
                                    {attachment.nama_file || `Lampiran ${index + 1}`} — buka tautan aman (berlaku 5 menit)
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.55rem', minWidth: '240px' }}>
                          <label
                            htmlFor={`status-pengaduan-${report.rawId || report.id}`}
                            style={{ fontSize: '0.775rem', color: '#334155', fontWeight: 800 }}
                          >
                            Ubah status penanganan
                          </label>
                          <select
                            id={`status-pengaduan-${report.rawId || report.id}`}
                            value={report.status.includes('Selesai') ? 'selesai' : report.status.includes('Eskalasi') ? 'diproses' : 'baru'}
                            onChange={(event) => handleUpdateReportStatus(report, event.target.value)}
                            disabled={Boolean(actionLoading[report.id]) || !report.rawId}
                            aria-label={`Ubah status pengaduan ${report.id}`}
                            style={{
                              width: '100%',
                              minHeight: '40px',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '9px',
                              border: '1px solid #cbd5e1',
                              background: actionLoading[report.id] ? '#f1f5f9' : '#ffffff',
                              color: '#0f172a',
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              cursor: actionLoading[report.id] ? 'wait' : 'pointer',
                            }}
                          >
                            <option value="baru">Baru / Menunggu Tindakan</option>
                            <option value="diproses">Diproses / Eskalasi TRC</option>
                            <option value="selesai">Selesai / Ditangani</option>
                          </select>
                          {actionLoading[report.id] && (
                            <span role="status" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              <RefreshCw size={13} className="spin" style={{ display: 'inline', marginRight: '0.3rem' }} />
                              Menyimpan perubahan status...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODULE 4: MONITORING & TRANSPARANSI DONASI */}
              {superAdminTab === 'audit_donasi' && (
                <div>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                        4. Audit Donasi Daerah &amp; Matriks Kebutuhan Panti
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Rekapitulasi transparansi bantuan publik ke seluruh LKSA terdaftar di wilayah Kabupaten.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800 }}>
                        {adminDonations.filter(d => d.status === 'terverifikasi').length} Donasi Terverifikasi
                      </span>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.35rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800 }}>
                        {adminDonations.filter(d => d.status === 'menunggu').length} Menunggu Persetujuan
                      </span>
                    </div>
                  </div>

                  {/* Real Time Incoming Donations Table */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wallet size={20} color="#1d4ed8" />
                      <span>Daftar Transaksi Donasi Masuk (Perlu Verifikasi &amp; Approval)</span>
                    </h3>

                    {adminDonations.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
                        Belum ada antrean donasi baru yang masuk dari masyarakat.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                              <th style={{ padding: '0.75rem' }}>ID &amp; Tanggal</th>
                              <th style={{ padding: '0.75rem' }}>Donatur</th>
                              <th style={{ padding: '0.75rem' }}>Panti Tujuan</th>
                              <th style={{ padding: '0.75rem' }}>Jenis &amp; Jumlah / Paket</th>
                              <th style={{ padding: '0.75rem' }}>Status</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aksi Approval</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminDonations.map((d) => (
                              <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.75rem' }}>
                                  <strong style={{ color: '#0b1f5c', display: 'block' }}>{d.id}</strong>
                                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{d.date}</span>
                                </td>
                                <td style={{ padding: '0.75rem' }}>{d.donor}</td>
                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{d.panti}</td>
                                <td style={{ padding: '0.75rem', color: d.jenis === 'uang' ? '#15803d' : '#0284c7', fontWeight: 700 }}>
                                  {d.amount}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <span style={{
                                    background: d.status === 'terverifikasi' ? '#dcfce7' : d.status === 'ditolak' ? '#fee2e2' : '#fef3c7',
                                    color: d.status === 'terverifikasi' ? '#15803d' : d.status === 'ditolak' ? '#dc2626' : '#b45309',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '50px',
                                    fontSize: '0.725rem',
                                    fontWeight: 800
                                  }}>
                                    {d.status === 'terverifikasi' ? 'Terverifikasi' : d.status === 'ditolak' ? 'Ditolak' : 'Menunggu'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                  {d.status === 'menunggu' ? (
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                      <button
                                        onClick={() => handleVerifyDonationAdmin(d.rawId, 'terverifikasi')}
                                        disabled={actionLoading[d.rawId]}
                                        style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        {actionLoading[d.rawId] ? '...' : '✔ Setujui'}
                                      </button>
                                      <button
                                        onClick={() => handleVerifyDonationAdmin(d.rawId, 'ditolak')}
                                        disabled={actionLoading[d.rawId]}
                                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Tolak
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Selesai Diproses</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Regional Aggregation Table */}
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 1rem 0' }}>
                      Ringkasan Kebutuhan &amp; Logistik Panti se-Kabupaten
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.85rem' }}>LKSA Panti Asuhan</th>
                          <th style={{ padding: '0.85rem' }}>Donasi Uang Masuk</th>
                          <th style={{ padding: '0.85rem' }}>Paket Barang Diterima</th>
                          <th style={{ padding: '0.85rem' }}>Tingkat Urgensi Kebutuhan</th>
                          <th style={{ padding: '0.85rem' }}>Kebutuhan Mendesak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionalDonationAudit.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.85rem', fontWeight: 700, color: '#0b1f5c' }}>{row.panti} ({row.location})</td>
                            <td style={{ padding: '0.85rem', color: '#15803d', fontWeight: 700 }}>{row.moneyReceived}</td>
                            <td style={{ padding: '0.85rem' }}>{row.goodsReceived}</td>
                            <td style={{ padding: '0.85rem' }}>
                              <span style={{ background: row.priorityNeed.includes('KRITIS') ? '#fee2e2' : '#fef3c7', color: row.priorityNeed.includes('KRITIS') ? '#dc2626' : '#b45309', padding: '0.2rem 0.5rem', borderRadius: '50px', fontSize: '0.725rem', fontWeight: 800 }}>
                                {row.priorityNeed}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem', fontWeight: 600 }}>{row.mainNeed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 5: DASHBOARD ANALITIS & LAPORAN EKSEKUTIF */}
              {superAdminTab === 'analitik_eksekutif' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                        5. Dashboard Analitis &amp; Laporan Eksekutif Dinsos
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Ringkasan statistik kinerja pelayanan anak dan ekspor dokumen resmi.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleExportReport('PDF')} className="btn btn-primary" style={{ borderRadius: '50px', fontSize: '0.8rem' }}>
                        <Download size={15} /> Cetak Laporan PDF
                      </button>
                      <button onClick={() => handleExportReport('Excel')} className="btn btn-secondary" style={{ borderRadius: '50px', fontSize: '0.8rem' }}>
                        <FileSpreadsheet size={15} /> Export Excel
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }} className="grid-4">
                    {[
                      { title: 'Total LKSA Terdaftar', num: '28 Panti', sub: '100% Mengantongi Tanda Daftar' },
                      { title: 'Master Data Anak Asuh', num: '1.240 Anak', sub: 'Yatim, Piatu, & Dhuafa' },
                      { title: 'Kasus Anak Hilang Selesai', num: '94%', sub: '23 Kasus Teratasi Tepat Waktu' },
                      { title: 'Pengangkatan Anak (PIPA)', num: '18 Anak', sub: 'Legalitas Resmi Terbit' }
                    ].map((box, i) => (
                      <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>{box.title}</span>
                        <strong style={{ fontSize: '1.5rem', color: '#0b1f5c', fontWeight: 800, display: 'block', marginBottom: '0.2rem' }}>{box.num}</strong>
                        <span style={{ fontSize: '0.725rem', color: '#059669', fontWeight: 600 }}>{box.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW TYPE B: ADMIN PANTI ASUHAN (REQUIREMENT 2)     */}
          {/* ==================================================== */}
          {dashboardRoleMode === 'pantiadmin' && (
            <div>
              {/* TAB 1: DAFTAR ANAK ASUH PANTI (REQ 2.1) */}
              {pantiAdminTab === 'daftar_anak' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                        1. Data Anak Asuh Panti (LKSA Kasih Bunda Mandiri)
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Kelola data anak asuh terdaftar di panti ini.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddChildModal(true)}
                      style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '0.6rem 1.1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} /> Tambah Anak Asuh Baru
                    </button>
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', color: '#78350f' }}>
                          <th style={{ padding: '0.85rem' }}>ID &amp; Nama Anak</th>
                          <th style={{ padding: '0.85rem' }}>Usia &amp; Gender</th>
                          <th style={{ padding: '0.85rem' }}>Status Kesejahteraan</th>
                          <th style={{ padding: '0.85rem' }}>Pendidikan &amp; Kesehatan</th>
                          <th style={{ padding: '0.85rem', textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pantiChildren.map((child) => (
                          <tr key={child.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.85rem' }}>
                              <strong style={{ color: '#0b1f5c', display: 'block' }}>{child.name}</strong>
                              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{child.id} • Masuk: {child.joinDate}</span>
                            </td>
                            <td style={{ padding: '0.85rem' }}>{child.age} ({child.gender})</td>
                            <td style={{ padding: '0.85rem' }}>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.725rem' }}>
                                {child.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem' }}>
                              <span>{child.education}</span>
                              <span style={{ fontSize: '0.725rem', color: '#059669', display: 'block' }}>✔ {child.health}</span>
                            </td>
                            <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                              <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                                Edit Data
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: INPUT DONASI BARANG & UANG MASUK (REQ 2.2) */}
              {pantiAdminTab === 'input_donasi' && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                      2. Input Donasi Barang Kebutuhan &amp; Rekap Uang Masuk
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      Kelola daftar barang yang paling dibutuhkan panti dan pantau rekapan transfer uang masuk.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-2-mobile">
                    {/* Left: Input Goods Need */}
                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={20} color="#1d4ed8" />
                        <span>Input Barang Dibutuhkan Panti (Wishlist)</span>
                      </h3>

                      <form onSubmit={handleAddGoodsNeed} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Nama barang (contoh: Sembako, Popok, Buku)"
                          value={newNeedItem}
                          onChange={(e) => setNewNeedItem(e.target.value)}
                          style={{ flex: '1 1 180px', minWidth: '150px', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <input
                          type="text"
                          placeholder="Target Qty (misal: 20 Paket)"
                          value={newNeedQty}
                          onChange={(e) => setNewNeedQty(e.target.value)}
                          style={{ flex: '0 1 120px', minWidth: '100px', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <select
                          value={newNeedUrgency}
                          onChange={(e) => setNewNeedUrgency(e.target.value)}
                          style={{ flex: '0 1 165px', minWidth: '140px', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#ffffff', color: newNeedUrgency ? '#0f172a' : '#94a3b8' }}
                        >
                          <option value="" disabled>Pilih Urgensi...</option>
                          <option value="Mendesak / Barang Habis">Mendesak / Barang Habis</option>
                          <option value="Hampir Habis">Hampir Habis</option>
                          <option value="Tersedia Sebagian">Tersedia Sebagian</option>
                        </select>
                        <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '0.65rem 1.1rem', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          + Tambah
                        </button>
                      </form>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pantiNeededGoods.map((item) => {
                          const isUrgent = item.status === 'Mendesak / Barang Habis' || item.status === 'Mendesak';
                          const isWarning = item.status === 'Hampir Habis';
                          const badgeStyle = isUrgent
                            ? { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }
                            : isWarning
                              ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
                              : { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };

                          return (
                            <div key={item.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 0.95rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ fontSize: '0.875rem', color: '#0b1f5c', display: 'block' }}>{item.item}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Target: {item.qty}</span>
                              </div>
                              <span style={{ ...badgeStyle, fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '50px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {item.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Income Cash Records */}
                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={20} color="#1d4ed8" />
                        <span>Rekapitulasi Donasi Masuk (Uang &amp; Logistik)</span>
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pantiCashIncome.map((cash) => (
                          <div key={cash.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                              <strong style={{ fontSize: '0.925rem', color: '#1d4ed8', display: 'block' }}>{cash.amount}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#475569' }}>{cash.donor} • {cash.program}</span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>Tanggal: {cash.date}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                background: cash.status === 'terverifikasi' ? '#dcfce7' : cash.status === 'ditolak' ? '#fee2e2' : '#fef3c7',
                                color: cash.status === 'terverifikasi' ? '#15803d' : cash.status === 'ditolak' ? '#dc2626' : '#b45309',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '50px',
                                fontSize: '0.7rem',
                                fontWeight: 800
                              }}>
                                {cash.status === 'terverifikasi' ? 'Terverifikasi' : cash.status === 'ditolak' ? 'Ditolak' : 'Menunggu'}
                              </span>

                              {cash.status === 'menunggu' && cash.rawId && (
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button
                                    onClick={() => handleVerifyDonationPanti(cash.rawId, 'terverifikasi')}
                                    disabled={actionLoading[cash.rawId]}
                                    style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {actionLoading[cash.rawId] ? '...' : '✔ Terima'}
                                  </button>
                                  <button
                                    onClick={() => handleVerifyDonationPanti(cash.rawId, 'ditolak')}
                                    disabled={actionLoading[cash.rawId]}
                                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Tolak
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PELAPORAN ANAK HILANG (DARI MASYARAKAT) */}
              {pantiAdminTab === 'laporan_hilang_panti' && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                      3. Monitoring Pelaporan Anak Hilang (Publik)
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      Pantau informasi anak hilang dari masyarakat untuk pencocokan dengan anak asuh di panti.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {lostChildReports.map((r) => (
                      <div key={r.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0b1f5c' }}>{r.childName}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                            Pelapor: {r.reporter} • Hilang di: {r.location}
                          </span>
                        </div>
                        <button onClick={() => showToast(`Kategori pencocokan panti untuk ${r.childName} berhasil dicatat.`)} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer' }}>
                          Cek Ditemukan di PantiIni
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HASIL FORMULIR ADOPSI ANAK */}
              {pantiAdminTab === 'formulir_adopsi_panti' && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                      4. Permohonan Adopsi dari Calon Orang Tua
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      Review berkas permohonan pengangkatan anak dari masyarakat untuk diteruskan ke Dinas Sosial (PIPA).
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(pantiAdoptions.length > 0 ? pantiAdoptions : adopsiApplications).map((adp) => (
                      <div key={adp.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#0b1f5c', display: 'block' }}>Pemohon: {adp.applicant}</strong>
                          <span style={{ fontSize: '0.825rem', color: '#475569' }}>Anak Diadopsi: <strong>{adp.targetChild}</strong></span>
                          <span style={{ fontSize: '0.75rem', color: adp.status?.includes('Disetujui') ? '#15803d' : '#d97706', display: 'block', marginTop: '2px', fontWeight: 700 }}>
                            Status: {adp.status}
                          </span>
                        </div>

                        {!adp.status?.includes('Disetujui') && !adp.status?.includes('Ditolak') ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handlePantiRecommendAdopsi(adp, 'rekomendasikan')}
                              disabled={actionLoading[adp.id]}
                              style={{ background: '#d97706', color: '#fff', border: 'none', padding: '0.55rem 1rem', borderRadius: '50px', fontSize: '0.775rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              {actionLoading[adp.id] ? <RefreshCw size={13} className="spin" /> : null}
                              <span>✔ Verifikasi &amp; Teruskan Ke Dinsos PIPA</span>
                            </button>
                            <button
                              onClick={() => handlePantiRecommendAdopsi(adp, 'tolak')}
                              disabled={actionLoading[adp.id]}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.55rem 0.85rem', borderRadius: '50px', fontSize: '0.775rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#64748b' }}>
                            Berkas Telah Diproses
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: MANAJEMEN & PERSETUJUAN VOLUNTEER (REQUIREMENT 2) */}
              {pantiAdminTab === 'volunteer_panti' && (
                <div>
                  {/* Header & Subtitle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.725rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '50px' }}>
                          PANEL ADMIN PANTI • PERSETUJUAN RELAWAN
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>LKSA Kasih Bunda Mandiri</span>
                      </div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', margin: 0 }}>
                        5. Verifikasi &amp; Persetujuan Formulir Volunteer
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                        Tinjau formulir pendaftaran relawan masyarakat, periksa usia minimal dan berkas scan KTP/KTM, serta setujui atau tolak keikutsertaan.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.4rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 800 }}>
                        {currentVolunteers.filter(v => v.status === 'Disetujui').length} Relawan Aktif Disetujui
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Total Pendaftaran</span>
                      <strong style={{ fontSize: '1.4rem', color: '#0b1f5c', fontWeight: 800 }}>{currentVolunteers.length} Relawan</strong>
                      <span style={{ fontSize: '0.7rem', color: '#1d4ed8', display: 'block', marginTop: '0.2rem' }}>Pendidikan &amp; Kesenian</span>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #fde68a', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, display: 'block' }}>Menunggu Persetujuan</span>
                      <strong style={{ fontSize: '1.4rem', color: '#d97706', fontWeight: 800 }}>
                        {currentVolunteers.filter(v => v.status === 'Menunggu Persetujuan').length} Berkas
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#d97706', display: 'block', marginTop: '0.2rem' }}>Perlu Ditindaklanjuti</span>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, display: 'block' }}>Disetujui (Diterima)</span>
                      <strong style={{ fontSize: '1.4rem', color: '#16a34a', fontWeight: 800 }}>
                        {currentVolunteers.filter(v => v.status === 'Disetujui').length} Relawan
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', display: 'block', marginTop: '0.2rem' }}>Siap Mengajar / Melatih</span>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #fca5a5', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, display: 'block' }}>Ditolak / Belum Memenuhi</span>
                      <strong style={{ fontSize: '1.4rem', color: '#ef4444', fontWeight: 800 }}>
                        {currentVolunteers.filter(v => v.status === 'Ditolak').length} Berkas
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#dc2626', display: 'block', marginTop: '0.2rem' }}>Tidak Memenuhi Syarat</span>
                    </div>
                  </div>

                  {/* Filter Tabs & Search Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                    background: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Status Tabs */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {['Semua', 'Menunggu Persetujuan', 'Disetujui', 'Ditolak'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setVolunteerFilter(st)}
                          style={{
                            border: 'none',
                            padding: '0.45rem 0.9rem',
                            borderRadius: '50px',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: volunteerFilter === st ? '#78350f' : '#f1f5f9',
                            color: volunteerFilter === st ? '#ffffff' : '#475569',
                            transition: 'all 0.15s'
                          }}
                        >
                          {st} ({st === 'Semua' ? currentVolunteers.length : currentVolunteers.filter(v => v.status === st).length})
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                      <Search size={16} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Cari nama relawan, nomor HP..."
                        value={volunteerSearch}
                        onChange={(e) => setVolunteerSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '220px' }}
                      />
                      {volunteerSearch && (
                        <button onClick={() => setVolunteerSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Volunteer Applications */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {currentVolunteers
                      .filter(v => {
                        const matchFilter = volunteerFilter === 'Semua' ? true : v.status === volunteerFilter;
                        const matchSearch = v.nama.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                          v.bidang.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                          v.nomorHp.includes(volunteerSearch);
                        return matchFilter && matchSearch;
                      })
                      .map((vol) => (
                        <div
                          key={vol.id}
                          style={{
                            background: '#ffffff',
                            border: vol.status === 'Menunggu Persetujuan' ? '1px solid #fde68a' : vol.status === 'Disetujui' ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Top Row: Volunteer Name, ID, Submitted Time & Status Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <strong style={{ fontSize: '1.15rem', color: '#0b1f5c' }}>{vol.nama}</strong>
                                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                  {vol.id}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Diajukan: {vol.submittedAt} • Panti: <strong>{vol.pantiTujuan}</strong>
                              </span>
                            </div>

                            {/* Status Pill Badge */}
                            <div>
                              {vol.status === 'Menunggu Persetujuan' && (
                                <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.3rem 0.85rem', borderRadius: '50px', fontSize: '0.775rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Clock size={14} /> Menunggu Persetujuan
                                </span>
                              )}
                              {vol.status === 'Disetujui' && (
                                <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.3rem 0.85rem', borderRadius: '50px', fontSize: '0.775rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <CheckCircle2 size={14} /> Disetujui (Diterima)
                                </span>
                              )}
                              {vol.status === 'Ditolak' && (
                                <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.3rem 0.85rem', borderRadius: '50px', fontSize: '0.775rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <XCircle size={14} /> Tidak Disetujui (Ditolak)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detail Grid: Usia, Bidang, Waktu, Berkas KTP */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', fontSize: '0.825rem' }}>
                            {/* Usia & Verifikasi Batas Usia Minimal */}
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginBottom: '0.15rem' }}>Usia Calon Relawan:</span>
                              <strong style={{ color: '#0b1f5c', fontSize: '0.95rem', display: 'block' }}>{vol.usia} Tahun</strong>
                              {vol.usia >= 17 ? (
                                <span style={{ color: '#15803d', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                  <ShieldCheck size={13} /> Memenuhi Batas Usia Minimal (≥17)
                                </span>
                              ) : (
                                <span style={{ color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                  <AlertTriangle size={13} /> Di Bawah Batas Usia Minimal (&lt;17)
                                </span>
                              )}
                            </div>

                            {/* Bidang Kerelawanan */}
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginBottom: '0.15rem' }}>Bidang Kerelawanan:</span>
                              <strong style={{ color: vol.bidang.includes('Pendidikan') ? '#1d4ed8' : '#059669', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {vol.bidang.includes('Pendidikan') ? <GraduationCap size={16} /> : <Palette size={16} />}
                                {vol.bidang}
                              </strong>
                              <span style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.2rem', display: 'block' }}>
                                {vol.bidang.includes('Pendidikan') ? 'Bimbel & Calistung' : 'Seni Kreasi & Olahraga'}
                              </span>
                            </div>

                            {/* Waktu & Tanggal */}
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginBottom: '0.15rem' }}>Jadwal &amp; Sesi Ketersediaan:</span>
                              <strong style={{ color: '#0b1f5c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Calendar size={14} color="#1d4ed8" /> {vol.tanggal}
                              </strong>
                              <span style={{ color: '#475569', fontSize: '0.725rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} color="#64748b" /> {vol.sesiWaktu}
                              </span>
                            </div>

                            {/* Scan KTP / KTM Button */}
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block', marginBottom: '0.15rem' }}>Berkas Scan KTP / KTM:</span>
                                <strong style={{ color: '#0b1f5c', fontSize: '0.8rem', display: 'block' }}>{vol.ktpFileName}</strong>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{vol.ktpFileSize} • Terunggah</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedKtpDoc(vol)}
                                style={{
                                  marginTop: '0.4rem',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                <Eye size={13} /> Lihat Scan KTP/KTM
                              </button>
                            </div>
                          </div>

                          {/* Alamat Domisili */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                            <MapPin size={15} color="#1d4ed8" style={{ flexShrink: 0 }} />
                            <span><strong>Alamat Domisili:</strong> {vol.alamat}</span>
                          </div>

                          {/* Penjelasan Singkat Tujuan Kerelawanan */}
                          <div style={{ background: '#eff6ff', borderLeft: '4px solid #1d4ed8', padding: '0.85rem 1rem', borderRadius: '0 8px 8px 0' }}>
                            <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#1e40af', display: 'block', marginBottom: '0.25rem' }}>
                              Tujuan &amp; Motivasi Kerelawanan dari Pendaftar:
                            </span>
                            <p style={{ fontSize: '0.825rem', color: '#1e3a8a', margin: 0, fontStyle: 'italic', lineHeight: 1.45 }}>
                              "{vol.tujuanKerelawanan}"
                            </p>
                          </div>

                          {/* ACTION BUTTONS ROW (SETUJUI / TOLAK / HUBUNGI WHATSAPP) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                            {/* Left: Contact Volunteer via WhatsApp */}
                            <a
                              href={`https://wa.me/${vol.nomorHp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#22c55e',
                                color: '#ffffff',
                                padding: '0.5rem 0.9rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                textDecoration: 'none'
                              }}
                            >
                              <MessageCircle size={15} /> Hubungi WhatsApp ({vol.nomorHp})
                            </a>

                            {/* Right: Approval Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              {vol.status === 'Menunggu Persetujuan' && (
                                <>
                                  <button
                                    onClick={() => handleRejectVolunteer(vol)}
                                    style={{
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: '1px solid #fca5a5',
                                      padding: '0.55rem 1.1rem',
                                      borderRadius: '8px',
                                      fontSize: '0.825rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem'
                                    }}
                                  >
                                    <X size={16} /> Tolak Pendaftaran
                                  </button>

                                  <button
                                    onClick={() => handleApproveVolunteer(vol)}
                                    style={{
                                      background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '0.55rem 1.35rem',
                                      borderRadius: '8px',
                                      fontSize: '0.825rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
                                    }}
                                  >
                                    <CheckCircle2 size={16} /> Setujui Volunteer (Diterima)
                                  </button>
                                </>
                              )}

                              {vol.status === 'Disetujui' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <CheckCircle2 size={16} color="#15803d" /> Pendaftaran Telah Disetujui Panti
                                  </span>
                                  <button
                                    onClick={() => handleRejectVolunteer(vol)}
                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Batalkan / Ubah ke Ditolak
                                  </button>
                                </div>
                              )}

                              {vol.status === 'Ditolak' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <XCircle size={16} color="#dc2626" /> Pendaftaran Ditolak
                                  </span>
                                  <button
                                    onClick={() => handleApproveVolunteer(vol)}
                                    style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    Pertimbangkan Ulang &amp; Setujui
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      ))}

                    {currentVolunteers.filter(v => volunteerFilter === 'Semua' ? true : v.status === volunteerFilter).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        <HeartHandshake size={48} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b1f5c', margin: '0 0 0.35rem 0' }}>Tidak Ada Berkas Relawan</h4>
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>Tidak ada data relawan yang cocok dengan filter status atau pencarian ini.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* MODAL: PREVIEW SCAN KTP / KTM RELAWAN */}
      {selectedKtpDoc && (
        <div className="modal-overlay" onClick={() => setSelectedKtpDoc(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                  Dokumen Identitas KTP / KTM
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedKtpDoc.nama} ({selectedKtpDoc.id})</span>
              </div>
              <button onClick={() => setSelectedKtpDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Mock KTP / KTM Visual Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0b1f5c 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 8px 20px rgba(11,31,92,0.25)',
              marginBottom: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#93c5fd', letterSpacing: '0.08em', fontWeight: 800, display: 'block' }}>REPUBLIK INDONESIA</span>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>KARTU IDENTITAS RELAWAN SOSIAL</strong>
                </div>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  TERVERIFIKASI
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '70px', height: '85px', background: '#3b82f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, border: '2px solid rgba(255,255,255,0.4)' }}>
                  FOTO ID
                </div>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div><strong>Nama:</strong> {selectedKtpDoc.nama}</div>
                  <div><strong>NIK/NIM:</strong> 3201************</div>
                  <div><strong>Usia:</strong> {selectedKtpDoc.usia} Tahun</div>
                  <div><strong>Domisili:</strong> {selectedKtpDoc.alamat}</div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.7rem', color: '#bfdbfe', display: 'flex', justifyContent: 'space-between' }}>
                <span>Berkas: {selectedKtpDoc.ktpFileName}</span>
                <span>Ukuran: {selectedKtpDoc.ktpFileSize}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={16} /> Berkas aman &amp; memenuhi validasi panti
              </span>
              <button
                onClick={() => setSelectedKtpDoc(null)}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Anak Asuh Baru (Admin Panti) */}
      {showAddChildModal && (
        <div className="modal-overlay" onClick={() => setShowAddChildModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b1f5c', margin: 0 }}>
                Tambah Anak Asuh Panti
              </h3>
              <button onClick={() => setShowAddChildModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddChild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Nama Lengkap Anak
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama anak"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Usia (Tahun)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 5"
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Status Kesejahteraan
                </label>
                <select
                  value={newChildStatus}
                  onChange={(e) => setNewChildStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="Yatim Piatu">Yatim Piatu</option>
                  <option value="Yatim">Yatim</option>
                  <option value="Piatu">Piatu</option>
                  <option value="Anak Terlantar">Anak Terlantar</option>
                  <option value="Dhuafa">Dhuafa</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: '50px', padding: '0.75rem', marginTop: '0.5rem' }}>
                <UserPlus size={16} /> Simpan Data Anak Asuh
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PANEL INSPEKSI AI OCR DOKUMEN COTA */}
      {showAiAdminReviewModal && selectedAdopsiApplicant && (
        <AdminDocumentReview
          isOpen={showAiAdminReviewModal}
          onClose={() => setShowAiAdminReviewModal(false)}
          selectedApplicant={selectedAdopsiApplicant}
          onReanalyzeAI={handleReanalyzeSelectedAdoptionAI}
          isAnalyzingAI={Boolean(actionLoading[`adopsi-ai-${selectedAdopsiApplicant.rawId}`])}
          isSavingDecision={Boolean(actionLoading[`adopsi-modal-${selectedAdopsiApplicant.rawId}`])}
          onApprove={() => handleModalAdoptionStatus('diverifikasi')}
          onReject={() => handleModalAdoptionStatus('ditolak')}
          onReupload={() => handleModalAdoptionStatus('butuh_dokumen_tambahan')}
        />
      )}

    </div>
  );
}
