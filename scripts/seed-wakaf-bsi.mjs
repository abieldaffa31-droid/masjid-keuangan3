/**
 * Seed mutasi BSI rekening WAKAF ke tabel transaksi_wakaf
 *
 * Format CSV sama dengan mutasi BSI biasa:
 *   Tanggal & Jam, FT Number, Description, Currency, Amount, DB/CR, Balance
 *
 * Penggunaan:
 *   node scripts/seed-wakaf-bsi.mjs <file.csv>
 *   node scripts/seed-wakaf-bsi.mjs <file.csv> --preview
 *   node scripts/seed-wakaf-bsi.mjs <file.csv> --from 2026-01-01 --to 2026-03-31
 *
 * Script ini UPSERT — aman dijalankan ulang, tidak akan duplikat.
 */

import { readFileSync } from 'fs'
import { supabase } from './supabase-client.mjs'

// ─── Derive sumber dari deskripsi BSI ─────────────────────────────────────────
function deriveSumber(desc) {
  const u = desc.toUpperCase()
  if (/QR\s*\d|QRIS/.test(u))                              return 'QRIS / QR Code'
  if (/TRF|TRANSFER|PEMINDAHBUKUAN|VA\b|VIRTUAL/.test(u))  return 'Transfer Bank'
  if (/SETOR\s*TUNAI|CASH|KOTAK/.test(u))                  return 'Kotak Amal'
  return 'Transfer Bank'  // default wakaf = transfer
}

// ─── CSV parser dengan support quoted fields ──────────────────────────────────
function parseCSVLine(line) {
  const cols = []; let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cols.push(cur.trim())
  return cols
}

function parseDate(raw) {
  const s = raw.trim()
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  return null
}

function parseAmount(raw) {
  return parseInt(raw.replace(/\./g, '').replace(/,\d+$/, '').trim()) || 0
}

function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const rows = []
  for (const line of lines.slice(1)) {
    const cols = parseCSVLine(line)
    const [tgl='', ft='', desc='', , amtRaw='0', dbcr='', balRaw='0'] = cols
    const dbcrUp = dbcr.toUpperCase().trim()
    if (dbcrUp === '-' || dbcrUp === '') continue
    const tanggal = parseDate(tgl)
    if (!tanggal) continue
    const nominal = parseAmount(amtRaw)
    const saldo   = parseAmount(balRaw)
    if (nominal <= 0) continue
    const isMasuk = dbcrUp === 'CR'
    rows.push({
      tanggal,
      ft_number:  ft.trim(),
      bulan:      tanggal.slice(0, 7),
      deskripsi:  desc.trim(),
      uang_masuk: isMasuk ? nominal : 0,
      uang_keluar:isMasuk ? 0 : nominal,
      saldo,
      sumber:     isMasuk ? deriveSumber(desc) : null,
      keterangan: '',
    })
  }
  return rows
}

function formatRp(n) { return 'Rp ' + n.toLocaleString('id-ID') }

async function main() {
  const args     = process.argv.slice(2)
  const csvPath  = args.find(a => !a.startsWith('--'))
  const preview  = args.includes('--preview')
  const fromIdx  = args.indexOf('--from')
  const toIdx    = args.indexOf('--to')
  const fromDate = fromIdx !== -1 ? args[fromIdx + 1] : null
  const toDate   = toIdx   !== -1 ? args[toIdx   + 1] : null

  if (!csvPath) {
    console.error('Penggunaan: node scripts/seed-wakaf-bsi.mjs <file.csv> [--preview] [--from YYYY-MM-DD] [--to YYYY-MM-DD]')
    process.exit(1)
  }

  let content
  try { content = readFileSync(csvPath, 'utf-8') }
  catch { content = readFileSync(csvPath, 'latin1') }

  let rows = parseCSV(content)
  if (fromDate) rows = rows.filter(r => r.tanggal >= fromDate)
  if (toDate)   rows = rows.filter(r => r.tanggal <= toDate)

  if (rows.length === 0) { console.log('Tidak ada baris data.'); process.exit(0) }

  const masuk  = rows.filter(r => r.uang_masuk > 0)
  const totalMasuk = masuk.reduce((s, r) => s + r.uang_masuk, 0)
  const bySumber = masuk.reduce((acc, r) => {
    acc[r.sumber] = (acc[r.sumber] || 0) + r.uang_masuk; return acc
  }, {})

  console.log('\n=== Seed Mutasi Wakaf BSI ===')
  console.log(`File    : ${csvPath}`)
  if (fromDate || toDate) console.log(`Filter  : ${fromDate??'*'} s/d ${toDate??'*'}`)
  console.log(`Baris   : ${rows.length} transaksi`)
  console.log(`Masuk   : ${formatRp(totalMasuk)} (${masuk.length} trx)`)
  console.log('\nBreakdown sumber:')
  Object.entries(bySumber).sort((a,b)=>b[1]-a[1]).forEach(([s,v]) =>
    console.log(`  ${s.padEnd(20)}: ${formatRp(v)}`)
  )

  if (preview) {
    console.log('\n--- 10 baris pertama ---')
    rows.slice(0, 10).forEach((r, i) => {
      const amt = r.uang_masuk > 0 ? `+${formatRp(r.uang_masuk)}` : `-${formatRp(r.uang_keluar)}`
      console.log(`${String(i+1).padStart(3)}. ${r.tanggal} | ${(r.sumber||'-').padEnd(18)} | ${amt.padEnd(18)} | ${r.deskripsi.slice(0,40)}`)
    })
    console.log('\n⚠  Mode --preview: tidak ada data yang disimpan.')
    return
  }

  console.log('\nMenyimpan ke Supabase...')
  const BATCH = 100
  let ok = 0, fail = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from('transaksi_wakaf')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'ft_number', ignoreDuplicates: false })
    if (error) { console.error(`  Batch ${Math.floor(i/BATCH)+1} GAGAL: ${error.message}`); fail += Math.min(BATCH, rows.length-i) }
    else { ok += Math.min(BATCH, rows.length-i); process.stdout.write(`  ${ok}/${rows.length} tersimpan...\r`) }
  }
  console.log(`\n✓ Selesai! ${ok} transaksi wakaf disimpan${fail > 0 ? `, ${fail} gagal` : ''}.`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
