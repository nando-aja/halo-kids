import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Info,
  ListChecks,
  UserCheck,
  ScanText,
  Code2,
  Bot,
} from 'lucide-react';

/**
 * Tampilan hasil analisis AI untuk pengajuan COTA/Adopsi (sisi admin Dinsos).
 * Menggantikan dump JSON mentah dengan ringkasan yang bisa dibaca petugas.
 * Input: objek `hasil_ekstraksi_ai` dari backend (COTADocumentAgent.run).
 */

export const DOC_LABELS = {
  ktp: 'KTP Pemohon',
  kk: 'Kartu Keluarga (KK)',
  akta_kelahiran: 'Akta Kelahiran',
  buku_nikah: 'Buku / Akta Nikah',
  skck: 'SKCK Kepolisian',
  surat_sehat: 'Surat Keterangan Sehat',
  surat_kesehatan_jiwa: 'Surat Kesehatan Jiwa',
  fungsi_reproduksi: 'Surat Fungsi Reproduksi',
  surat_penghasilan: 'Surat Penghasilan',
  pernyataan_resmi: 'Surat Pernyataan Resmi',
  persetujuan_keluarga: 'Persetujuan Keluarga',
  dokumen_caa: 'Dokumen CAA',
  laporan_sosial: 'Laporan Sosial',
  pas_foto: 'Pas Foto',
  foto_rumah: 'Foto Rumah',
  dokumen_lainnya: 'Dokumen Lainnya',
};

const INITIAL_DOCS = ['ktp', 'kk', 'akta_kelahiran', 'buku_nikah', 'skck', 'surat_sehat'];
const PHOTO_DOCS = new Set(['pas_foto', 'foto_rumah']);

const EXTRACTION_LABELS = {
  pdf_text: 'Teks langsung dari PDF',
  pdf_ocr: 'OCR Tesseract pada PDF scan',
  pdf_rapidocr: 'OCR RapidOCR pada PDF scan',
  image_ocr: 'OCR Tesseract pada gambar',
  image_rapidocr: 'OCR RapidOCR pada gambar',
  image_ocr_unavailable: 'OCR gambar tidak tersedia / gagal',
  pdf_ocr_unavailable: 'OCR PDF tidak tersedia / gagal',
  pdf_error: 'PDF gagal dibuka',
  unsupported: 'Format berkas tidak didukung',
  unavailable: 'Pembaca berkas tidak tersedia',
};

export const labelDokumen = (key) =>
  DOC_LABELS[key] ||
  String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Terima objek atau string JSON dari backend, kembalikan objek atau null. */
export function parseAiResult(source) {
  if (source == null || source === '') return null;
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof source === 'object' ? source : null;
}

/** Ringkasan angka yang dipakai header & panel. Backend tidak mengirim skor confidence. */
export function summarizeAiResult(result) {
  const docs = result?.documents && typeof result.documents === 'object' ? result.documents : {};
  const entries = Object.entries(docs);
  const checked = Number(result?.documents_checked) || entries.length;
  const found = entries.length;
  const photoFound = entries.filter(([key]) => PHOTO_DOCS.has(key)).length;
  const textEntries = entries.filter(([key]) => !PHOTO_DOCS.has(key));
  const readable = textEntries.filter(([, doc]) => doc?.text_found).length;
  const valid = textEntries.filter(
    ([, doc]) => doc?.text_found && doc?.content_validation?.matched !== false
  ).length;
  const denominator = Math.max(1, checked - photoFound);
  const anomalies = Array.isArray(result?.anomalies) ? result.anomalies : [];
  const percent = checked > 0 ? Math.min(100, Math.round((valid / denominator) * 100)) : null;
  return { checked, found, readable, valid, percent, anomalies };
}

