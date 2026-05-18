import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import {
  TrendingUp,
  TrendingDown,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Beef,
  Wallet,
} from 'lucide-react'
import { SumberPemasukanChart } from './SumberPemasukanChart'

const TARGET_WAKAF = 2_500_000_000
const CURRENT_WAKAF_DEFAULT = 1_447_439_609

async function getDashboardData() {
  const now = new Date()
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [transaksiResult, transaksibulanResult, wakafResult, jumatResult, qurbanResult] =
    await Promise.all([
      supabase
        .from('transaksi')
        .select('saldo')
        .order('id', { ascending: false })
        .limit(1),
      supabase
        .from('transaksi')
        .select('jenis, jumlah')
        .gte('tanggal', `${bulanIni}-01`)
        .lte('tanggal', `${bulanIni}-31`),
      supabase.from('wakaf').select('jumlah'),
      supabase
        .from('infaq_jumat')
        .select('tanggal_jumat, total')
        .gte('tanggal_jumat', `${bulanIni}-01`)
        .order('tanggal_jumat', { ascending: false }),
      supabase
        .from('hewan_qurban')
        .select('jenis_hewan, grup, harga, status, keterangan, jumlah'),
    ])

  const saldoBank = transaksiResult.data?.[0]?.saldo ?? 0

  let totalMasuk = 0
  let totalKeluar = 0
  transaksibulanResult.data?.forEach((t) => {
    if (t.jenis === 'masuk') totalMasuk += t.jumlah
    else totalKeluar += t.jumlah
  })

  const totalWakafDB = wakafResult.data?.reduce((sum, w) => sum + w.jumlah, 0) ?? 0
  const totalWakaf = totalWakafDB || CURRENT_WAKAF_DEFAULT

  const totalJumatBulanIni =
    jumatResult.data?.reduce((sum, j) => sum + (j.total ?? 0), 0) ?? 0

  const qurbanList = qurbanResult.data ?? []
  const sapiList = qurbanList.filter(r => r.jenis_hewan === 'Sapi')
  const sapiGrupCount: Record<string, number> = {}
  for (const r of sapiList.filter(r => r.keterangan !== '1_ekor_penuh')) {
    const g = r.grup ?? ''
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const qurbanSapi =
    Object.values(sapiGrupCount).filter(n => n === 7).length +
    sapiList.filter(r => r.keterangan === '1_ekor_penuh').length
  const qurbanKambing = qurbanList
    .filter(r => r.jenis_hewan === 'Kambing')
    .reduce((s, r) => s + ((r as { jumlah?: number }).jumlah ?? 1), 0)

  const bulanNama = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)

  return {
    saldoBank,
    totalMasuk,
    totalKeluar,
    totalWakaf,
    totalJumatBulanIni,
    jumatCount: jumatResult.data?.length ?? 0,
    qurbanTotal: qurbanList.length,
    qurbanSapi,
    qurbanKambing,
    bulanNama,
  }
}

