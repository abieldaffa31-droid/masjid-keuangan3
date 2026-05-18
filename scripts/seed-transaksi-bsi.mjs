/**
 * Seed transaksi dari ekspor CSV BSI
 *
 * Format CSV BSI aktual:
 *   Tanggal & Jam, FT Number, Description, Currency, Amount, DB/CR, Balance
 *   "2026-01-01 6:13:33", FT..., Deskripsi, IDR, "1.000", CR, "71.881.608,72"
 *
 * Penggunaan:
 *   node scripts/seed-transaksi-bsi.mjs <file.csv>
 *   node scripts/seed-transaksi-bsi.mjs <file.csv> --preview
 *   node scripts/seed-transaksi-bsi.mjs <file.csv> --from 2026-01-01 --to 2026-03-31
 */

import { readFileSync } from 'fs'
import { supabase } from './supabase-client.mjs'

// ─── Parser CSV dengan support quoted fields ──────────────────────────────────
function parseCSVLine(line) {
  const cols = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

// ─── Date: "2026-01-01 6:13:33" → "2026-01-01" ────────────────────────────────
const BULAN = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }

function parseDate(raw) {
  const s = raw.trim()
  // Format utama: "2026-01-01 6:13:33" atau "2026-01-01"
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  // Format saldo awal: "31 Dec 2025"
  const legacyMatch = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
  if (legacyMatch) {
    const [, d, m, y] = legacyMatch
    return `${y}-${BULAN[m] ?? '01'}-${d.padStart(2, '0')}`
  }
  return null
}

// ─── Amount: "1.000" → 1000  |  "1.923.000" → 1923000  |  "50" → 50 ──────────
function parseAmount(raw) {
  // Titik = pemisah ribuan (ID), koma = desimal → ambil bagian integer saja
  return parseInt(raw.replace(/\./g, '').replace(/,\d+$/, '').trim()) || 0
}

// ─── Balance: "71.881.608,72" → 71881608 ──────────────────────────────────────
function parseBalance(raw) {
  return parseInt(raw.replace(/\./g, '').replace(/,\d+$/, '').trim()) || 0
}

// ─── Kategorisasi otomatis ────────────────────────────────────────────────────
// Diurutkan dari paling spesifik ke umum
const KATEGORI_RULES_MASUK = [
  { p: /infaq|infak/i,                                    k: 'Infaq' },
  { p: /wakaf/i,                                          k: 'Wakaf' },
  { p: /zakat/i,                                          k: 'Donasi' },
  { p: /sedekah|shodaqoh|shadaqah/i,                      k: 'Donasi' },
]
const KATEGORI_RULES_KELUAR = [
  { p: /listrik|token|pln/i,                              k: 'Operasional' },
  { p: /internet|wifi|wi-fi/i,                            k: 'Operasional' },
  { p: /air\b|pdam/i,                                     k: 'Operasional' },
  { p: /biaya pemindahbukuan|biaya admin|biaya transfer/i, k: 'Operasional' },
  { p: /honor|honorarium|gaji|tpp|insentif/i,             k: 'SDM' },
  { p: /konsumsi|makan|snack|catering/i,                  k: 'SDM' },
  { p: /pengajuan ibadah|pengajuan kegiatan/i,            k: 'SDM' },
  { p: /pengajuan media|media\b/i,                        k: 'Sarana' },
  { p: /alat|atk|karpet|peralatan|sarana|beli\b|material/i, k: 'Sarana' },
  { p: /pembangunan|renovasi|konstruksi/i,                k: 'Pembangunan' },
]

function autoKategori(deskripsi, jenis) {
  const rules = jenis === 'masuk' ? KATEGORI_RULES_MASUK : KATEGORI_RULES_KELUAR
  for (const { p, k } of rules) {
    if (p.test(deskripsi)) return k
  }
  return jenis === 'masuk' ? 'Donasi' : 'Umum'
}

