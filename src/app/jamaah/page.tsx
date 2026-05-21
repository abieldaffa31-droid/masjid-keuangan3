import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { PrintButton } from './PrintButton'
import { DateRangePicker } from './DateRangePicker'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const TARGET_WAKAF = 2_500_000_000
const CURRENT_WAKAF_DEFAULT = 1_447_439_609
const WAKAF_SALDO_AWAL      = 1_447_439_609   // saldo sebelum transaksi_wakaf dicatat di DB

async function getData(dari: string, sampai: string) {
  noStore()
  const now = new Date()
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const [thn, bln] = bulanIni.split('-').map(Number)
  const lastDay = new Date(thn, bln, 0).getDate()

  const [wakafRes, transBulanRes, transPerkanRes, jumatRes, qurbanRes] = await Promise.all([
    supabase.from('transaksi_wakaf').select('uang_masuk').gt('uang_masuk', 0),
    supabase.from('transaksi').select('jenis, jumlah, kategori')
      .gte('tanggal', `${bulanIni}-01`)
      .lte('tanggal', `${bulanIni}-${String(lastDay).padStart(2,'0')}`),
    supabase.from('transaksi').select('jenis, jumlah, kategori')
      .gte('tanggal', dari)
      .lte('tanggal', sampai)
      .eq('jenis', 'keluar'),
    supabase.from('infaq_jumat').select('tanggal_jumat, jumlah_kotak')
      .gte('tanggal_jumat', `${bulanIni}-01`)
      .lte('tanggal_jumat', `${bulanIni}-${String(lastDay).padStart(2,'0')}`),
    supabase.from('hewan_qurban').select('jenis_hewan, grup, harga, status, keterangan, jumlah'),
  ])

  // Wakaf — saldo awal + sum semua transaksi di transaksi_wakaf
  const totalBSIWakaf = wakafRes.data?.reduce((s, w) => s + (w.uang_masuk ?? 0), 0) ?? 0
  const totalWakaf = WAKAF_SALDO_AWAL + totalBSIWakaf
  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)

  // Bulan ini — pemasukan online only (QRIS + transfer bank, exclude tunai/kotak)
  const KATEGORI_ONLINE = new Set(['INFAQ QRIS', 'DONASI TRANSFER'])
  let pemasukanOnline = 0, pengeluaranBulan = 0
  transBulanRes.data?.forEach(t => {
    if (t.jenis === 'masuk') {
      if (KATEGORI_ONLINE.has(t.kategori)) pemasukanOnline += t.jumlah
    } else {
      pengeluaranBulan += t.jumlah
    }
  })

  // Infaq Jumat bulan ini
  const infaqJumatBulan = jumatRes.data?.reduce((s, j) => s + j.jumlah_kotak, 0) ?? 0

  // Pengeluaran periode custom by kategori
  const keluarPerKategori: Record<string, number> = {}
  transPerkanRes.data?.forEach(t => {
    const k = t.kategori || 'Lainnya'
    keluarPerKategori[k] = (keluarPerKategori[k] ?? 0) + t.jumlah
  })
  const totalKeluarPeriode = Object.values(keluarPerKategori).reduce((s, n) => s + n, 0)
  const keluarSorted = Object.entries(keluarPerKategori).sort((a, b) => b[1] - a[1])

  // Qurban — fix kambing count pakai kolom jumlah
  const qurbanList = qurbanRes.data ?? []
  const sapiList = qurbanList.filter(r => r.jenis_hewan === 'Sapi')
  const sapiGrupCount: Record<string, number> = {}
  for (const r of sapiList.filter(r => r.keterangan !== '1_ekor_penuh')) {
    const g = r.grup ?? ''
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const jumlahSapi = Object.values(sapiGrupCount).filter(n => n === 7).length
    + sapiList.filter(r => r.keterangan === '1_ekor_penuh').length
  const jumlahKambing = qurbanList
    .filter(r => r.jenis_hewan === 'Kambing')
    .reduce((s, r) => s + ((r as { jumlah?: number }).jumlah ?? 1), 0)
  const lunas = sapiList.filter(r => r.status === 'Lunas').length
  const totalPeserta = sapiList.length

  const tanggalUpdate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(now)
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)

  return {
    totalWakaf, progressWakaf,
    pemasukanOnline, pengeluaranBulan, infaqJumatBulan,
    keluarSorted, totalKeluarPeriode,
    jumlahSapi, jumlahKambing, lunas, totalPeserta,
    tanggalUpdate, namaBulan,
  }
}

