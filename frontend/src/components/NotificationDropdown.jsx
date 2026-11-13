import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  FileCheck2,
  HeartHandshake,
  Info,
  Inbox,
  LogIn,
  Megaphone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';

import notificationService from '../api/notificationService';
import {
  ANNOUNCEMENT_SEEN_KEY,
  countUnread,
  countUnseenAnnouncements,
  formatRelativeTime,
  inferCategory,
  maxId,
  resolveNotificationRole,
  targetTabFor,
} from '../utils/notificationHelpers';

// Muat ulang otomatis tiap 60 detik selama tab browser terlihat.
const POLL_INTERVAL_MS = 60 * 1000;

const PERSONAL_UI = {
  lksa: { icon: Building2, color: '#1d4ed8', bg: '#eff6ff', label: 'LKSA' },
  adopsi: { icon: FileCheck2, color: '#2563eb', bg: '#eff6ff', label: 'Adopsi' },
  relawan: { icon: Users, color: '#4f46e5', bg: '#eef2ff', label: 'Relawan' },
  donasi: { icon: HeartHandshake, color: '#059669', bg: '#ecfdf5', label: 'Donasi' },
  laporan: { icon: ShieldAlert, color: '#dc2626', bg: '#fef2f2', label: 'Laporan' },
  umum: { icon: Info, color: '#475569', bg: '#f1f5f9', label: 'Info' },
};

