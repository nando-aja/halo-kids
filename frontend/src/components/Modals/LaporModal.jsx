import React, { useRef, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Lock, Upload, ArrowRight, ArrowLeft, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import pengaduanService, { createReportSubmissionKey } from '../../api/pengaduanService';

export default function LaporModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submitLock = useRef(false);
  const submissionKey = useRef(createReportSubmissionKey());
  const [formData, setFormData] = useState({
    jenisKejadian: 'Kekerasan Fisik / Verbal',
    lokasi: '',
    tanggal: '',
    deskripsi: '',
    isAnonymous: true,
    namaPelapor: '',
    kontak: '',
    berkas: null
  });
  const [submittedTicket, setSubmittedTicket] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current || isSubmitting || submittedTicket) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const combined = `[Kategori]: ${formData.jenisKejadian} | [Lokasi]: ${formData.lokasi} | [Tanggal]: ${formData.tanggal} | [Pelapor]: ${formData.isAnonymous ? 'Anonim' : `${formData.namaPelapor} (${formData.kontak})`} | [Kronologi]: ${formData.deskripsi}`;
      const res = await pengaduanService.createPengaduan({
        isi_laporan: combined,
        jenis_laporan: formData.jenisKejadian,
        submission_key: submissionKey.current,
        files: formData.berkas ? [formData.berkas] : [],
      });
      if (!res?.kode_tiket) {
        throw new Error('Server belum mengonfirmasi penyimpanan laporan. Kode tiket tidak diterima.');
      }
      setSubmittedTicket(res.kode_tiket);
      setStep(4);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('halokids:data_updated', { detail: { type: 'pengaduan' } }));
      }
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}
    } catch (err) {
      console.error('Pengiriman pengaduan gagal:', err);
      setSubmitError(err?.friendlyMessage || err?.message || 'Pengiriman gagal. Laporan belum dikonfirmasi tersimpan.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSubmittedTicket(null);
    setSubmitError('');
    setFormData({
      jenisKejadian: 'Kekerasan Fisik / Verbal',
      lokasi: '',
      tanggal: '',
      deskripsi: '',
      isAnonymous: true,
      namaPelapor: '',
      kontak: '',
      berkas: null
    });
    submissionKey.current = createReportSubmissionKey();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1f5c 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldAlert size={22} color="#fca5a5" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Formulir Pengaduan Pelindungan Anak</h3>
              <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>Respon Cepat Tim TRC Dinsos 24 Jam</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Steps Indicator */}
        {step < 4 && (
          <div style={{
            padding: '0.85rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748b'
          }}>
            <span style={{ color: step >= 1 ? '#1d4ed8' : '#64748b' }}>1. Jenis Kejadian</span>
            <span>→</span>
            <span style={{ color: step >= 2 ? '#1d4ed8' : '#64748b' }}>2. Lokasi & Detail</span>
            <span>→</span>
            <span style={{ color: step >= 3 ? '#1d4ed8' : '#64748b' }}>3. Kerahasiaan Data</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0b1f5c' }}>Pilih Kategori Kejadian</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { title: 'Kekerasan Fisik / Verbal', desc: 'Perlakuan kasar, ancaman, penganiayaan pada anak' },
                  { title: 'Eksploitasi & Penelantaran', desc: 'Eksploitasi ekonomi/pekerja anak, tidak diberi pengasuhan' },
                  { title: 'Kekerasan Seksual', desc: 'Tindakan pelecehan atau kejahatan seksual anak' },
                  { title: 'Bullying / Perundungan', desc: 'Kekerasan psikologis terencana di sekolah/lingkungan' }
                ].map((item) => (
                  <label 
                    key={item.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      border: formData.jenisKejadian === item.title ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      background: formData.jenisKejadian === item.title ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="jenisKejadian"
                      checked={formData.jenisKejadian === item.title}
                      onChange={() => setFormData({ ...formData, jenisKejadian: item.title })}
                    />
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#0b1f5c', display: 'block' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.775rem', color: '#64748b' }}>{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <button 
                onClick={() => setStep(2)}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Lanjut ke Detail Kejadian <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0b1f5c' }}>Lokasi & Kronologi Singkat</h4>
              
              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Lokasi Kejadian (Kecamatan / Desa / Jalan)*
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Jl. Mayor Oking No. 12, Cibinong"
                  value={formData.lokasi}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Deskripsi / Kronologi Kejadian*
                </label>
                <textarea 
                  rows={4}
                  placeholder="Jelaskan kondisi anak dan indikasi ancaman keselamatan yang terjadi..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ border: '2px dashed #cbd5e1', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', background: '#f8fafc' }}>
                <Upload size={24} color="#64748b" style={{ marginBottom: '0.35rem' }} />
                <label htmlFor="lapor-modal-evidence" style={{ fontSize: '0.8rem', color: '#1d4ed8', display: 'block', fontWeight: 700, cursor: 'pointer' }}>
                  {formData.berkas ? formData.berkas.name : 'Pilih foto atau dokumen bukti (opsional)'}
                </label>
                <input
                  id="lapor-modal-evidence"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    const allowed = file && (
                      ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) ||
                      /\.(jpe?g|png|pdf)$/i.test(file.name)
                    );
                    if (file && !allowed) {
                      setSubmitError('Format lampiran harus JPG, PNG, atau PDF.');
                      setFormData((prev) => ({ ...prev, berkas: null }));
                    } else if (file && file.size > 10 * 1024 * 1024) {
                      setSubmitError('Ukuran lampiran maksimal 10 MB.');
                      setFormData((prev) => ({ ...prev, berkas: null }));
                    } else {
                      setSubmitError('');
                      setFormData((prev) => ({ ...prev, berkas: file }));
                    }
                    event.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                  JPG, PNG, atau PDF maksimal 10 MB. File akan diunggah ke Supabase privat saat laporan dikirim.
                </span>
                {formData.berkas && (
                  <button type="button" onClick={() => setFormData((prev) => ({ ...prev, berkas: null }))} style={{ marginTop: '0.4rem', border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Hapus lampiran
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button 
                  onClick={() => setStep(3)} 
                  disabled={!formData.lokasi || !formData.deskripsi}
                  className="btn btn-primary" 
                  style={{ flex: 1, opacity: (!formData.lokasi || !formData.deskripsi) ? 0.6 : 1 }}
                >
                  Lanjut Identitas <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {submitError && (
                <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', padding: '0.75rem 0.9rem', fontSize: '0.85rem' }}>
                  <strong>Belum terkirim:</strong> {submitError}
                </div>
              )}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <Lock size={24} color="#1d4ed8" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, lineHeight: 1.4 }}>
                  <strong>Jaminan Kerahasiaan 100% Anonim:</strong> Identitas pelapor dilindungi Undang-Undang Perlindungan Saksi & Korban (LPSK). Data hanya dapat diakses Satgas TRC Dinsos.
                </p>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#f8fafc',
                padding: '0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer'
              }}>
                <input 
                  type="checkbox"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0b1f5c' }}>
                  Kirim sebagai Laporan Anonim (Sembunyikan Identitas Saya)
                </span>
              </label>

              {!formData.isAnonymous && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input 
                    type="text" 
                    placeholder="Nama Lengkap Pelapor"
                    value={formData.namaPelapor}
                    onChange={(e) => setFormData({ ...formData, namaPelapor: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Nomor Telepon / WhatsApp Aktif"
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>
                  <ArrowLeft size={16} /> Kembali
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-emergency" style={{ flex: 1.2, opacity: isSubmitting ? 0.65 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}>
                  <ShieldAlert size={16} /> {isSubmitting ? 'Mengirim laporan...' : 'Kirim Pengaduan Sekarang'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                background: '#dcfce7',
                color: '#15803d',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0b1f5c', marginBottom: '0.35rem' }}>
                  Laporan Berhasil Terkirim!
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', maxWidth: '450px', margin: '0 auto' }}>
                  Tim Satgas TRC Dinsos telah menerima laporan Anda. Verifikasi dan penanganan segera diproses. Simpan Kode Tiket Anda di bawah ini:
                </p>
              </div>

              <div style={{
                background: '#f1f5f9',
                border: '2px dashed #1d4ed8',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Ticket size={24} color="#1d4ed8" />
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0b1f5c', letterSpacing: '0.08em' }}>
                  {submittedTicket}
                </span>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Gunakan kode tiket di atas pada menu <strong>"Lacak Status Tiket"</strong> untuk memantau progres lapangan.
              </p>

              <button onClick={handleReset} className="btn btn-primary" style={{ width: '100%', maxWidth: '280px', marginTop: '0.5rem' }}>
                Tutup & Kembali ke Beranda
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
