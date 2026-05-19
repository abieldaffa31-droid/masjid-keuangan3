/**
 * Master Chart of Accounts (COA) — keyword-based transaction classification
 *
 * Rules are ordered: more specific (longer) keywords come before broader ones.
 * First match wins. Matching is case-insensitive; "INFAK" is normalised to "INFAQ"
 * before comparison so both spellings work.
 */

// ── Category lists ────────────────────────────────────────────────────────────

export const COA_KATEGORI_MASUK = [
  'INFAQ QRIS',
  'INFAQ TUNAI',
  'DONASI TRANSFER',
  'TITIPAN MASUK',
  'UANG MASUK',
] as const

export const COA_KATEGORI_KELUAR = [
  'IBADAH & DAKWAH',
  'KERUMAHTANGGAAN',
  'MEDIA',
  'OPERASIONAL UMUM',
  'TITIPAN KELUAR',
  'TITIPAN',
] as const

export const ALL_COA_KATEGORI: string[] = [
  ...COA_KATEGORI_MASUK,
  ...COA_KATEGORI_KELUAR,
]

// ── Rule table ────────────────────────────────────────────────────────────────

interface COARule {
  jenis: 'CR' | 'DB'
  keyword: string
  kategori: string
}

const COA_RULES: COARule[] = [
  // ── CR (masuk) — specific before broad ────────────────────────────────────
  { jenis: 'CR', keyword: 'MANUAL-INFAQ JUMAT TUNAI',   kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'MANUAL-INFAQ TUNAI',         kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'MANUAL-DONASI',              kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'INFAQ KARUMAH',              kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'INFAQ PHUP',                 kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'INFAQ YPIA',                 kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'INFAQ JUMAT',                kategori: 'INFAQ TUNAI' },
  { jenis: 'CR', keyword: 'INFAQ TRF',                  kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'MUKAFAAH MC',                kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'MUKAFAAH STREAMER',          kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'OPERASIONAL MASJID POGUNG',  kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'BIFAST - TRF DARI',          kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'PEMINDAHBUKUAN TRF DARI',    kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'SEDEKAH SUBUH',              kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'BERAS DHUAFA',               kategori: 'TITIPAN MASUK' },
  { jenis: 'CR', keyword: 'DANA BERAS',                 kategori: 'TITIPAN MASUK' },
  { jenis: 'CR', keyword: 'SEMBAKO',                    kategori: 'TITIPAN MASUK' },
  { jenis: 'CR', keyword: 'SISA BELANJA',               kategori: 'UANG MASUK' },
  { jenis: 'CR', keyword: 'BISMILLAH',                  kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'INFAQ',                      kategori: 'DONASI TRANSFER' }, // broad (after specifics)
  { jenis: 'CR', keyword: 'SEDEKAH',                    kategori: 'DONASI TRANSFER' },
  { jenis: 'CR', keyword: 'DONASI',                     kategori: 'DONASI TRANSFER' },
  // QRIS — "OPERASIONAL MPR" appears in all QR/QRIS descriptions
  { jenis: 'CR', keyword: 'OPERASIONAL MPR',            kategori: 'INFAQ QRIS' },
  { jenis: 'CR', keyword: 'QR 0',                       kategori: 'INFAQ QRIS' },
  { jenis: 'CR', keyword: 'QR 1',                       kategori: 'INFAQ QRIS' },
  { jenis: 'CR', keyword: 'QR 2',                       kategori: 'INFAQ QRIS' },
  { jenis: 'CR', keyword: 'QR 3',                       kategori: 'INFAQ QRIS' },
  { jenis: 'CR', keyword: 'QRIS',                       kategori: 'INFAQ QRIS' },

  // ── DB (keluar) ───────────────────────────────────────────────────────────

  // Titipan — check first to prevent misclassification
  { jenis: 'DB', keyword: 'BERAS DARI PAK',             kategori: 'TITIPAN KELUAR' },
  { jenis: 'DB', keyword: 'DANA BERAS',                 kategori: 'TITIPAN KELUAR' },
  { jenis: 'DB', keyword: 'DANA SEMBAKO',               kategori: 'TITIPAN KELUAR' },
  { jenis: 'DB', keyword: 'SEMBAKO APRIL',              kategori: 'TITIPAN KELUAR' },
  { jenis: 'DB', keyword: 'RMDN',                       kategori: 'TITIPAN KELUAR' },
  { jenis: 'DB', keyword: 'ZAKAT',                      kategori: 'TITIPAN' },
  { jenis: 'DB', keyword: 'UANG BERAS DES/JAN',         kategori: 'TITIPAN' },

  // Media — specific before broad
  { jenis: 'DB', keyword: 'CETAK STIKER QRIS',          kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK UCAPAN TRM KSH',       kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK STIKER',               kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK PROPOSAL',             kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK AMPLOP',               kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK SPANDUK',              kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'CETAK POSTER',               kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'FINISHING AMPLOP',           kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'LANGGANAN APLIKASI',         kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'PENGAJUAN MEDIA',            kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'REMBES CETAK',               kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'BATREAI PARKIR',             kategori: 'OPERASIONAL UMUM' }, // before BATRAI
  { jenis: 'DB', keyword: 'BATRAI',                     kategori: 'MEDIA' },
  { jenis: 'DB', keyword: 'PAPPER BAG MPR',             kategori: 'MEDIA' },

  // Ibadah & Dakwah — specific before broad
  { jenis: 'DB', keyword: 'KONSUMSI SIANG JUMAT',       kategori: 'OPERASIONAL UMUM' }, // override
  { jenis: 'DB', keyword: 'KONSUMSI SOWAN UST',         kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'KONSUMSI USTADZ',            kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'KONSUMSI JUMAT',             kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'KONSUM JUMAT',               kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH KHATIB JUMAT',      kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH AHAD PAGI',         kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH MC DAN STREAMER',   kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH USTADZ AFIFI',      kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH SDM',               kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'MUKAFAAH PARKIR',            kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'MUKAFAAH TRAINING',          kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'MUKAFAAH KHATIB',            kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH USTADZ',            kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'MUKAFAAH AHAD',              kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'BUAH RAPAT',                 kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'SNACK RAPAT',                kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'PENGAJUAN IBADAH',           kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'PENGAJUAN TAHSIN',           kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'PENGAJUAN RISPODA',          kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'BINGKISAN USTADZ',           kategori: 'IBADAH & DAKWAH' },
  { jenis: 'DB', keyword: 'DONASI DAKWAH',              kategori: 'IBADAH & DAKWAH' },

  // Kerumahtanggaan
  { jenis: 'DB', keyword: 'BELANJA BULANAN',            kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'BELANJA BULAN',              kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'AIR ISI ULANG',              kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'AIR GALON',                  kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'GALON MPR',                  kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'GALON',                      kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'GAS MPR',                    kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PLN POSTPAID',               kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PLN',                        kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'SAMPAH RAMADHAN',            kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'SAMPAH MPR',                 kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'SAMPAH',                     kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'BERSIHKAN TOREN',            kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'SNACK KERJA BAKTI',          kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'DUDUKAN KOMPOR',             kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'CUCI GORDEN',                kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'CUCI KARPET',                kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'OBAT OBATAN',                kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'BAHAN POS KEAMANAN',         kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'BUMBU',                      kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PERBAIKAN LAMPU',            kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PEMBELIAN GELAS',            kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'OBRAS KARPET',               kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PERLENGKAPAN BERSIH',        kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'PASANG JARING',              kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'TRASH BAG',                  kategori: 'KERUMAHTANGGAAN' },
  { jenis: 'DB', keyword: 'SERVIS',                     kategori: 'KERUMAHTANGGAAN' },

  // Operasional Umum
  { jenis: 'DB', keyword: 'BIAYA ADM CMS',              kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'BIAYA PEMINDAHBUKUAN',       kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'GAJI PENGAJAR TPA',          kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'GAJI SDM',                   kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'GAJI STAF ADMIN',            kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'PULSA HP',                   kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'IB - TSEL HALO',             kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'AYAM MENTAH TAKMIR',         kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'INTERNET MPR',               kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'INTERNET',                   kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'REIMBURSE ARGA OPS',         kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'MAKAN BULANAN',              kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'BENSIN SURVEI',              kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'SNACK HITUNG INFAQ',         kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'RAPAT BULANAN TAKMIR',       kategori: 'OPERASIONAL UMUM' },
  { jenis: 'DB', keyword: 'SALAH TF',                   kategori: 'OPERASIONAL UMUM' },
]

// ── Main classification function ──────────────────────────────────────────────

/**
 * Classify a transaction description according to the Master COA.
 * `jenis` = 'masuk' (CR) or 'keluar' (DB).
 * Returns the matching Kategori string, or a sensible default.
 */
export function autoKategoriCOA(deskripsi: string, jenis: 'masuk' | 'keluar'): string {
  // Normalise: treat "INFAK" and "INFAQ" as identical
  const upper = deskripsi.toUpperCase().replace(/\bINFAK\b/g, 'INFAQ')
  const dbcr: 'CR' | 'DB' = jenis === 'masuk' ? 'CR' : 'DB'

  for (const rule of COA_RULES) {
    if (rule.jenis === dbcr && upper.includes(rule.keyword)) {
      return rule.kategori
    }
  }

  return jenis === 'masuk' ? 'DONASI TRANSFER' : 'OPERASIONAL UMUM'
}