const ANNOUNCEMENT_UI = {
  panti_baru: { icon: Building2, color: '#047857', bg: '#ecfdf5', label: 'Panti baru' },
  pembaruan: { icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff', label: 'Pembaruan' },
  pengumuman: { icon: Megaphone, color: '#b45309', bg: '#fffbeb', label: 'Pengumuman' },
};

function readSeenId() {
  try {
    return Number(localStorage.getItem(ANNOUNCEMENT_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeSeenId(value) {
  try {
    localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, String(value));
  } catch {
    // Penyimpanan browser dinonaktifkan: penanda hanya berlaku sesi ini.
  }
}

/**
 * Lonceng notifikasi.
 *
 * - Belum login : hanya Pengumuman publik (pembaruan web, panti baru).
 * - Sudah login : tab "Untuk Saya" (notifikasi pribadi akun ini saja,
 *                 disaring oleh backend) + tab "Pengumuman".
 */
export default function NotificationDropdown(props) {
  const { isLoggedIn, currentUser } = props;

  const role = isLoggedIn ? resolveNotificationRole(currentUser) : null;

  // Identitas akun dipakai sebagai `key`. Saat login, logout, atau
  // berganti akun tanpa memuat ulang halaman, komponen di bawah dibuat
  // ulang dari nol sehingga notifikasi akun sebelumnya tidak mungkin
  // tampil di akun berikutnya.
  const identity = role
    ? `${role}:${currentUser?.id ?? currentUser?.email ?? ''}`
    : 'tamu';

  return <NotificationBell key={identity} {...props} />;
}

function NotificationBell({
  isLoggedIn,
  currentUser,
  onOpenLogin,
  onNavigateTab,
}) {
  const role = isLoggedIn ? resolveNotificationRole(currentUser) : null;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('umum');
  const [activeFilter, setActiveFilter] = useState('semua');

  const [personal, setPersonal] = useState([]);
  const [personalError, setPersonalError] = useState(false);
  const [personalLoaded, setPersonalLoaded] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementError, setAnnouncementError] = useState(false);
  const [announcementLoaded, setAnnouncementLoaded] = useState(false);

  const [seenId, setSeenId] = useState(readSeenId);
  const [baselineSeenId, setBaselineSeenId] = useState(readSeenId);

  const popoverRef = useRef(null);
  const personalSeq = useRef(0);
  const announcementSeq = useRef(0);

  // ------------------------------------------------------------
  // Pengambilan data
  // ------------------------------------------------------------

  const loadPersonal = useCallback(async () => {
    if (!role) return;

    const seq = ++personalSeq.current;

    try {
      const data = await notificationService.listMine(role);
      if (seq !== personalSeq.current) return;

      setPersonal(Array.isArray(data) ? data : []);
      setPersonalError(false);
    } catch {
      if (seq !== personalSeq.current) return;
      // Data terakhir tetap ditampilkan; hanya tandai gagal memuat.
      setPersonalError(true);
    } finally {
      if (seq === personalSeq.current) setPersonalLoaded(true);
    }
  }, [role]);

  const loadAnnouncements = useCallback(async () => {
    const seq = ++announcementSeq.current;

    try {
      const data = await notificationService.listAnnouncements();
      if (seq !== announcementSeq.current) return;

      setAnnouncements(Array.isArray(data) ? data : []);
      setAnnouncementError(false);
    } catch {
      if (seq !== announcementSeq.current) return;
      setAnnouncementError(true);
    } finally {
      if (seq === announcementSeq.current) setAnnouncementLoaded(true);
    }
  }, []);

  // Muat pertama kali.
  useEffect(() => {
    if (role) loadPersonal();
    loadAnnouncements();
  }, [role, loadPersonal, loadAnnouncements]);

  // Penyegaran berkala + saat tab browser kembali aktif.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (role) loadPersonal();
      loadAnnouncements();
    };

    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [role, loadPersonal, loadAnnouncements]);

  // Tutup saat klik di luar atau menekan Escape.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointer = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // Pengumuman dianggap sudah dilihat saat tab-nya terbuka.
  useEffect(() => {
    if (!isOpen || activeTab !== 'umum') return;

    const highest = maxId(announcements);
    if (highest > seenId) {
      setSeenId(highest);
      writeSeenId(highest);
    }
  }, [isOpen, activeTab, announcements, seenId]);

  // ------------------------------------------------------------
  // Turunan
  // ------------------------------------------------------------

  const personalUnread = countUnread(personal);
  const announcementUnseen = countUnseenAnnouncements(announcements, seenId);
  const badgeCount = personalUnread + announcementUnseen;

  const visiblePersonal = useMemo(
    () =>
      activeFilter === 'unread'
        ? personal.filter((item) => !item.is_read)
        : personal,
    [personal, activeFilter]
  );

  // ------------------------------------------------------------
  // Aksi
  // ------------------------------------------------------------

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setBaselineSeenId(seenId);
    setActiveFilter('semua');

    if (!role) {
      setActiveTab('umum');
    } else if (personalUnread > 0) {
      setActiveTab('saya');
    } else if (announcementUnseen > 0) {
      setActiveTab('umum');
    } else {
      setActiveTab('saya');
    }

    setIsOpen(true);

    if (role) loadPersonal();
    loadAnnouncements();
  };

  const handleMarkRead = async (item) => {
    if (item.is_read) return;

    setPersonal((previous) =>
      previous.map((row) =>
        row.id === item.id ? { ...row, is_read: true } : row
      )
    );

    try {
      await notificationService.markRead(role, item.id);
    } catch {
      loadPersonal();
    }
  };

  const handleMarkAllRead = async () => {
    if (personalUnread === 0) return;

    setPersonal((previous) =>
      previous.map((row) => ({ ...row, is_read: true }))
    );

    try {
      await notificationService.markAllRead(role);
    } catch {
      loadPersonal();
    }
  };

  const handlePersonalClick = (item) => {
    handleMarkRead(item);

    const target = targetTabFor(role, inferCategory(item.judul));

    if (target && onNavigateTab) {
      onNavigateTab(target);
      setIsOpen(false);
    }
  };

  const handleAnnouncementClick = (item) => {
    // Hanya pengunjung dan warga yang diarahkan ke daftar panti.
    if (
      item.kategori === 'panti_baru' &&
      (!role || role === 'masyarakat') &&
      onNavigateTab
    ) {
      onNavigateTab('panti');
      setIsOpen(false);
    }
  };

  const handleLoginClick = () => {
    setIsOpen(false);
    if (onOpenLogin) onOpenLogin();
  };

  // ------------------------------------------------------------
  // Tampilan
  // ------------------------------------------------------------

  const tabButtonStyle = (selected) => ({
    flex: 1,
    padding: '0.55rem 0.5rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: selected ? '#1d4ed8' : '#64748b',
    borderBottom: selected ? '2px solid #1d4ed8' : '2px solid transparent',
  });

  const chipStyle = (selected) => ({
    padding: '0.2rem 0.65rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    borderRadius: '9999px',
    cursor: 'pointer',
    border: '1px solid ' + (selected ? '#bfdbfe' : '#e2e8f0'),
    background: selected ? '#eff6ff' : '#ffffff',
    color: selected ? '#1d4ed8' : '#64748b',
  });

  const renderEmpty = (text) => (
    <div
      style={{
        padding: '2rem 1rem',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.82rem',
      }}
    >
      <Inbox size={28} color="#cbd5e1" style={{ marginBottom: '0.4rem' }} />
      <div>{text}</div>
    </div>
  );

  const renderError = (retry) => (
    <div
      style={{
        margin: '0.75rem',
        padding: '0.6rem 0.75rem',
        borderRadius: '10px',
        background: '#fef2f2',
        color: '#b91c1c',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
      }}
    >
      <span>Gagal memuat notifikasi.</span>
      <button
        type="button"
        onClick={retry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          border: 'none',
          background: 'transparent',
          color: '#b91c1c',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: '0.78rem',
        }}
      >
        <RefreshCw size={12} /> Coba lagi
      </button>
    </div>
  );

  const renderItem = ({ key, ui, title, text, time, unread, isNew, clickable, onClick }) => {
    const Icon = ui.icon;

    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          gap: '0.65rem',
          padding: '0.75rem 1rem',
          border: 'none',
          borderBottom: '1px solid #f1f5f9',
          background: unread || isNew ? '#f8fbff' : '#ffffff',
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: ui.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={ui.color} />
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.15rem',
            }}
          >
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: ui.color,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {ui.label}
            </span>
            {(unread || isNew) && (
              <span
                aria-label={unread ? 'Belum dibaca' : 'Baru'}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2563eb',
                }}
              />
            )}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.68rem',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
              }}
            >
              {time}
            </span>
          </span>

          <span
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: unread || isNew ? 700 : 600,
              color: '#0f172a',
            }}
          >
            {title}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: '0.1rem',
              fontSize: '0.78rem',
              color: '#475569',
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {text}
          </span>
        </span>

        {clickable && (
          <ChevronRight
            size={14}
            color="#cbd5e1"
            style={{ flexShrink: 0, alignSelf: 'center' }}
          />
        )}
      </button>
    );
  };

  const renderPersonalList = () => {
    if (!personalLoaded && personal.length === 0 && !personalError) {
      return renderEmpty('Memuat notifikasi...');
    }

    return (
      <>
        {personalError && renderError(loadPersonal)}

        {visiblePersonal.length === 0
          ? !personalError &&
            renderEmpty(
              activeFilter === 'unread'
                ? 'Tidak ada notifikasi yang belum dibaca.'
                : 'Belum ada notifikasi untuk akun Anda.'
            )
          : visiblePersonal.map((item) => {
              const category = inferCategory(item.judul);
              const clickable = Boolean(targetTabFor(role, category));

              return renderItem({
                key: `personal-${item.id}`,
                ui: PERSONAL_UI[category] || PERSONAL_UI.umum,
                title: item.judul,
                text: item.pesan,
                time: formatRelativeTime(item.tanggal_buat),
                unread: !item.is_read,
                clickable,
                onClick: () => handlePersonalClick(item),
              });
            })}
      </>
    );
  };

  const renderAnnouncementList = () => {
    if (!announcementLoaded && announcements.length === 0 && !announcementError) {
      return renderEmpty('Memuat pengumuman...');
    }

    return (
      <>
        {announcementError && renderError(loadAnnouncements)}

        {announcements.length === 0
          ? !announcementError && renderEmpty('Belum ada pengumuman.')
          : announcements.map((item) => {
              const clickable =
                item.kategori === 'panti_baru' &&
                (!role || role === 'masyarakat') &&
                Boolean(onNavigateTab);

              return renderItem({
                key: `announcement-${item.id}`,
                ui: ANNOUNCEMENT_UI[item.kategori] || ANNOUNCEMENT_UI.pengumuman,
                title: item.judul,
                text: item.pesan,
                time: formatRelativeTime(item.tanggal_buat),
                unread: false,
                isNew: Number(item.id) > baselineSeenId,
                clickable,
                onClick: () => handleAnnouncementClick(item),
              });
            })}
      </>
    );
  };

  const showingPersonal = Boolean(role) && activeTab === 'saya';

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        id="btn-halo-notifications"
        onClick={handleToggle}
        aria-label="Lihat Notifikasi"
        aria-expanded={isOpen}
        title={
          badgeCount > 0
            ? `${badgeCount} notifikasi baru`
            : 'Notifikasi'
        }
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          cursor: 'pointer',
          background: isOpen ? '#dbeafe' : '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Bell size={18} color={isOpen ? '#1d4ed8' : '#334155'} />

        {badgeCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              fontSize: '10px',
              fontWeight: 800,
              color: '#ffffff',
              backgroundColor: '#dc2626',
              borderRadius: '9999px',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="popover-halo-notifications"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow:
              '0 20px 35px -8px rgba(15, 23, 42, 0.2), 0 0 1px rgba(15, 23, 42, 0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          {/* Judul */}
          <div
            style={{
              padding: '0.8rem 1rem',
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Notifikasi
            </h4>

            {showingPersonal && personalUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#1d4ed8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <CheckCheck size={14} /> Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Tab: hanya untuk pengguna yang sudah login */}
          {role && (
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setActiveTab('saya')}
                style={tabButtonStyle(activeTab === 'saya')}
              >
                Untuk Saya{personalUnread > 0 ? ` (${personalUnread})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('umum')}
                style={tabButtonStyle(activeTab === 'umum')}
              >
                Pengumuman
                {announcementUnseen > 0 ? ` (${announcementUnseen})` : ''}
              </button>
            </div>
          )}

          {showingPersonal && (
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveFilter('semua')}
                style={chipStyle(activeFilter === 'semua')}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                style={chipStyle(activeFilter === 'unread')}
              >
                Belum dibaca
              </button>
            </div>
          )}

          {/* Daftar */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {showingPersonal ? renderPersonalList() : renderAnnouncementList()}
          </div>

          {/* Ajakan login untuk pengunjung */}
          {!role && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={handleLoginClick}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <LogIn size={14} /> Masuk untuk melihat notifikasi akun Anda
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
