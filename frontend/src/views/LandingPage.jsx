import React from 'react';
import HeroSection from '../components/HeroSection';
import QuickActions from '../components/QuickActions';
import OrphanageDirectory from '../components/OrphanageDirectory';
import Footer from '../components/Footer';
import DashboardPersonalWarga from '../components/DashboardPersonalWarga';

export default function LandingPage({
  isLoggedIn,
  currentUser,
  onLogout,
  onToggleLoginDemo,
  onSwitchToDashboard,
  onSwitchToPengaduan,
  onSwitchToPanti,
  onSwitchToDonasi,
  onSwitchToAdopsi,
  onSwitchToVolunteer,
  onOpenLapor,
  onOpenLacak,
  onOpenHotline,
  onOpenLogin,
  onOpenRegisterPanti,
  onOpenAdopsi,
  onOpenMap,
  onSelectPanti,
  activeTab,
  setActiveTab
}) {
  // Jika pengguna sudah login sebagai User/Warga, tampilkan Dashboard Personal Warga
  if (isLoggedIn) {
    return (
      <DashboardPersonalWarga
        currentUser={currentUser}
        onSwitchToPengaduan={onSwitchToPengaduan}
        onSwitchToAdopsi={onSwitchToAdopsi}
        onSwitchToDonasi={onSwitchToDonasi}
        onSwitchToVolunteer={onSwitchToVolunteer}
        onSwitchToPanti={onSwitchToPanti}
        onOpenLapor={onOpenLapor}
        onOpenLacak={onOpenLacak}
        onOpenAdopsi={onOpenAdopsi}
        onOpenHotline={onOpenHotline}
        onSelectPanti={onSelectPanti}
      />
    );
  }

  // Tampilan landing page promosi umum untuk pengunjung publik (belum login)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* 3. Hero Section (Informasi Singkat Layanan Dinsos) */}
      <HeroSection 
        onOpenLapor={onOpenLapor}
        onOpenHotline={onOpenHotline}
        onOpenAdopsi={onOpenAdopsi}
        onOpenLogin={onOpenLogin}
        onOpenRegisterPanti={onOpenRegisterPanti}
        onSwitchToDonasi={onSwitchToDonasi}
      />

      {/* 4. Quick Actions Grid Cards */}
      <QuickActions 
        onOpenLapor={onOpenLapor}
        onOpenLacak={onOpenLacak}
        onScrollPanti={onSwitchToPanti}
        onOpenKonsultasi={onOpenHotline}
        onOpenAdopsi={onOpenAdopsi}
      />

      {/* 5. Orphanage Directory Section */}
      <OrphanageDirectory 
        onSelectPanti={onSelectPanti}
        isLoggedIn={isLoggedIn}
        onOpenLogin={onOpenLogin}
      />

      {/* 6. Footer */}
      <Footer 
        onOpenMap={onOpenMap}
        onOpenAdopsi={onOpenAdopsi}
      />

    </div>
  );
}

