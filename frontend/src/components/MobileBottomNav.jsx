import React from 'react';
import {
  Home,
  FileText,
  Heart,
  Building2,
  Menu
} from 'lucide-react';

/**
 * Mobile Bottom Navigation Bar untuk HaloKids
 * Dikhususkan untuk layar HP / Tablet (< 900px / lg:hidden)
 * - Posisi fixed di bawah layar yang mudah dijangkau jempol
 * - Desain glassmorphism elegan dengan feedback tap yang halus
 * - Donasi hanya ditampilkan untuk pengguna yang sudah login
 */
export default function MobileBottomNav({
  activeTab = 'beranda',
  viewMode = 'landing',
  isLoggedIn = false,
  onNavigate = () => {},
  onToggleSidebar = () => {}
}) {
  const navItems = [
    {
      id: 'beranda',
      mode: 'landing',
      label: 'Beranda',
      icon: Home
    },
    {
      id: 'pengaduan',
      mode: 'pengaduan',
      label: 'Lapor TRC',
      icon: FileText,
      badge: '24 Jam'
    },
    {
      id: 'panti',
      mode: 'panti',
      label: 'Direktori',
      icon: Building2
    }
  ];

  if (isLoggedIn) {
    navItems.splice(2, 0, {
      id: 'donasi',
      mode: 'donasi',
      label: 'Donasi',
      icon: Heart,
    });
  }

  const isCurrentActive = (item) => {
    return activeTab === item.id || viewMode === item.mode;
  };

  return (
    <nav
      aria-label="Navigasi Bawah Ponsel"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(11,31,92,0.08)] transition-all"
      style={{
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0.35rem))'
      }}
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const active = isCurrentActive(item);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.mode, item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 relative active:scale-90 ${
                active
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
              style={{ minWidth: '56px', minHeight: '48px' }}
            >
              <div
                className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                  active ? 'bg-blue-50 text-blue-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <IconComp size={19} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10.5px] mt-0.5 tracking-tight leading-tight">
                {item.label}
              </span>
              {item.badge && !active && (
                <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}

        {/* Tombol Menu / Drawer untuk membuka sidebar menu lengkap (COTA, Volunteer, Lacak, Profil) */}
        <button
          onClick={onToggleSidebar}
          aria-label="Buka Menu Lainnya"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 active:scale-90 transition-all"
          style={{ minWidth: '56px', minHeight: '48px' }}
        >
          <div className="w-9 h-7 rounded-lg flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            <Menu size={19} strokeWidth={2} />
          </div>
          <span className="text-[10.5px] mt-0.5 font-medium tracking-tight leading-tight">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
