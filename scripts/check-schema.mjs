/**
 * Cek status semua tabel di Supabase
 * Jalankan: node scripts/check-schema.mjs
 */
import { supabase } from './supabase-client.mjs'

const EXPECTED = {
  transaksi:   ['id', 'tanggal', 'uraian', 'kategori', 'jenis', 'jumlah', 'saldo'],
  wakaf:       ['id', 'tanggal', 'nama_wakif', 'keterangan', 'jumlah'],
  infaq_jumat: ['id', 'tanggal_jumat', 'jumlah_kotak', 'jumlah_online', 'total'],
}

async function checkTable(tableName, expectedCols) {
  // Cek apakah tabel ada
  const { error: tableErr } = await supabase.from(tableName).select('id').limit(1)
  if (tableErr?.code === 'PGRST205') {
    return { status: 'NOT_FOUND', cols: [], missing: expectedCols, extra: [] }
  }

  // Cek kolom satu per satu
  const found = []
  const missing = []
  for (const col of expectedCols) {
    const { error } = await supabase.from(tableName).select(col).limit(1)
    if (!error) found.push(col)
    else missing.push(col)
  }

  // Hitung row count
  const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true })

  return {
    status: missing.length === 0 ? 'OK' : 'WRONG_SCHEMA',
    found,
    missing,
    count: count ?? 0,
  }
}

async function main() {
  console.log('=== Cek Schema Supabase ===\n')

  let allOk = true

  for (const [table, cols] of Object.entries(EXPECTED)) {
    const result = await checkTable(table, cols)
    const icon = result.status === 'OK' ? '✓' : result.status === 'NOT_FOUND' ? '✗' : '⚠'

    if (result.status === 'OK') {
      console.log(`${icon} ${table.padEnd(14)} — OK (${result.count} baris)`)
    } else if (result.status === 'NOT_FOUND') {
      console.log(`${icon} ${table.padEnd(14)} — BELUM ADA`)
      allOk = false
    } else {
      console.log(`${icon} ${table.padEnd(14)} — SCHEMA SALAH`)
      console.log(`    Kolom ada     : ${result.found.join(', ') || '(tidak ada)'}`)
      console.log(`    Kolom kurang  : ${result.missing.join(', ')}`)
      allOk = false
    }
  }

  if (!allOk) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('❌ Ada tabel yang belum dibuat atau schema salah.')
    console.log('\nLangkah perbaikan:')
    console.log('1. Buka https://supabase.com/dashboard → SQL Editor')
    console.log('2. Copy isi file: scripts/create-tables.sql')
    console.log('3. Paste dan klik Run')
    console.log('4. Jalankan ulang: node scripts/check-schema.mjs')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } else {
    console.log('\n✓ Semua tabel siap! Jalankan seed:')
    console.log('  npm run seed:jumat')
    console.log('  npm run seed:bsi -- mutasi.csv')
  }
}

main().catch(err => { console.error(err.message); process.exit(1) })