const KATEGORI_COLOR: Record<string, string> = {
  // Keluar (COA)
  'IBADAH & DAKWAH':  'bg-emerald-500',
  'KERUMAHTANGGAAN':  'bg-blue-500',
  'MEDIA':            'bg-violet-500',
  'OPERASIONAL UMUM': 'bg-amber-500',
  'TITIPAN KELUAR':   'bg-rose-400',
  'TITIPAN':          'bg-pink-400',
  // Masuk (COA)
  'INFAQ QRIS':       'bg-sky-500',
  'INFAQ TUNAI':      'bg-green-500',
  'DONASI TRANSFER':  'bg-teal-500',
  'TITIPAN MASUK':    'bg-indigo-400',
  'UANG MASUK':       'bg-cyan-500',
}
function getColor(k: string) { return KATEGORI_COLOR[k] ?? 'bg-slate-400' }

interface PageProps {
  searchParams: { dari?: string; sampai?: string }
}

export default async function JamaahPage({ searchParams }: PageProps) {
  const now = new Date()
  // Default: awal bulan s/d hari ini
  const defaultDari = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const defaultSampai = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const dari = searchParams.dari ?? defaultDari
  const sampai = searchParams.sampai ?? defaultSampai

  const d = await getData(dari, sampai)

  const fmtTgl = (s: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="bg-green-800 text-white rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Masjid Pogung Raya</h1>
            <p className="text-green-300 text-sm mt-0.5">Laporan Keuangan untuk Jamaah</p>
            <p className="text-green-200 text-xs mt-1">{d.tanggalUpdate}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <Image src="/logo.png" alt="Logo Masjid Pogung Raya" width={80} height={42} className="object-contain" />
            <PrintButton />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">Pemasukan Online {d.namaBulan}</p>
            <p className="text-xl font-bold text-green-600">{formatRupiah(d.pemasukanOnline)}</p>
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
            <p className={`text-xl font-bold ${d.pemasukanOnline - d.pengeluaranBulan >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
              {d.pemasukanOnline - d.pengeluaranBulan >= 0 ? '+' : ''}{formatRupiah(d.pemasukanOnline - d.pengeluaranBulan)}
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
          <div className="w-full bg-green-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-5 bg-green-500 rounded-full flex items-center justify-end pr-2"
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

        {/* Pengeluaran custom & Qurban */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Pengeluaran per kategori — custom date */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-2">📊 Pengeluaran per Kategori</h2>
            <DateRangePicker dari={dari} sampai={sampai} />
            <p className="text-xs text-gray-400 mt-2 mb-4">
              {fmtTgl(dari)} – {fmtTgl(sampai)} · Total: <strong>{formatRupiah(d.totalKeluarPeriode)}</strong>
            </p>
            {d.keluarSorted.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada pengeluaran periode ini</p>
            ) : (
              <div className="space-y-2.5">
                {d.keluarSorted.map(([kat, jumlah]) => {
                  const pct = d.totalKeluarPeriode > 0 ? (jumlah / d.totalKeluarPeriode) * 100 : 0
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
                <span className="text-gray-500">Total peserta sapi</span>
                <span className="font-semibold">{d.totalPeserta} orang</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sudah lunas</span>
                <span className="font-semibold text-green-600">{d.lunas} orang</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs pb-2">
          © 2025 Masjid Pogung Raya — Data diperbarui otomatis
        </p>
      </div>
    </div>
  )
}
