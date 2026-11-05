import React, { useEffect, useState } from 'react';

import {
  X,
  FileText,
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  Clock
} from 'lucide-react';

import donasiService from '../../api/donasiService';


export default function DonationProofReview({
  donation,
  onClose,
  onAnalyze,
  analyzing = false,
  onApprove,
  onReject,
  saving = false
}) {

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // ==========================================
  // LOAD PRIVATE PROOF FROM BACKEND
  // ==========================================

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function loadProof() {

      if (!donation?.bukti_transfer) {
        setPreviewUrl('');
        setPreviewType('');
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError('');

      try {

        const blob = await donasiService.getAdminFile(
          donation.bukti_transfer
        );

        if (!active) return;

        objectUrl = URL.createObjectURL(blob);

        setPreviewUrl(objectUrl);
        setPreviewType(blob.type || '');

      } catch (err) {

        if (!active) return;

        setPreviewError(
          err?.friendlyMessage ||
          err?.message ||
          'Bukti transfer gagal dimuat.'
        );

      } finally {

        if (active) {
          setPreviewLoading(false);
        }

      }
    }

    loadProof();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

  }, [donation?.rawId, donation?.bukti_transfer]);


  if (!donation) return null;


  // ==========================================
  // AI RESULT
  // ==========================================

  let aiResult = donation.hasil_analisis_ai || null;

  if (typeof aiResult === 'string') {
    try {
      aiResult = JSON.parse(aiResult);
    } catch {
      aiResult = null;
    }
  }

  const structured = aiResult?.structured || {};

  const detectedAmount =
    aiResult?.nominal_terdeteksi_angka ??
    structured?.nominal_terdeteksi ??
    '-';

  const nominalMatch = aiResult?.nominal_donasi_cocok;

  const anomalies = Array.isArray(aiResult?.anomalies)
    ? aiResult.anomalies
    : [];

  const isPending = donation.status === 'menunggu';


  const formatNominal = (value) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return `Rp ${Number(value).toLocaleString('id-ID')}`;
  };


  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15,23,42,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
        }}
      >

        {/* HEADER */}
        <div
          style={{
            background: '#10265f',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 2
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                margin: 0
              }}
            >
              Review Bukti Transfer Donasi
            </h2>

            <span
              style={{
                fontSize: '0.78rem',
                color: '#bfdbfe'
              }}
            >
              Transaksi DNS-{donation.rawId}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>


        {/* BODY */}
        <div
          style={{
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)',
            gap: '1.25rem'
          }}
          className="donation-review-grid"
        >

          {/* LEFT: FILE PREVIEW */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              minWidth: 0
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#0b1f5c',
                marginTop: 0
              }}
            >
              <FileText
                size={17}
                style={{
                  display: 'inline',
                  marginRight: '0.4rem'
                }}
              />
              Bukti Pembayaran
            </h3>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {previewLoading ? (
                <RefreshCw className="spin" color="#2563eb" />
              ) : previewError ? (
                <p style={{ color: '#dc2626', padding: '1rem' }}>
                  {previewError}
                </p>
              ) : !previewUrl ? (
                <p style={{ color: '#64748b' }}>
                  Bukti transfer tidak tersedia.
                </p>
              ) : previewType.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt="Bukti transfer donasi"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '520px',
                    objectFit: 'contain'
                  }}
                />
              ) : previewType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title="Bukti transfer PDF"
                  style={{
                    border: 0,
                    width: '100%',
                    height: '480px'
                  }}
                />
              ) : (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka bukti pembayaran
                </a>
              )}
            </div>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#2563eb',
                  fontSize: '0.8rem',
                  marginTop: '0.75rem'
                }}
              >
                <Eye size={15} />
                Buka file penuh
              </a>
            )}
          </div>


          {/* RIGHT: TRANSACTION + AI */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: 0
            }}
          >

            {/* TRANSACTION DETAIL */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem'
              }}
            >
              <h3
                style={{
                  color: '#0b1f5c',
                  fontSize: '0.95rem',
                  margin: '0 0 1rem'
                }}
              >
                Detail Transaksi
              </h3>

              {[
                ['Nomor transaksi', `DNS-${donation.rawId}`],
                ['Donatur', donation.donor],
                ['Panti tujuan', donation.panti],
                ['Nominal pengajuan', donation.amount],
                ['Tanggal', donation.date]
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    fontSize: '0.8rem',
                    marginBottom: '0.65rem'
                  }}
                >
                  <span style={{ color: '#64748b' }}>
                    {label}
                  </span>

                  <strong
                    style={{
                      color: '#0b1f5c',
                      textAlign: 'right',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {value || '-'}
                  </strong>
                </div>
              ))}
            </div>


            {/* AI RESULT */}
            <div
              style={{
                border: '1px solid #c7d2fe',
                background: '#f5f7ff',
                borderRadius: '12px',
                padding: '1rem'
              }}
            >
              <h3
                style={{
                  fontSize: '0.95rem',
                  color: '#312e81',
                  margin: '0 0 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Bot size={20} />
                AI Verification Result
              </h3>

              {!aiResult ? (
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.8rem'
                  }}
                >
                  Bukti belum dianalisis oleh AI.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      fontSize: '0.8rem',
                      marginBottom: '0.65rem'
                    }}
                  >
                    <span>Nominal pengajuan</span>
                    <strong>{donation.amount}</strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      fontSize: '0.8rem',
                      marginBottom: '0.65rem'
                    }}
                  >
                    <span>Nominal terbaca OCR</span>
                    <strong>{formatNominal(detectedAmount)}</strong>
                  </div>

                  <div
                    style={{
                      borderRadius: '9px',
                      padding: '0.75rem',
                      background: nominalMatch === true
                        ? '#dcfce7'
                        : '#fef3c7',
                      color: nominalMatch === true
                        ? '#166534'
                        : '#92400e',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}
                  >
                    {nominalMatch === true
                      ? '✓ Nominal sesuai'
                      : nominalMatch === false
                        ? '⚠ Nominal tidak sesuai'
                        : 'Perlu pemeriksaan manual'}
                  </div>

                  {anomalies.length > 0 && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <strong
                        style={{
                          color: '#92400e',
                          fontSize: '0.8rem'
                        }}
                      >
                        Catatan AI:
                      </strong>

                      {anomalies.map((item, index) => (
                        <p
                          key={index}
                          style={{
                            color: '#92400e',
                            fontSize: '0.75rem',
                            margin: '0.35rem 0'
                          }}
                        >
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}

              <button
                onClick={onAnalyze}
                disabled={analyzing || !donation.bukti_transfer}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '9px',
                  background: '#3730a3',
                  color: '#ffffff',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  marginTop: '1rem',
                  opacity: analyzing ? 0.6 : 1
                }}
              >
                {analyzing
                  ? 'AI Sedang Menganalisis...'
                  : 'Jalankan Analisis AI'}
              </button>

              <p
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  lineHeight: 1.5,
                  marginBottom: 0
                }}
              >
                AI hanya memberikan rekomendasi berdasarkan
                hasil OCR. Admin tetap wajib memeriksa
                penerimaan dana dan menentukan keputusan akhir.
              </p>
            </div>


            {/* FINAL STATUS */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Status transaksi
              </span>

              <strong
                style={{
                  fontSize: '0.75rem',
                  color: donation.status === 'terverifikasi'
                    ? '#15803d'
                    : donation.status === 'ditolak'
                      ? '#dc2626'
                      : '#d97706'
                }}
              >
                {donation.status === 'terverifikasi'
                  ? 'TERVERIFIKASI'
                  : donation.status === 'ditolak'
                    ? 'DITOLAK'
                    : 'MENUNGGU'}
              </strong>
            </div>

          </div>
        </div>


        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="btn btn-secondary"
          >
            Tutup
          </button>

          {isPending && (
            <>
              <button
                onClick={onReject}
                disabled={saving}
                style={{
                  border: 'none',
                  borderRadius: '9px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <XCircle
                  size={15}
                  style={{
                    display: 'inline',
                    marginRight: '0.35rem'
                  }}
                />
                Tolak
              </button>

              <button
                onClick={onApprove}
                disabled={saving || !donation.bukti_transfer}
                style={{
                  border: 'none',
                  borderRadius: '9px',
                  background: '#15803d',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck
                  size={15}
                  style={{
                    display: 'inline',
                    marginRight: '0.35rem'
                  }}
                />
                {saving ? 'Menyimpan...' : 'Setujui Donasi'}
              </button>
            </>
          )}
        </div>

      </div>

      <style>
        {`
          @media (max-width: 720px) {
            .donation-review-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

    </div>
  );
}