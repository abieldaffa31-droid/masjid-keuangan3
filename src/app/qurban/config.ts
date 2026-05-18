// Konfigurasi harga hewan qurban

export type JenisHewan = 'Sapi' | 'Kambing'

export interface TipeOption {
  tipe: string
  harga_ekor: number        // harga per ekor
  harga_per_orang?: number  // untuk sapi: 1/7 bagian
  berat_kg?: string         // untuk kambing/domba
  biaya_sembelih: number    // 0 = sudah include, 100000 = belum
  label: string             // label tampilan
}

export const HARGA_SAPI: TipeOption[] = [
  {
    tipe: 'Diamond',
    label: 'Tipe A – Diamond',
    harga_ekor: 27_000_000,
    harga_per_orang: 4_000_000,
    biaya_sembelih: 0,
  },
  {
    tipe: 'Platinum',
    label: 'Tipe B – Platinum',
    harga_ekor: 26_250_000,
    harga_per_orang: 3_750_000,
    biaya_sembelih: 0,
  },
  {
    tipe: 'Gold',
    label: 'Tipe C – Gold',
    harga_ekor: 24_500_000,
    harga_per_orang: 3_500_000,
    biaya_sembelih: 0,
  },
]

export const HARGA_KAMBING: TipeOption[] = [
  { tipe: 'Jumbo',    label: 'Jumbo (69–74 kg)',   harga_ekor: 6_350_000, berat_kg: '69–74', biaya_sembelih: 100_000 },
  { tipe: 'Super',    label: 'Super (58–61 kg)',   harga_ekor: 5_300_000, berat_kg: '58–61', biaya_sembelih: 100_000 },
  { tipe: 'Besar',    label: 'Besar (46–50 kg)',   harga_ekor: 4_250_000, berat_kg: '46–50', biaya_sembelih: 100_000 },
  { tipe: 'Sedang 2', label: 'Sedang 2 (34–37 kg)',harga_ekor: 3_200_000, berat_kg: '34–37', biaya_sembelih: 100_000 },
  { tipe: 'Sedang',   label: 'Sedang (29–32 kg)',  harga_ekor: 2_600_000, berat_kg: '29–32', biaya_sembelih: 100_000 },
  { tipe: 'Biasa',    label: 'Biasa (23–25 kg)',   harga_ekor: 2_150_000, berat_kg: '23–25', biaya_sembelih: 100_000 },
]

export function getTipeOptions(jenis: JenisHewan): TipeOption[] {
  if (jenis === 'Sapi') return HARGA_SAPI
  return HARGA_KAMBING  // Kambing & Domba pakai daftar yang sama
}

export function getTipe(jenis: JenisHewan, tipe: string): TipeOption | undefined {
  return getTipeOptions(jenis).find(t => t.tipe === tipe)
}

export function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}