/** Ubah pesan teknis backend menjadi kalimat yang jelas bagi petugas. */
function translateAnomaly(raw) {
  const text = String(raw || '');
  let m;
  if ((m = text.match(/^File tidak ditemukan: (.+)$/))) {
    return {
      level: 'error',
      title: `Berkas ${labelDokumen(m[1])} tidak ditemukan di penyimpanan`,
      hint: 'Path tercatat di database, tetapi file-nya tidak ada di Supabase/storage. Minta pemohon mengunggah ulang.',
    };
  }
  if ((m = text.match(/^Penyimpanan Supabase belum dikonfigurasi, berkas tidak bisa dibaca: (.+)$/))) {
    return {
      level: 'error',
      title: `Berkas ${labelDokumen(m[1])} tidak bisa dibaca: Supabase belum dikonfigurasi`,
      hint: 'Periksa SUPABASE_URL, SUPABASE_SECRET_KEY, dan nama bucket di backend/.env, lalu jalankan scripts/cek_cota_storage.py.',
    };
  }
  if ((m = text.match(/^Path dokumen tidak valid: (.+)$/))) {
    return {
      level: 'error',
      title: `Berkas ${labelDokumen(m[1])} tidak bisa dibuka`,
      hint: 'Path salah atau berkas tidak ada di penyimpanan (hasil lama). Jalankan “Analisis Ulang AI”, atau minta pemohon mengunggah ulang.',
    };
  }
  if ((m = text.match(/^OCR\/ekstraksi gagal pada dokumen ([^:]+): ?(.*)$/))) {
    return {
      level: 'warn',
      title: `Teks pada ${labelDokumen(m[1])} gagal dibaca`,
      hint: m[2] || 'Periksa instalasi Tesseract/RapidOCR di backend, atau minta foto yang lebih jelas.',
    };
  }
  if ((m = text.match(/^Teks tidak berhasil diekstraksi dari dokumen: (.+)$/))) {
    return {
      level: 'warn',
      title: `Tidak ada teks terbaca pada ${labelDokumen(m[1])}`,
      hint: 'Gambar mungkin buram, gelap, atau bukan dokumen. Periksa berkas asli.',
    };
  }
  if ((m = text.match(/^Isi dokumen (.+?) tidak cukup sesuai/))) {
    return {
      level: 'warn',
      title: `Isi ${labelDokumen(m[1])} tidak sesuai jenis dokumen`,
      hint: 'Kata kunci khas dokumen ini tidak ditemukan. Mungkin salah unggah.',
    };
  }
  if (/^NIK 16 digit tidak terdeteksi/.test(text)) {
    return { level: 'warn', title: 'NIK 16 digit tidak terbaca pada KTP', hint: 'Cocokkan NIK secara manual dengan berkas asli.' };
  }
  if (/^Nama pada KTP tidak cukup cocok/.test(text)) {
    return { level: 'warn', title: 'Nama pada KTP berbeda dengan nama pemohon', hint: 'Bandingkan ejaan nama di KTP dan di formulir.' };
  }
  if (/^Nama pada KTP tidak terbaca/.test(text)) {
    return { level: 'warn', title: 'Nama pada KTP tidak terbaca OCR', hint: 'Perlu dicek manual.' };
  }
  if (/^Tanggal lahir pada KTP tidak cocok/.test(text)) {
    return { level: 'warn', title: 'Tanggal lahir pada KTP berbeda dengan data pengajuan', hint: 'Cek tanggal lahir yang diisi pemohon dan yang tertera di KTP.' };
  }
  return { level: 'warn', title: text, hint: '' };
}

function Badge({ tone, children }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    red: 'bg-rose-100 text-rose-800 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
      <Icon size={15} className="text-indigo-600" /> {children}
    </h4>
  );
}

function MatchRow({ label, value }) {
  const state = value === true ? 'ok' : value === false ? 'bad' : 'na';
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <span className="font-semibold text-slate-700">{label}</span>
      {state === 'ok' && <Badge tone="green"><CheckCircle2 size={11} /> Cocok</Badge>}
      {state === 'bad' && <Badge tone="red"><XCircle size={11} /> Tidak cocok</Badge>}
      {state === 'na' && <Badge tone="slate">Belum bisa dibandingkan</Badge>}
    </div>
  );
}

