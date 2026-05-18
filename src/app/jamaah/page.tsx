import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

const TARGET_WAKAF = 2_500_000_000
const CURRENT_WAKAF_DEFAULT = 1_447_439_609

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-')
}

async function getData() {
  noStore()
  const now = new Date()
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const [thn, bln] = bulanIni.split('-').map(Number)
  const lastDay = new Date(thn, bln, 0).getDate()

  // Hari Jumat terakhir (atau Senin awal pekan ini)
  const dayOfWeek = now.getDay() // 0=Minggu, 5=Jumat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - daysToMonday)
  const weekStart = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth()+1).padStart(2,'0')}-${String(startOfWeek.getDate()).padStart(2,'0')}`
  const weekEnd   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const [wakafRes, transBulanRes, transPerkanRes, jumatRes, qurbanRes] = await Promise.all([
    supabase.from('wakaf').select('jumlah'),
    supabase.from('transaksi').select('jenis, jumlah, kategori')
      .gte('tanggal', `${bulanIni}-01`)
      .lte('tanggal', `${bulanIni}-${String(lastDay).padStart(2,'0')}`),
    supabase.from('transaksi').select('jenis, jumlah, kategori')
      .gte('tanggal', weekStart)
      .lte('tanggal', weekEnd)
      .eq('jenis', 'keluar'),
    supabase.from('infaq_jumat').select('tanggal_jumat, jumlah_kotak')
      .gte('tanggal_jumat', `${bulanIni}-01`)
      .lte('tanggal_jumat', `${bulanIni}-${String(lastDay).padStart(2,'0')}`),
    supabase.from('hewan_qurban').select('jenis_hewan, grup, harga, status, keterangan'),
  ])

  // Wakaf
  const totalWakafDB = wakafRes.data?.reduce((s, w) => s + w.jumlah, 0) ?? 0
  const totalWakaf = totalWakafDB || CURRENT_WAKAF_DEFAULT
  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)

  // Bulan ini
  let pemasukanBulan = 0, pengeluaranBulan = 0
  transBulanRes.data?.forEach(t => {
    if (t.jenis === 'masuk') pemasukanBulan += t.jumlah
    else pengeluaranBulan += t.jumlah
  })

  // Infaq Jumat bulan ini (kotak saja, online terpisah)
  const infaqJumatBulan = jumatRes.data?.reduce((s, j) => s + j.jumlah_kotak, 0) ?? 0

  // Infaq online bulan ini dari transaksi
  const infaqOnlineBulan = (transBulanRes.data ?? [])
    .filter(t => t.jenis === 'masuk' && !/wakaf/i.test(t.kategori ?? '') && /infaq|jumat|online/i.test(t.kategori ?? ''))
    .reduce((s, t) => s + t.jumlah, 0)

  // Pengeluaran pekan ini by kategori
  const keluarPerKategori: Record<string, number> = {}
  transPerkanRes.data?.forEach(t => {
    const k = t.kategori || 'Lainnya'
    keluarPerKategori[k] = (keluarPerKategori[k] ?? 0) + t.jumlah
  })
  const totalKeluarPerkan = Object.values(keluarPerKategori).reduce((s, n) => s + n, 0)
  const keluarSorted = Object.entries(keluarPerKategori).sort((a, b) => b[1] - a[1])

  // Qurban
  const qurbanList = qurbanRes.data ?? []
  const sapiList = qurbanList.filter(r => r.jenis_hewan === 'Sapi')
  const sapiGrupCount: Record<string, number> = {}
  for (const r of sapiList.filter(r => r.keterangan !== '1_ekor_penuh')) {
    const g = r.grup ?? ''
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const jumlahSapi = Object.values(sapiGrupCount).filter(n => n === 7).length
    + sapiList.filter(r => r.keterangan === '1_ekor_penuh').length
  const jumlahKambing = qurbanList.filter(r => r.jenis_hewan === 'Kambing')
    .reduce((s, r) => s + ((r as { jumlah?: number }).jumlah ?? 1), 0)
  const totalDanaQurban = qurbanList.reduce((s, r) => s + (r.harga ?? 0), 0)
  const lunas = qurbanList.filter(r => r.status === 'Lunas').length

  const tanggalUpdate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(now)

  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)

  return {
    totalWakaf, progressWakaf,
    pemasukanBulan, pengeluaranBulan,
    infaqJumatBulan, infaqOnlineBulan,
    keluarSorted, totalKeluarPerkan,
    jumlahSapi, jumlahKambing, totalDanaQurban, lunas, totalPeserta: qurbanList.length,
    tanggalUpdate, namaBulan, weekStart, weekEnd,
  }
}

const KATEGORI_COLOR: Record<string, string> = {
  'Operasional': 'bg-blue-500',
  'SDM': 'bg-purple-500',
  'Sarana': 'bg-orange-500',
  'Pembangunan': 'bg-red-500',
  'Infaq': 'bg-green-500',
  'Donasi': 'bg-teal-500',
  'Umum': 'bg-gray-400',
}
function getColor(k: string) {
  return KATEGORI_COLOR[k] ?? 'bg-slate-400'
}

export default async function JamaahPage() {
  const d = await getData()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Wrapper konten — lebar tetap buat screenshot */}
      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="bg-green-800 text-white rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Masjid Pogung Raya</h1>
            <p className="text-green-300 text-sm mt-0.5">Laporan Keuangan untuk Jamaah</p>
            <p className="text-green-200 text-xs mt-1">{d.tanggalUpdate}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl">🕌</div>
            <PrintButton />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Pemasukan {d.namaBulan}</p>
            <p className="text-xl font-bold text-green-600">{formatRupiah(d.pemasukanBulan)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Pengeluaran {d.namaBulan}</p>
            <p className="text-xl font-bold text-red-500">{formatRupiah(d.pengeluaranBulan)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Infaq Jumat {d.namaBulan}</p>
            <p className="text-xl font-bold text-amber-600">{formatRupiah(d.infaqJumatBulan)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Selisih Bulan Ini</p>
            <p className={`text-xl font-bold ${d.pemasukanBulan - d.pengeluaranBulan >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
              {d.pemasukanBulan - d.pengeluaranBulan >= 0 ? '+' : ''}{formatRupiah(d.pemasukanBulan - d.pengeluaranBulan)}
            </p>
          </div>
        </div>

        {/* Wakaf Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌿</span>
            <h2 className="font-bold text-green-800">Program Wakaf Pembebasan Lahan</h2>
          </div>
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-gray-400">Terkumpul</p>
              <p className="text-3xl font-bold text-green-700">{formatRupiah(d.totalWakaf)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Target</p>
              <p className="text-lg font-semibold text-gray-600">{formatRupiah(TARGET_WAKAF)}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-green-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-5 bg-green-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${d.progressWakaf}%` }}
            >
              <span className="text-white text-xs font-bold">{d.progressWakaf.toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">{d.progressWakaf.toFixed(1)}% tercapai</span>
            <span>Sisa: {formatRupiah(TARGET_WAKAF - d.totalWakaf)}</span>
          </div>
        </div>

        {/* Pengeluaran pekan ini & Qurban */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Pengeluaran per kategori pekan ini */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-1">📊 Pengeluaran Pekan Ini</h2>
            <p className="text-xs text-gray-400 mb-4">
              {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d.weekStart))} –{' '}
              {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d.weekEnd))}
              {' · '}Total: {formatRupiah(d.totalKeluarPerkan)}
            </p>
            {d.keluarSorted.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada pengeluaran pekan ini</p>
            ) : (
              <div className="space-y-2.5">
                {d.keluarSorted.map(([kat, jumlah]) => {
                  const pct = d.totalKeluarPerkan > 0 ? (jumlah / d.totalKeluarPerkan) * 100 : 0
                  return (
                    <div key={kat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{kat}</span>
                        <span className="text-gray-500">{formatRupiah(jumlah)} <span className="text-gray-300">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${getColor(kat)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Qurban */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">🐄 Update Program Qurban</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-3xl font-bold text-orange-600">{d.jumlahSapi}</p>
                <p className="text-xs text-gray-500 mt-1">🐄 Sapi</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-3xl font-bold text-amber-600">{d.jumlahKambing}</p>
                <p className="text-xs text-gray-500 mt-1">🐐 Kambing</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total peserta</span>
                <span className="font-semibold">{d.totalPeserta} orang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sudah lunas</span>
                <span className="font-semibold text-green-600">{d.lunas} orang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total dana</span>
                <span className="font-semibold text-orange-600">{formatRupiah(d.totalDanaQurban)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs pb-2">
          © 2025 Masjid Pogung Raya — Data diperbarui otomatis
        </p>
      </div>
    </div>
  )
}