export default async function DashboardPage() {
  const {
    saldoBank, totalMasuk, totalKeluar, totalWakaf,
    totalJumatBulanIni, jumatCount, qurbanTotal,
    qurbanSapi, qurbanKambing, bulanNama,
  } = await getDashboardData()

  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)
  const selisih = totalMasuk - totalKeluar

  return (
    <div className="space-y-5">

      {/* ── HERO SALDO CARD ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#1A3D2B] text-white p-6 md:p-8 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -right-6 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[#6AAF88]" />
            <p className="text-[#A8C5B5] text-sm font-medium">Saldo Operasional</p>
          </div>
          <p className="text-4xl md:text-5xl font-bold tracking-tight mt-1">
            {formatRupiah(saldoBank)}
          </p>
          <p className="text-[#6AAF88] text-sm mt-2">Saldo rekening bank aktif</p>
        </div>

        {/* 3 stat pills */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <p className="text-[#A8D8B8] text-xs">Pemasukan</p>
            </div>
            <p className="text-white font-semibold text-sm">{formatRupiah(totalMasuk)}</p>
            <p className="text-[#6AAF88] text-xs mt-0.5">{bulanNama}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
              <p className="text-[#A8D8B8] text-xs">Pengeluaran</p>
            </div>
            <p className="text-white font-semibold text-sm">{formatRupiah(totalKeluar)}</p>
            <p className="text-[#6AAF88] text-xs mt-0.5">{bulanNama}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Heart className="w-3.5 h-3.5 text-amber-300" />
              <p className="text-[#A8D8B8] text-xs">Infaq Jumat</p>
            </div>
            <p className="text-white font-semibold text-sm">{formatRupiah(totalJumatBulanIni)}</p>
            <p className="text-[#6AAF88] text-xs mt-0.5">{jumatCount} pekan</p>
          </div>
        </div>
      </div>

      {/* ── ROW: Wakaf + Qurban ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Wakaf Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE5D8]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Program Wakaf</p>
              <p className="text-xs text-gray-400">Pembebasan Lahan</p>
            </div>
          </div>

          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Terkumpul</p>
              <p className="text-2xl font-bold text-green-700">{formatRupiah(totalWakaf)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Target</p>
              <p className="text-sm font-semibold text-gray-500">{formatRupiah(TARGET_WAKAF)}</p>
            </div>
          </div>

          <div className="w-full bg-green-100 rounded-full h-2.5 overflow-hidden mb-2">
            <div
              className="h-2.5 bg-green-600 rounded-full transition-all"
              style={{ width: `${progressWakaf}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-700 font-semibold">{progressWakaf.toFixed(1)}% tercapai</span>
            <span className="text-gray-400">Sisa {formatRupiah(TARGET_WAKAF - totalWakaf)}</span>
          </div>
        </div>

        {/* Qurban Summary */}
        {qurbanTotal > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE5D8]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Beef className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Program Qurban</p>
                <p className="text-xs text-gray-400">Tahun ini</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{qurbanSapi}</p>
                <p className="text-xs text-gray-500 mt-1">🐄 Sapi</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{qurbanKambing}</p>
                <p className="text-xs text-gray-500 mt-1">🐐 Kambing</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE5D8] flex items-center justify-center">
            <p className="text-sm text-gray-400">Belum ada data qurban</p>
          </div>
        )}
      </div>

      {/* ── Selisih Bulan + Chart ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Ringkasan Bulan */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EDE5D8] space-y-3">
          <p className="text-sm font-bold text-gray-800">Ringkasan {bulanNama}</p>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Pemasukan</span>
            </div>
            <span className="font-semibold text-green-700 text-sm">{formatRupiah(totalMasuk)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600">Pengeluaran</span>
            </div>
            <span className="font-semibold text-red-600 text-sm">{formatRupiah(totalKeluar)}</span>
          </div>
          <div className={`flex justify-between items-center p-3 rounded-xl ${selisih >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <span className="text-sm text-gray-600">Selisih</span>
            <span className={`font-bold text-sm ${selisih >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {selisih >= 0 ? '+' : ''}{formatRupiah(selisih)}
            </span>
          </div>
        </div>

        {/* Sumber Pemasukan */}
        <div className="lg:col-span-2">
          <SumberPemasukanChart />
        </div>
      </div>

      {/* ── Transaksi Terkini ─────────────────────────────────────── */}
      <RecentTransaksi />
    </div>
  )
}

async function RecentTransaksi() {
  const { data } = await supabase
    .from('transaksi')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(8)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDE5D8] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-800">Transaksi Terkini</p>
      </div>
      <div className="divide-y divide-gray-50">
        {data?.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                t.jenis === 'masuk' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {t.jenis === 'masuk'
                  ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                  : <ArrowDownRight className="w-4 h-4 text-red-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{t.uraian}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(t.tanggal))}
                  </span>
                  {t.kategori && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#F0EAE0] text-[#6A5A45] font-medium">
                        {t.kategori}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p className={`text-sm font-semibold shrink-0 ml-3 ${
              t.jenis === 'masuk' ? 'text-green-600' : 'text-red-500'
            }`}>
              {t.jenis === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
            </p>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada transaksi</p>
        )}
      </div>
    </div>
  )
}
