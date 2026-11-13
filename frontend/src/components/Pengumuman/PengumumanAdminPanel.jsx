import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, RefreshCw, Send, EyeOff } from 'lucide-react';

import notificationService from '../../api/notificationService';
import { formatRelativeTime } from '../../utils/notificationHelpers';

const CATEGORY_OPTIONS = [
  { value: 'pembaruan', label: 'Pembaruan web' },
  { value: 'pengumuman', label: 'Pengumuman umum' },
  { value: 'panti_baru', label: 'Panti baru' },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

const EMPTY_FORM = { judul: '', pesan: '', kategori: 'pembaruan' };

function getErrorMessage(error) {
  return (
    error?.friendlyMessage ||
    error?.response?.data?.detail ||
    error?.message ||
    'Terjadi kesalahan.'
  );
}

/**
 * Panel Super Admin untuk menulis pengumuman publik.
 * Pengumuman muncul di lonceng semua pengunjung, termasuk yang belum login.
 * (Panti yang baru disetujui diumumkan otomatis oleh sistem.)
 */
export default function PengumumanAdminPanel() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  // Kunci sinkron agar klik ganda tidak mengirim pengumuman dua kali.
  const sendLockRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setItems(await notificationService.adminListAnnouncements());
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sendLockRef.current) return;

    const judul = form.judul.trim();
    const pesan = form.pesan.trim();

    if (judul.length < 3 || pesan.length < 3) {
      setMessage({
        type: 'error',
        text: 'Judul dan isi pengumuman minimal 3 karakter.',
      });
      return;
    }

    sendLockRef.current = true;
    setSending(true);
    setMessage(null);

    try {
      await notificationService.adminCreateAnnouncement({
        judul,
        pesan,
        kategori: form.kategori,
      });

      setForm(EMPTY_FORM);
      setMessage({ type: 'success', text: 'Pengumuman berhasil diterbitkan.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan pengumuman "${item.judul}"?`)) return;

    try {
      await notificationService.adminDeactivateAnnouncement(item.id);
      setMessage({ type: 'success', text: 'Pengumuman dinonaktifkan.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0b1f5c',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Megaphone size={22} /> Pengumuman Publik
        </h2>
        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Tampil di lonceng notifikasi semua pengunjung portal, termasuk yang
          belum login. Jangan memuat data pribadi. Panti yang baru disetujui
          diumumkan otomatis oleh sistem.
        </p>
      </div>

      {message && (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            fontSize: '0.84rem',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#047857' : '#b91c1c',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
            Kategori
          </label>
          <select
            value={form.kategori}
            onChange={handleChange('kategori')}
            disabled={sending}
            style={fieldStyle}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
            Judul
          </label>
          <input
            type="text"
            value={form.judul}
            onChange={handleChange('judul')}
            maxLength={150}
            disabled={sending}
            placeholder="Contoh: Fitur donasi barang kini tersedia"
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
            Isi pengumuman ({form.pesan.length}/500)
          </label>
          <textarea
            value={form.pesan}
            onChange={handleChange('pesan')}
            maxLength={500}
            rows={3}
            disabled={sending}
            placeholder="Tulis informasi singkat untuk masyarakat."
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={sending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              border: 'none',
              background: '#1d4ed8',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.6 : 1,
            }}
          >
            <Send size={14} /> {sending ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}
          </button>
        </div>
      </form>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.6rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
          Riwayat Pengumuman
        </h3>
        <button
          type="button"
          onClick={load}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            border: 'none',
            background: 'transparent',
            color: '#1d4ed8',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Muat ulang
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Memuat...</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Belum ada pengumuman.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: item.aktif ? '#ffffff' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.8rem 1rem',
                opacity: item.aktif ? 1 : 0.65,
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                  {CATEGORY_LABEL[item.kategori] || item.kategori}
                  {' · '}
                  {formatRelativeTime(item.tanggal_buat)}
                  {!item.aktif && ' · Nonaktif'}
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {item.judul}
                </div>
                <div
                  style={{
                    color: '#475569',
                    fontSize: '0.82rem',
                    marginTop: '0.15rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.pesan}
                </div>
              </div>

              {item.aktif && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(item)}
                  title="Nonaktifkan pengumuman"
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    borderRadius: '8px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <EyeOff size={13} /> Nonaktifkan
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
