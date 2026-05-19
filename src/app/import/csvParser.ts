import { autoKategoriCOA } from '@/lib/coa'

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

export function autoKategori(deskripsi: string, jenis?: 'masuk' | 'keluar'): string {
  return autoKategoriCOA(deskripsi, jenis ?? 'keluar')
}

function parseDate(raw: string): string {
  const trimmed = raw.trim()
  // Already YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[\/\-]/)
  if (parts.length >= 3) {
    const [a, b, c] = parts
    if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
  }
  return trimmed
}

function parseNominal(raw: string): number {
  const cleaned = raw.trim()
  if (!cleaned) return 0
  // "1,200,000.00" format (comma=thousands, period=decimal) — BSI new export
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/,/g, '')) || 0)
  }
  // "1.200.000,00" format (period=thousands, comma=decimal) — BSI old export
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    return Math.round(parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0)
  }
  // Plain integer like "5" or "617"
  return Math.round(parseFloat(cleaned.replace(/[.,]/g, '')) || 0)
}

export function parseCSVBSI(content: string): CSVRow[] {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const firstLine = lines[0]
  const sep = firstLine.includes(';') ? ';' : ','

  // Detect number of columns from header
  const headerCols = firstLine.split(sep).length
  // BSI new format: Date;FT;Desc;Currency;Amount;CR;Balance (7 cols)
  // BSI old format: Date;FT;Desc;Amount;CR;Balance (6 cols)
  const hasCurrencyCol = headerCols >= 7

  // Skip header row(s) — find first row with a date-like value
  let startIdx = 1
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep)
    const dateCell = cols[0]?.trim() ?? ''
    if (
      /\d{4}-\d{2}-\d{2}/.test(dateCell) ||
      /\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(dateCell)
    ) {
      startIdx = i
      break
    }
  }

  const result: CSVRow[] = []

  lines.slice(startIdx).forEach((line, idx) => {
    const cols = line
      .split(sep)
      .map((c) => c.trim().replace(/^["']|["']$/g, ''))

    let tanggalRaw = ''
    let ftNumber = ''
    let deskripsi = ''
    let nominalRaw = '0'
    let dbcr = ''
    let saldoRaw = '0'

    if (hasCurrencyCol && cols.length >= 7) {
      // 7-col: Date | FT | Desc | Currency | Amount | CR/DB | Balance
      ;[tanggalRaw, ftNumber, deskripsi, , nominalRaw, dbcr, saldoRaw] = cols
    } else {
      // 6-col: Date | FT | Desc | Amount | CR/DB | Balance
      ;[tanggalRaw, ftNumber, deskripsi, nominalRaw, dbcr, saldoRaw] = cols
    }

    const tanggal = parseDate(tanggalRaw)
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return
    if (!deskripsi || deskripsi.length < 2) return

    const nominal = parseNominal(nominalRaw)
    if (nominal <= 0) return

    const saldo = parseNominal(saldoRaw)
    const jenis: 'masuk' | 'keluar' = dbcr.toUpperCase().includes('CR') ? 'masuk' : 'keluar'

    result.push({
      id: `row-${idx}`,
      tanggal,
      ftNumber,
      deskripsi: deskripsi.trim(),
      nominal,
      jenis,
      saldo,
      kategori: autoKategoriCOA(deskripsi.trim(), jenis),
      selected: true,
    })
  })

  return result
}
