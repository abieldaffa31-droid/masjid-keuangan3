/**
 * Seed data infaq Jumat 20 pekan (Januari–Mei 2026)
 * Jalankan: node scripts/seed-infaq-jumat.mjs
 * Aman dijalankan berulang (upsert berdasarkan tanggal_jumat)
 */

import { supabase } from './supabase-client.mjs'

const DATA = [
  { tanggal_jumat: '2026-01-02', jumlah_kotak: 2_201_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-01-09', jumlah_kotak: 2_205_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-01-16', jumlah_kotak: 2_406_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-01-23', jumlah_kotak: 2_104_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-01-30', jumlah_kotak: 2_815_800, jumlah_online: 0 },
  { tanggal_jumat: '2026-02-06', jumlah_kotak: 2_457_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-02-13', jumlah_kotak: 2_611_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-02-20', jumlah_kotak: 1_536_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-02-27', jumlah_kotak: 1_904_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-03-06', jumlah_kotak: 1_608_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-03-13', jumlah_kotak: 1_699_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-03-20', jumlah_kotak: 3_253_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-03-27', jumlah_kotak: 2_620_300, jumlah_online: 0 },
  { tanggal_jumat: '2026-04-03', jumlah_kotak: 3_533_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-04-10', jumlah_kotak: 2_696_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-04-17', jumlah_kotak: 3_338_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-04-24', jumlah_kotak: 3_228_100, jumlah_online: 0 },
  { tanggal_jumat: '2026-05-01', jumlah_kotak: 3_352_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-05-08', jumlah_kotak: 2_874_000, jumlah_online: 0 },
  { tanggal_jumat: '2026-05-15', jumlah_kotak: 3_160_000, jumlah_online: 0 },
]

function formatRp(n) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const CREATE_TABLE_SQL = `
-- Jalankan SQL ini di Supabase SQL Editor sebelum menjalankan seed:
-- https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS infaq_jumat (
  id            SERIAL PRIMARY KEY,
  tanggal_jumat DATE   NOT NULL UNIQUE,
  jumlah_kotak  BIGINT NOT NULL DEFAULT 0,
  jumlah_online BIGINT NOT NULL DEFAULT 0,
  total         BIGINT GENERATED ALWAYS AS (jumlah_kotak + jumlah_online) STORED,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE infaq_jumat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_infaq_jumat" ON infaq_jumat FOR ALL USING (true) WITH CHECK (true);
`

async function checkTable() {
  const { error } = await supabase.from('infaq_jumat').select('id').limit(1)
  return !error
}

async function main() {
  console.log('=== Seed Infaq Jumat ===')

  // Verifikasi tabel ada
  const tableOk = await checkTable()
  if (!tableOk) {
    console.error('\n❌ TABEL infaq_jumat BELUM ADA di Supabase!\n')
    console.error('Langkah:')
    console.error('1. Buka https://supabase.com/dashboard → pilih project Anda')
    console.error('2. Klik "SQL Editor" di sidebar')
    console.error('3. Paste dan jalankan SQL berikut:\n')
    console.error(CREATE_TABLE_SQL)
    console.error('4. Setelah selesai, jalankan ulang: node scripts/seed-infaq-jumat.mjs')
    process.exit(1)
  }

  console.log(`Memasukkan ${DATA.length} baris ke tabel infaq_jumat...\n`)

  const { data, error } = await supabase
    .from('infaq_jumat')
    .upsert(DATA, { onConflict: 'tanggal_jumat' })
    .select()

  if (error) {
    console.error('GAGAL:', error.message)
    console.error('Detail:', error.details || error.hint || '')
    process.exit(1)
  }

  // Tampilkan ringkasan per baris
  const totalKotak = DATA.reduce((s, d) => s + d.jumlah_kotak, 0)
  const totalOnline = DATA.reduce((s, d) => s + d.jumlah_online, 0)

  console.log('No | Tanggal Jumat | Kotak Amal     | Online | Total')
  console.log('---|--------------|----------------|--------|-------')
  DATA.forEach((d, i) => {
    const total = d.jumlah_kotak + d.jumlah_online
    console.log(
      `${String(i + 1).padStart(2)} | ${d.tanggal_jumat}   | ${formatRp(d.jumlah_kotak).padEnd(14)} | ${formatRp(d.jumlah_online).padEnd(6)} | ${formatRp(total)}`
    )
  })

  console.log('\n--- Ringkasan ---')
  console.log(`Total baris  : ${DATA.length} pekan`)
  console.log(`Total Kotak  : ${formatRp(totalKotak)}`)
  console.log(`Total Online : ${formatRp(totalOnline)}`)
  console.log(`Grand Total  : ${formatRp(totalKotak + totalOnline)}`)
  console.log('\n✓ Selesai! Data berhasil disimpan ke Supabase.')
}

main()