// ─── Parse file CSV ───────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const rows = []
  for (const line of lines.slice(1)) {          // skip header
    const cols = parseCSVLine(line)
    // Kolom: 0=Tanggal&Jam, 1=FT Number, 2=Description, 3=Currency, 4=Amount, 5=DB/CR, 6=Balance
    const [tgl = '', ft = '', desc = '', , amtRaw = '0', dbcr = '', balRaw = '0'] = cols

    const dbcrUp = dbcr.toUpperCase().trim()
    if (dbcrUp === '-' || dbcrUp === '') continue   // saldo awal / baris kosong

    const tanggal = parseDate(tgl)
    if (!tanggal) continue

    const nominal  = parseAmount(amtRaw)
    const saldo    = parseBalance(balRaw)
    if (nominal <= 0) continue

    const jenis    = dbcrUp === 'CR' ? 'masuk' : 'keluar'
    const kategori = autoKategori(desc.trim(), jenis)

    rows.push({ tanggal, ftNumber: ft.trim(), deskripsi: desc.trim(), nominal, jenis, saldo, kategori })
  }
  return rows
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatRp(n) { return 'Rp ' + n.toLocaleString('id-ID') }
function trunc(s, n = 45) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2)
  const csvPath  = args.find(a => !a.startsWith('--'))
  const preview  = args.includes('--preview')
  const fromIdx  = args.indexOf('--from')
  const toIdx    = args.indexOf('--to')
  const fromDate = fromIdx !== -1 ? args[fromIdx + 1] : null
  const toDate   = toIdx   !== -1 ? args[toIdx   + 1] : null

  if (!csvPath) {
    console.error('Penggunaan: node scripts/seed-transaksi-bsi.mjs <file.csv> [--preview] [--from YYYY-MM-DD] [--to YYYY-MM-DD]')
    process.exit(1)
  }

  let content
  try { content = readFileSync(csvPath, 'utf-8') }
  catch { content = readFileSync(csvPath, 'latin1') }

  let rows = parseCSV(content)
  if (fromDate) rows = rows.filter(r => r.tanggal >= fromDate)
  if (toDate)   rows = rows.filter(r => r.tanggal <= toDate)

  if (rows.length === 0) {
    console.log('Tidak ada baris data. Periksa format atau filter tanggal.')
    process.exit(0)
  }

  // ── Statistik ──
  const totalMasuk  = rows.filter(r => r.jenis === 'masuk' ).reduce((s, r) => s + r.nominal, 0)
  const totalKeluar = rows.filter(r => r.jenis === 'keluar').reduce((s, r) => s + r.nominal, 0)
  const byKat = rows.reduce((acc, r) => { acc[r.kategori] = (acc[r.kategori]||0)+1; return acc }, {})

  console.log('\n=== Seed Transaksi BSI ===')
  console.log(`File      : ${csvPath}`)
  if (fromDate || toDate) console.log(`Filter    : ${fromDate??'*'} s/d ${toDate??'*'}`)
  console.log(`Baris     : ${rows.length} transaksi`)
  console.log(`Periode   : ${rows[0].tanggal} → ${rows[rows.length-1].tanggal}`)
  console.log(`Masuk     : ${formatRp(totalMasuk)}  (${rows.filter(r=>r.jenis==='masuk').length} trx)`)
  console.log(`Keluar    : ${formatRp(totalKeluar)}  (${rows.filter(r=>r.jenis==='keluar').length} trx)`)
  console.log(`Saldo akhir baris terakhir: ${formatRp(rows[rows.length-1].saldo)}`)

  console.log('\nKategorisasi otomatis:')
  for (const [k, c] of Object.entries(byKat).sort((a,b) => b[1]-a[1]))
    console.log(`  ${k.padEnd(14)}: ${c} trx`)

  if (preview) {
    console.log('\n--- 20 baris pertama ---')
    console.log('No  | Tgl        | Jenis  | Kategori     | Nominal        | Deskripsi')
    console.log('----|------------|--------|--------------|----------------|--------------------------------------------------')
    rows.slice(0, 20).forEach((r, i) => {
      const amt = (r.jenis==='masuk'?'+':'-') + formatRp(r.nominal)
      console.log(`${String(i+1).padStart(3)} | ${r.tanggal} | ${r.jenis.padEnd(6)} | ${r.kategori.padEnd(12)} | ${amt.padEnd(14)} | ${trunc(r.deskripsi)}`)
    })
    if (rows.length > 20) console.log(`    ... dan ${rows.length-20} baris lainnya`)
    console.log('\n⚠  Mode --preview: tidak ada data yang disimpan.')
    return
  }

  // ── Insert batch ──
  console.log('\nMenyimpan ke Supabase...')
  const BATCH = 100
  let inserted = 0, failed = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('transaksi').insert(
      batch.map(r => ({
        tanggal:  r.tanggal,
        uraian:   r.deskripsi,
        kategori: r.kategori,
        jenis:    r.jenis,
        jumlah:   r.nominal,
        saldo:    r.saldo,
      }))
    )
    if (error) {
      console.error(`  Batch ${Math.floor(i/BATCH)+1} GAGAL: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`  ${inserted}/${rows.length} tersimpan...\r`)
    }
  }

  console.log(`\n✓ Selesai! ${inserted} transaksi disimpan${failed > 0 ? `, ${failed} gagal` : ''}.`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
