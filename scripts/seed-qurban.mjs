/**
 * Seed data sapi qurban dari daftar shohibul qurban
 * Jalankan: node scripts/seed-qurban.mjs
 */
import { supabase } from './supabase-client.mjs'

const TANGGAL = '2026-06-06'  // Perkiraan Idul Adha 1447H

// ── Helper ────────────────────────────────────────────────────────────────────
function sapi(tipe, grup, names, harga) {
  return names
    .filter(Boolean)
    .map(nama_pemilik => ({
      jenis_hewan:     'Sapi',
      tipe,
      grup,
      nama_pemilik,
      harga,
      include_sembelih: true,
      status:          'Lunas',
      tanggal:         TANGGAL,
    }))
}

// ── Data ──────────────────────────────────────────────────────────────────────
const data = [
  // ── DIAMOND (Rp 4.000.000/orang) ──────────────────────────────────────────
  ...sapi('Diamond', 'Diamond 01', [
    'Bp. H. Jamasri',
    'Ibu Hj. Helena Jamasri',
    "Ma'ruf Ridho Syahrofi",
    'Kel. Bp Hadi Sulistiyo',
    'Bp Winarto',
    'Kel. Priyono Dwi Nugroho',
    'Daneesha Akhayrani Nugroho',
  ], 4_000_000),

  ...sapi('Diamond', 'Diamond 02', [
    'Kel. Bp Udi Priyoko',
    'Kel. Bp Sulistiono',
    'Keluarga Subhan Yudihart',
    'Keluarga Suryadi Pradana Dewanto',
    'Bp Srudahat Rahimahullah',
    'Bp Hikayat',
    'Kel. Kumara Ari Yuana',
  ], 4_000_000),

  ...sapi('Diamond', 'Diamond 03', [
    'Ibu Ambar Rukmi Suskamtini',
    'Kel. Bp Pariman',
    'Rado Sahtantra Sekeluarga',
    'Hafid Sahli Mukaffa',
    'Bp Simun',
    "Asma' Lathifah",
    'Rizki Hafidzah Baswedan',
  ], 4_000_000),

  // Diamond 04 — masih 1 orang (belum penuh)
  ...sapi('Diamond', 'Diamond 04', [
    'Bp Jayus alm',
  ], 4_000_000),

  // ── PLATINUM (Rp 3.750.000/orang) ─────────────────────────────────────────
  ...sapi('Platinum', 'Platinum 01', [
    'Kel. Bp Hafidin',
    'Kel. Bp Supriyanto',
    'Kel. Turut Raharjo',
    'Ibu Lasinem',
    'Bp Jumakir',
    'Kel. Bapak Radian Krisnaputra',
    'Bapak Deyuzar Harmaini',
  ], 3_750_000),

  ...sapi('Platinum', 'Platinum 02', [
    'Tim Asuti binti Sutopo',
    'Ibu Lasinem',
    'Ibu Titik Herawati',
    'Ibu Sri Utami',
    'Bp Mujiiono DW',
    'Ibu Ngadinem',
    'Gilang Lukman Hakim',
  ], 3_750_000),

  // Platinum 03 — masih 1 orang
  ...sapi('Platinum', 'Platinum 03', [
    'Kel. Bp Darmaita Trihatmaja',
  ], 3_750_000),

  // ── GOLD (Rp 3.500.000/orang) ─────────────────────────────────────────────
  ...sapi('Gold', 'Gold 01', [
    'Fatih Umar Atharzaka',
    'Kel. Warsidi',
    'Kel. Bapak Salman Acmad',
    'Alm. Bapak Khairuddin',
    'Fiko Ryantono',
    'Kel. Alm. Mammemd Sagi',
    'Sdr. Alif Ravi Ramadhan bin Partono P',
  ], 3_500_000),

  ...sapi('Gold', 'Gold 02', [
    'Ibu Juminem Wagiyo',
    'Kel. Abdul Wahab Bin Muh. Misri Tolla',
    'Kel. Imbang Muryanto',
    'Kel. Supriyadi',
    'Ibu Irawati Menik',
    'Bp Sujanto',
    'Kel. Heri Suratin',
  ], 3_500_000),

  ...sapi('Gold', 'Gold 03', [
    'Kel. Bp Rachmad Ali',
    'Ibu Sri Partini (Wiyono)',
    'Kel. Bapak Suryadi',
    'Ibu Hj. Ngadiyem Suratmin',
    'Bp Dwi Widodo Primantoro',
    'Bp Indra Aditya Utama',
  ], 3_500_000),

  // Gold 04 — masih 2 orang
  ...sapi('Gold', 'Gold 04', [
    'Ibu Sumarsih',
    'Ibu Suharti',
  ], 3_500_000),
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nTotal peserta qurban: ${data.length} orang`)

  const byGrup = data.reduce((a, r) => { a[r.grup] = (a[r.grup]||0)+1; return a }, {})
  console.log('\nPer grup:')
  Object.entries(byGrup).forEach(([g, n]) => {
    const status = n === 7 ? '✓ penuh' : `⏳ ${n}/7`
    console.log(`  ${g.padEnd(14)}: ${status}`)
  })

  const totalDana = data.reduce((s, r) => s + r.harga, 0)
  console.log(`\nTotal dana sapi: Rp ${totalDana.toLocaleString('id-ID')}`)

  console.log('\nMenyimpan ke Supabase...')
  const { error } = await supabase.from('hewan_qurban').insert(data)
  if (error) {
    console.error('❌ Gagal:', error.message)
    process.exit(1)
  }
  console.log(`✅ ${data.length} peserta qurban sapi berhasil disimpan!`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
