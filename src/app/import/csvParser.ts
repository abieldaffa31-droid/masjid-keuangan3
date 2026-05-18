export interface CSVRow {
  id: string
  tanggal: string
  ftNumber: string
  deskripsi: string
  nominal: number
  jenis: 'masuk' | 'keluar'
  saldo: number
  kategori: string
  selected: boolean
}

const KATEGORI_KEYWORDS: Array<{ pattern: RegExp; kategori: string }> = [
  { pattern: /INFAQ|INFAK/i, kategori: 'Infaq' },
  { pattern: /WAKAF/i, kategori: 'Wakaf' },
  { pattern: /DONASI|SHODAQOH|SEDEKAH|SHADAQAH|ZAKAT/i, kategori: 'Donasi' },
  { pattern: /LISTRIK|PLN|AIR|PDAM|WIFI|INTERNET|TELEPON|TOKEN/i, kategori: 'Operasional' },
  { pattern: /HONOR|GAJI|TPP|INSENTIF|IMAM|MUADZIN|MARBOT|KARYAWAN/i, kategori: 'SDM' },
  { pattern: /ATK|ALAT|KEBERSIHAN|SARANA|PERALATAN|PEMBELIAN/i, kategori: 'Sarana' },
  { pattern: /PEMBANGUNAN|RENOVASI|KONSTRUKSI|MATERIAL/i, kategori: 'Pembangunan' },
]

export function autoKategori(deskripsi: string): string {
  for (const { pattern, kategori } of KATEGORI_KEYWORDS) {
    if (pattern.test(deskripsi)) return kategori
  }
  return 'Umum'
}

function parseDate(raw: string): string {
  // DD/MM/YYYY or DD-MM-YYYY → YYYY-MM-DD
  const parts = raw.trim().split(/[\/\-]/)
  if (parts.length === 3) {
    const [d, m, y] = parts
    if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    // Already YYYY-MM-DD
    return raw.trim()
  }
  return raw.trim()
}

function parseNominal(raw: string): number {
  // Remove thousand separators (dots in ID format) and convert
  return parseInt(raw.replace(/\./g, '').replace(/,\d+$/, '').trim()) || 0
}

export function parseCSVBSI(content: string): CSVRow[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const firstLine = lines[0]
  const sep = firstLine.includes(';') ? ';' : ','

  // Skip header row(s) — find first row that looks like data (starts with a date-like value)
  let startIdx = 1
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep)
    if (cols[0] && /\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(cols[0].trim())) {
      startIdx = i
      break
    }
  }

  return lines
    .slice(startIdx)
    .map((line, idx) => {
      // Handle quoted fields
      const cols = line
        .split(sep)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''))

      const [tanggalRaw = '', ftNumber = '', deskripsi = '', nominalRaw = '0', dbcr = '', saldoRaw = '0'] = cols

      const nominal = parseNominal(nominalRaw)
      const saldo = parseNominal(saldoRaw)
      const jenis: 'masuk' | 'keluar' = dbcr.toUpperCase().includes('CR') ? 'masuk' : 'keluar'

      return {
        id: `row-${idx}`,
        tanggal: parseDate(tanggalRaw),
        ftNumber,
        deskripsi: deskripsi.trim(),
        nominal,
        jenis,
        saldo,
        kategori: autoKategori(deskripsi),
        selected: true,
      }
    })
    .filter((r) => r.tanggal && r.nominal > 0 && r.deskripsi)
}
