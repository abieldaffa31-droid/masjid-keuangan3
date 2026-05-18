import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Beef,
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
        .select('jenis, jumlah, kategori'),
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
        .select('jenis_hewan, grup, harga, status, jumlah'),
    ])

  // Saldo operasional = semua masuk (non-wakaf) - semua keluar
  const saldoBank = (transaksiResult.data ?? []).reduce((s, t) => {
    if (t.jenis === 'masuk' && !/wakaf/i.test(t.kategori ?? '')) return s + t.jumlah
    if (t.jenis === 'keluar') return s - t.jumlah
    return s
  }, 0)

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
  // Sapi = jumlah grup penuh (7 orang)
  const sapiGrupCount: Record<string, number> = {}
  for (const r of qurbanList.filter(r => r.jenis_hewan === 'Sapi')) {
    const g = r.grup ?? ''
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const qurbanSapi    = Object.values(sapiGrupCount).filter(n => n === 7).length
  const qurbanKambing = qurbanList
    .filter(r => r.jenis_hewan === 'Kambing')
    .length
  const totalQurbanHarga = qurbanList.reduce((s, r) => s + (r.harga ?? 0), 0)

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
    totalQurbanHarga,
  }
}

export default async function DashboardPage() {
  const { saldoBank, totalMasuk, totalKeluar, totalWakaf, totalJumatBulanIni, jumatCount, qurbanTotal, qurbanSapi, qurbanKambing, totalQurbanHarga } =
    await getDashboardData()

  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)

  const kpiCards = [
    {
      title: 'Saldo Bank',
      value: formatRupiah(saldoBank),
      icon: Wallet,
      color: 'text-green-600',
      bg: 'bg-green-50',
      badge: 'Saldo Saat Ini',
    },
    {
      title: 'Total Pemasukan Bulan Ini',
      value: formatRupiah(totalMasuk),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      badge: '↑ Pemasukan',
    },
    {
      title: 'Total Pengeluaran Bulan Ini',
      value: formatRupiah(totalKeluar),
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
      badge: '↓ Pengeluaran',
    },
    {
      title: 'Infaq Jumat Bulan Ini',
      value: formatRupiah(totalJumatBulanIni),
      icon: Heart,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      badge: `${jumatCount} Pekan`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <Badge variant="secondary" className="text-xs">
                    {card.badge}
                  </Badge>
                </div>
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Qurban */}
      {qurbanTotal > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-xl">
                  <Beef className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Program Qurban</p>
                  <p className="text-xs text-gray-400">{formatRupiah(totalQurbanHarga)}</p>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-orange-600">{qurbanSapi}</p>
                  <p className="text-xs text-gray-400">🐄 Sapi</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-600">{qurbanKambing}</p>
                  <p className="text-xs text-gray-400">🐐 Kambing</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sumber Pemasukan */}
      <SumberPemasukanChart />

      {/* Progress Wakaf */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Heart className="w-5 h-5 text-green-600" />
            Program Wakaf Pembebasan Lahan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-500">Terkumpul</p>
              <p className="text-3xl font-bold text-green-700">
                {formatRupiah(totalWakaf)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Target</p>
              <p className="text-xl font-semibold text-gray-700">
                {formatRupiah(TARGET_WAKAF)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progressWakaf} className="h-4 bg-green-100" />
            <div className="flex justify-between text-sm">
              <span className="text-green-700 font-semibold">
                {progressWakaf.toFixed(1)}% tercapai
              </span>
              <span className="text-gray-500">
                Sisa: {formatRupiah(TARGET_WAKAF - totalWakaf)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {progressWakaf.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Progres</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-700">
                {(totalWakaf / 1_000_000_000).toFixed(3)}
                <span className="text-base font-normal"> M</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Terkumpul</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {((TARGET_WAKAF - totalWakaf) / 1_000_000_000).toFixed(3)}
                <span className="text-base font-normal"> M</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Perlu Dicapai</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaksi Terkini & Ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTransaksi />
        <RingkasanBulan totalMasuk={totalMasuk} totalKeluar={totalKeluar} saldo={saldoBank} />
      </div>
    </div>
  )
}

async function RecentTransaksi() {
  const { data } = await supabase
    .from('transaksi')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(6)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-gray-800">Transaksi Terkini</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-full ${
                    t.jenis === 'masuk' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {t.jenis === 'masuk' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{t.uraian}</p>
                  <p className="text-xs text-gray-400">
                    {new Intl.DateTimeFormat('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(t.tanggal))}
                    {' · '}
                    {t.kategori}
                  </p>
                </div>
              </div>
              <p
                className={`text-sm font-semibold ${
                  t.jenis === 'masuk' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {t.jenis === 'masuk' ? '+' : '-'}
                {formatRupiah(t.jumlah)}
              </p>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada transaksi</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RingkasanBulan({
  totalMasuk,
  totalKeluar,
  saldo,
}: {
  totalMasuk: number
  totalKeluar: number
  saldo: number
}) {
  const selisih = totalMasuk - totalKeluar

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-gray-800">Ringkasan Bulan Ini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Total Pemasukan</span>
            </div>
            <span className="font-semibold text-green-600">{formatRupiah(totalMasuk)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">Total Pengeluaran</span>
            </div>
            <span className="font-semibold text-red-600">{formatRupiah(totalKeluar)}</span>
          </div>

          <div
            className={`flex justify-between items-center p-3 rounded-lg ${
              selisih >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}
          >
            <span className="text-sm text-gray-600">Selisih Bulan Ini</span>
            <span className={`font-bold ${selisih >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {selisih >= 0 ? '+' : ''}
              {formatRupiah(selisih)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Saldo Bank Saat Ini</span>
            <span className="text-lg font-bold text-green-700">{formatRupiah(saldo)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
