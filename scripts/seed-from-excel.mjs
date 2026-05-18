/**
 * Seed data dari export Excel (PBI_Operasional & PBI_Wakaf)
 *
 * Langkah:
 *   1. Export dari Excel: Sheet PBI_Operasional dan PBI_Wakaf → Save As CSV
 *   2. Jalankan: node scripts/seed-from-excel.mjs <folder_csv>
 *      Contoh:   node scripts/seed-from-excel.mjs "D:/Data Anlysis"
 *
 * CATATAN: Script ini akan HAPUS semua data transaksi lama dan ganti
 * dengan data dari Excel (lebih akurat & berkategori lengkap).
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { supabase } from './supabase-client.mjs'

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

function toInt(s) { return parseInt((s || '0').replace(/[^0-9]/g, '')) || 0 }
function fmt(n) { return 'Rp ' + Number(n).toLocaleString('id-ID') }

async function checkColumn(table, col) {
  const { error } = await supabase.from(table).select(col).limit(1)
  return !error
}

async function main() {
  const folder = process.argv[2] || '.'
  const opFile = join(folder, 'pbi_operasional.csv')
  const wkFile = join(folder, 'pbi_wakaf.csv')

  let opContent, wkContent
  try { opContent = readFileSync(opFile, 'utf-8') } catch { opContent = readFileSync(opFile, 'latin1') }
  try { wkContent = readFileSync(wkFile, 'utf-8') } catch { wkContent = readFileSync(wkFile, 'latin1') }

  // Cek apakah kolom ft_number sudah ada
  const hasFtNumber    = await checkColumn('transaksi', 'ft_number')
  const hasSubKategori = await checkColumn('transaksi', 'sub_kategori')
  console.log(`\nKolom ft_number    : ${hasFtNumber    ? '✓ ada' : '✗ belum (jalankan SQL alter-transaksi.sql dulu)'}`)
  console.log(`Kolom sub_kategori : ${hasSubKategori ? '✓ ada' : '✗ belum (opsional)'}`)

  // ── Operasional ──────────────────────────────────────────────────────────────
  console.log('\n=== [1/2] Transaksi Operasional ===')
  const opRows = parseCSV(opContent)

  const opData = opRows
    .filter(r => r['Tanggal']?.match(/^\d{4}-\d{2}-\d{2}$/) && r['FT Number'])
    .map(r => {
      const masuk  = toInt(r['Uang Masuk'])
      const keluar = toInt(r['Uang Keluar'])
      const row = {
        tanggal:     r['Tanggal'],
        uraian:      r['Deskripsi'] || '',
        kategori:    r['Kategori'] || '',
        jenis:       masuk > 0 ? 'masuk' : 'keluar',
        jumlah:      masuk > 0 ? masuk : keluar,
        saldo:       toInt(r['Saldo Bank']),
      }
      if (hasFtNumber)    row.ft_number    = r['FT Number'].trim()
      if (hasSubKategori) row.sub_kategori = r['Sub-Kategori'] || ''
      return row
    })
    .filter(r => r.jumlah > 0)

  // Deduplicate by ft_number (keep last occurrence)
  const opMap = new Map()
  opData.forEach(r => opMap.set(r.ft_number ?? `nokey-${Math.random()}`, r))
  const opUnique = [...opMap.values()]

  console.log(`Baris valid  : ${opData.length}`)
  if (opData.length !== opUnique.length)
    console.log(`Duplikat     : ${opData.length - opUnique.length} dihapus → ${opUnique.length} unik`)
  const totalMasuk  = opUnique.filter(r => r.jenis==='masuk').reduce((s,r) => s+r.jumlah, 0)
  const totalKeluar = opUnique.filter(r => r.jenis==='keluar').reduce((s,r) => s+r.jumlah, 0)
  console.log(`Total masuk  : ${fmt(totalMasuk)}`)
  console.log(`Total keluar : ${fmt(totalKeluar)}`)

  // Kategori summary
  const byKat = opUnique.filter(r=>r.jenis==='masuk').reduce((a,r) => { a[r.kategori]=(a[r.kategori]||0)+1; return a }, {})
  console.log('Kategori masuk:')
  Object.entries(byKat).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k.padEnd(22)}: ${v}`))

  // UPSERT — aman dijalankan ulang, tidak duplikat
  const BATCH = 100
  let opOk = 0, opFail = 0
  process.stdout.write('Menyimpan operasional')
  for (let i = 0; i < opUnique.length; i += BATCH) {
    const { error } = hasFtNumber
      ? await supabase.from('transaksi').upsert(opUnique.slice(i, i + BATCH), { onConflict: 'ft_number', ignoreDuplicates: false })
      : await supabase.from('transaksi').insert(opUnique.slice(i, i + BATCH))
    if (error) { opFail += Math.min(BATCH, opUnique.length - i); console.error(`\n  Batch gagal: ${error.message}`) }
    else { opOk += Math.min(BATCH, opUnique.length - i); process.stdout.write('.') }
  }
  console.log(`\n✓ ${opOk} transaksi operasional tersimpan${opFail > 0 ? `, ${opFail} gagal` : ''}`)

  // ── Wakaf ────────────────────────────────────────────────────────────────────
  console.log('\n=== [2/2] Transaksi Wakaf ===')
  const wkRows = parseCSV(wkContent)
  const wkData = wkRows
    .filter(r => r['Tanggal']?.match(/^\d{4}-\d{2}-\d{2}$/) && r['FT Number'])
    .filter(r => r['Sumber'] !== 'Saldo Awal' && r['FT Number'] !== 'OPENING-BALANCE')
    .map(r => ({
      tanggal:    r['Tanggal'],
      bulan:      r['Bulan'] || r['Tanggal'].slice(0, 7),
      ft_number:  r['FT Number'].trim(),
      deskripsi:  r['Deskripsi'] || '',
      uang_masuk: toInt(r['Uang Masuk']),
      uang_keluar:toInt(r['Uang Keluar']),
      saldo:      toInt(r['Saldo']),
      sumber:     r['Sumber'] || 'Lainnya',
      keterangan: r['Keterangan'] || '',
    }))
    .filter(r => r.uang_masuk > 0 || r.uang_keluar > 0)

  console.log(`Baris valid : ${wkData.length}`)
  const totalWk = wkData.reduce((s,r) => s+r.uang_masuk, 0)
  console.log(`Total masuk : ${fmt(totalWk)}`)

  const bySumber = wkData.filter(r=>r.uang_masuk>0).reduce((a,r) => {
    a[r.sumber] = (a[r.sumber]||0)+r.uang_masuk; return a }, {})
  console.log('Breakdown sumber:')
  Object.entries(bySumber).sort((a,b)=>b[1]-a[1]).forEach(([s,v]) =>
    console.log(`  ${s.padEnd(20)}: ${fmt(v)}`)
  )

  // UPSERT berdasarkan ft_number (transaksi_wakaf sudah punya kolom ini)
  console.log('\nMenyimpan wakaf (upsert by ft_number)...')
  let wkOk = 0, wkFail = 0
  process.stdout.write('Menyimpan wakaf')
  for (let i = 0; i < wkData.length; i += BATCH) {
    const { error } = await supabase
      .from('transaksi_wakaf')
      .upsert(wkData.slice(i, i + BATCH), { onConflict: 'ft_number', ignoreDuplicates: false })
    if (error) {
      // Fallback: insert biasa jika upsert gagal
      const { error: e2 } = await supabase.from('transaksi_wakaf').insert(wkData.slice(i, i + BATCH))
      if (e2) { wkFail += Math.min(BATCH, wkData.length-i); process.stdout.write('x') }
      else { wkOk += Math.min(BATCH, wkData.length-i); process.stdout.write('.') }
    } else {
      wkOk += Math.min(BATCH, wkData.length-i); process.stdout.write('.')
    }
  }
  console.log(`\n✓ ${wkOk} transaksi wakaf tersimpan${wkFail > 0 ? `, ${wkFail} gagal` : ''}`)

  console.log('\n✅ Selesai! Refresh halaman web untuk melihat data terbaru.')
  if (!hasFtNumber) {
    console.log('\n💡 Tip: Jalankan SQL di scripts/alter-transaksi.sql di Supabase untuk')
    console.log('   aktifkan deduplication (cegah data ganda saat update berikutnya).')
  }
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