export default function CotaAiResultPanel({ result, onSelectDocument, selectedDocumentKey }) {
  if (!result) return null;

  const summary = summarizeAiResult(result);
  const docs = result.documents && typeof result.documents === 'object' ? result.documents : {};
  const docEntries = Object.entries(docs);
  const completeness = result.kelengkapan_dokumen || {};
  const sudahAda = new Set(completeness.sudah_ada || []);
  const belumAda = completeness.belum_ada || [];
  const matching = result.database_matching || {};
  const needsReview = Boolean(result.requires_manual_review);
  const translated = summary.anomalies.map(translateAnomaly);
  const allMissing =
    summary.checked > 0 && summary.found === 0 && summary.anomalies.some((a) => /^(File tidak ditemukan|Path dokumen tidak valid|Penyimpanan Supabase belum)/.test(a));

  const checklistKeys = [...INITIAL_DOCS, ...[...sudahAda, ...belumAda].filter((key) => !INITIAL_DOCS.includes(key))];
  const uniqueKeys = [...new Set(checklistKeys)];

  const barColor = summary.percent == null ? 'bg-slate-300' : summary.percent >= 80 ? 'bg-emerald-500' : summary.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="space-y-4">
      {/* Keputusan ringkas */}
      <div className={`rounded-xl border p-4 ${needsReview ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
        <div className="flex items-start gap-3">
          {needsReview ? <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-600" /> : <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />}
          <div className="text-xs">
            <h4 className={`text-sm font-black ${needsReview ? 'text-amber-900' : 'text-emerald-900'}`}>
              {needsReview ? 'Perlu tinjauan manual' : 'AI tidak menemukan anomali'}
            </h4>
            <p className={`mt-1 leading-relaxed ${needsReview ? 'text-amber-800' : 'text-emerald-800'}`}>
              {needsReview
                ? `AI menandai ${summary.anomalies.length} temuan di bawah. Periksa berkas asli sebelum memutuskan.`
                : 'Semua berkas yang diperiksa terbaca dan sesuai data pengajuan.'}{' '}
              AI hanya alat bantu; keputusan akhir tetap di tangan petugas Dinsos.
            </p>
          </div>
        </div>
      </div>

      {allMissing && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
          <strong className="block text-sm">Tidak ada satu pun berkas fisik yang ditemukan</strong>
          <p className="mt-1 leading-relaxed">
            Pengajuan ini mencatat path berkas, tetapi file-nya tidak ada di Supabase maupun folder lokal. Biasanya terjadi
            pada pengajuan yang dibuat dari form lama (path contoh seperti <code>ktp_sample.jpg</code>) tanpa unggahan berkas
            sungguhan. Minta pemohon membuat pengajuan baru dengan berkas asli, atau pakai tombol “Minta Unggah Ulang”.
          </p>
        </div>
      )}

      {/* Angka ringkas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Dokumen diperiksa" value={summary.checked} />
        <Tile label="Berkas ditemukan" value={`${summary.found}/${summary.checked}`} />
        <Tile label="Teks terbaca" value={summary.readable} sub="dokumen berisi teks" />
        <Tile label="Temuan AI" value={summary.anomalies.length} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700">Skor keterbacaan dokumen</span>
          <span className="font-black text-slate-900">{summary.percent == null ? '—' : `${summary.percent}%`}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${summary.percent ?? 0}%` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Persentase dokumen yang berkasnya ditemukan, teksnya terbaca, dan isinya sesuai jenis dokumen. Ini bukan skor akurasi OCR.
        </p>
      </div>

      {/* Temuan */}
      {translated.length > 0 && (
        <section>
          <SectionTitle icon={AlertTriangle}>Temuan yang perlu dicek</SectionTitle>
          <ul className="space-y-1.5">
            {translated.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className={`rounded-lg border p-2.5 text-xs ${item.level === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
              >
                <div className="flex items-start gap-2">
                  {item.level === 'error' ? <XCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                  <div>
                    <div className="font-bold">{item.title}</div>
                    {item.hint && <div className="mt-0.5 text-[11px] opacity-90">{item.hint}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Kelengkapan */}
      {uniqueKeys.length > 0 && (
        <section>
          <SectionTitle icon={ListChecks}>Kelengkapan dokumen</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {uniqueKeys.map((key) => {
              const recorded = sudahAda.has(key);
              const physical = Object.prototype.hasOwnProperty.call(docs, key);
              const isInitial = INITIAL_DOCS.includes(key);
              let badge;
              if (recorded && physical) {
                const doc = docs[key];
                if (PHOTO_DOCS.has(key)) badge = <Badge tone="green"><CheckCircle2 size={11} /> Ada</Badge>;
                else if (!doc?.text_found) badge = <Badge tone="amber"><AlertTriangle size={11} /> Ada, teks tidak terbaca</Badge>;
                else if (doc?.content_validation?.matched === false) badge = <Badge tone="amber"><AlertTriangle size={11} /> Ada, isi tidak sesuai</Badge>;
                else badge = <Badge tone="green"><CheckCircle2 size={11} /> Ada &amp; terbaca</Badge>;
              } else if (recorded) badge = <Badge tone="red"><XCircle size={11} /> Tercatat, berkas hilang</Badge>;
              else if (isInitial) badge = <Badge tone="red"><XCircle size={11} /> Belum ada</Badge>;
              else badge = <Badge tone="slate">Belum diunggah</Badge>;
              return (
                <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    {labelDokumen(key)}
                    {!isInitial && <span className="ml-1 text-[10px] font-normal text-slate-400">(tambahan)</span>}
                  </span>
                  {badge}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pencocokan data */}
      <section>
        <SectionTitle icon={UserCheck}>Pencocokan KTP dengan data pengajuan</SectionTitle>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <MatchRow label="Nama di KTP = nama pemohon" value={matching.name_match ?? null} />
          <MatchRow label="Tanggal lahir di KTP = data pengajuan" value={matching.birth_date_match ?? null} />
        </div>
      </section>

      {/* Per dokumen */}
      {docEntries.length > 0 && (
        <section>
          <SectionTitle icon={ScanText}>Hasil baca per dokumen</SectionTitle>
          <div className="space-y-2">
            {docEntries.map(([key, doc]) => {
              const isPhoto = PHOTO_DOCS.has(key);
              const contentBad = doc?.content_validation && doc.content_validation.matched === false;
              let status;
              if (isPhoto) status = <Badge tone="slate">Berkas foto</Badge>;
              else if (!doc?.text_found) status = <Badge tone="red">Teks tidak terbaca</Badge>;
              else if (contentBad) status = <Badge tone="amber">Isi tidak sesuai</Badge>;
              else status = <Badge tone="green">Terbaca</Badge>;

              const fields = [
                ['Nama terbaca', doc?.nama_terdeteksi],
                ['NIK terbaca', doc?.nik_terdeteksi],
                ['Tanggal lahir', doc?.tanggal_lahir_terdeteksi],
                ['Tanggal lain', Array.isArray(doc?.tanggal_terdeteksi) && doc.tanggal_terdeteksi.length ? doc.tanggal_terdeteksi.join(', ') : null],
                ['Nominal', doc?.nominal_terdeteksi],
                ['No. referensi', doc?.nomor_referensi_terdeteksi],
              ].filter(([, value]) => value);

              const matched = doc?.content_validation?.matched_keywords || [];
              const isSelected = selectedDocumentKey === key;

              return (
                <div key={key} className={`rounded-xl border bg-white p-3 text-xs ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <FileText size={14} className="text-slate-500" /> {labelDokumen(key)} {status}
                    </div>
                    {onSelectDocument && (
                      <button
                        type="button"
                        onClick={() => onSelectDocument(key)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye size={12} /> Lihat berkas
                      </button>
                    )}
                  </div>

                  {fields.length > 0 ? (
                    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                      {fields.map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
                          <dd className="break-all font-semibold text-slate-900">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    !isPhoto && <p className="mt-2 text-slate-500">Tidak ada data terstruktur yang berhasil diambil dari dokumen ini.</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>Metode: {EXTRACTION_LABELS[doc?.extraction_method] || doc?.extraction_method || '—'}</span>
                    {!isPhoto && <span>Kata kunci cocok: {matched.length ? matched.join(', ') : 'tidak ada'}</span>}
                  </div>

                  {doc?.ringkasan_teks && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-bold text-indigo-800">Cuplikan teks hasil baca</summary>
                      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[10px] text-slate-700">{doc.ringkasan_teks}</pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Info agen + JSON untuk developer */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><Bot size={12} /> {result.agent || 'Agen AI'}</span>
          {result.mode && <span>Mode: {String(result.mode)}</span>}
        </div>
        <details className="mt-2">
          <summary className="inline-flex cursor-pointer items-center gap-1 font-bold text-slate-700"><Code2 size={12} /> Data teknis (JSON) — untuk developer</summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-800">{JSON.stringify(result, null, 2)}</pre>
        </details>
        <p className="mt-2 flex items-start gap-1 text-[10px] text-slate-500"><Info size={11} className="mt-0.5 shrink-0" /> Hasil ini berasal dari respons API pengajuan ini, bukan data contoh.</p>
      </section>
    </div>
  );
}
