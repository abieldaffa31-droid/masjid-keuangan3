import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

const TARGET_BULANAN  = 25_000_000
const TARGET_WAKAF    = 2_500_000_000
const WAKAF_AWAL      = 1_447_439_609

function formatTanggalLong(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}

function formatTanggalShort(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long',
  }).format(new Date(dateStr + 'T00:00:00'))
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default async function InvoicePage({
  params,
}: {
  params: { tanggal: string }
}) {
  noStore()
  const { tanggal } = params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) notFound()

  // Tanggal Jumat ini = tanggal (hari MC mengumumkan)
  // Data yang diumumkan = pekan LALU:
  //   - Kotak amal: Jumat pekan lalu (tanggal - 7)
  //   - Online & pengeluaran: dari Jumat lalu s/d Kamis kemarin (tanggal-7 s/d tanggal-1)
  const prevFriday = addDays(tanggal, -7)   // e.g. 8 Mei
  const weekEnd    = addDays(tanggal, -1)   // e.g. 14 Mei

  const bulan = prevFriday.slice(0, 7)       // YYYY-MM (bulan pekan lalu)
  const bulanIni = tanggal.slice(0, 7)       // YYYY-MM bulan sekarang
  const [thn, bln] = bulanIni.split('-').map(Number)

  const [jumatResult, transaksiMasukResult, transaksiKeluarResult, jumatBulanResult, wakafResult] =
    await Promise.all([
      // Infaq Jumat pekan lalu (kotak amal saja)
      supabase
        .from('infaq_jumat')
        .select('*')
        .eq('tanggal_jumat', prevFriday)
        .single(),

      // Semua transaksi MASUK pekan lalu (untuk infaq online)
      supabase
        .from('transaksi')
        .select('jumlah, kategori, uraian, tanggal')
        .gte('tanggal', prevFriday)
        .lte('tanggal', weekEnd)
        .eq('jenis', 'masuk')
        .order('tanggal', { ascending: true }),

      // Transaksi KELUAR pekan lalu (pengeluaran)
      supabase
        .from('transaksi')
        .select('jumlah, kategori, uraian, tanggal')
        .gte('tanggal', prevFriday)
        .lte('tanggal', weekEnd)
        .eq('jenis', 'keluar')
        .order('tanggal', { ascending: true }),

      // Semua infaq jumat bulan ini s/d pekan ini (progress + nomor invoice)
      supabase
        .from('infaq_jumat')
        .select('tanggal_jumat, total')
        .gte('tanggal_jumat', `${bulanIni}-01`)
        .lte('tanggal_jumat', tanggal)
        .order('tanggal_jumat', { ascending: true }),

      // Total wakaf
      supabase.from('wakaf').select('jumlah'),
    ])

  if (!jumatResult.data) notFound()

  const jumat            = jumatResult.data
  const masukList        = transaksiMasukResult.data ?? []
  const keluarList       = transaksiKeluarResult.data ?? []
  const jumatBulanIni    = jumatBulanResult.data ?? []

  // Invoice number: JMT/MM/NNN
  const invoiceSeq = jumatBulanIni.length
  const invoiceNo  = `JMT/${String(bln).padStart(2, '0')}/${String(invoiceSeq).padStart(3, '0')}`

  // Pemasukan
  const pemasukanKotak  = jumat.jumlah_kotak ?? 0
  // Infaq online = semua masuk di transaksi, kecuali wakaf (tracked terpisah)
  const pemasukanOnline = masukList
    .filter(t => !/wakaf/i.test(t.kategori ?? ''))
    .reduce((s, t) => s + t.jumlah, 0)
  const totalPemasukan  = pemasukanKotak + pemasukanOnline

  // Pengeluaran per kategori
  const pengeluaranMap: Record<string, number> = {}
  for (const t of keluarList) {
    const kat = t.kategori ?? 'Lain-lain'
    pengeluaranMap[kat] = (pengeluaranMap[kat] ?? 0) + t.jumlah
  }
  const pengeluaranEntries = Object.entries(pengeluaranMap)
  const totalPengeluaran   = pengeluaranEntries.reduce((s, [, v]) => s + v, 0)

  // Progress bulanan
  const totalBulanIni = jumatBulanIni.reduce((s, j) => s + (j.total ?? 0), 0)
  const sisaTarget    = Math.max(TARGET_BULANAN - totalBulanIni, 0)

  // Wakaf
  const totalWakafDB  = wakafResult.data?.reduce((s, w) => s + w.jumlah, 0) ?? 0
  const totalWakaf    = totalWakafDB || WAKAF_AWAL
  const sisaWakaf     = Math.max(TARGET_WAKAF - totalWakaf, 0)
  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)

  const bulanNama = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(`${bulanIni}-01T00:00:00`))

  const periodeLabel = `${formatTanggalShort(prevFriday)} – ${formatTanggalShort(weekEnd)}, ${thn}`

  return (
    <>
      {/* Toolbar layar */}
      <div className="print:hidden flex items-center justify-between px-4 py-3 bg-gray-100 border-b">
        <p className="text-sm text-gray-600">
          Invoice <span className="font-semibold text-gray-800">{invoiceNo}</span>
          {' · '}Dibacakan Jum&apos;at {formatTanggalLong(tanggal)}
        </p>
        <PrintButton />
      </div>

      {/* ── DOKUMEN INVOICE ─────────────────────────────────────── */}
      <div
        id="invoice"
        className="bg-white mx-auto w-full max-w-[720px] print:max-w-full"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* HEADER */}
        <div className="bg-[#1E5631] text-white px-8 py-6 print:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl">
                🕌
              </div>
              <div>
                <p className="text-xl font-bold tracking-wide">MASJID POGUNG RAYA</p>
                <p className="text-green-200 text-xs mt-0.5">Jl. Pogung Raya, Sleman, Daerah Istimewa Yogyakarta</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-200 uppercase tracking-widest">No. Invoice</p>
              <p className="text-lg font-bold font-mono">{invoiceNo}</p>
            </div>
          </div>
        </div>

        {/* JUDUL */}
        <div className="bg-[#2d7a47] text-white px-8 py-3 print:px-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-wider uppercase">Laporan Keuangan Jum&apos;at</p>
            <p className="text-green-200 text-xs mt-0.5">Periode: {periodeLabel}</p>
          </div>
          <p className="text-xs text-green-200">Dibacakan: {formatTanggalLong(tanggal)}</p>
        </div>

        {/* BODY */}
        <div className="px-8 py-6 print:px-10 space-y-5">

          {/* PEMASUKAN */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E5631] border-b-2 border-[#1E5631] pb-1 mb-2">
              Pemasukan
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm py-0.5">
                <div>
                  <span className="text-gray-700">Infaq Jum&apos;at – Kotak Amal</span>
                  <span className="ml-2 text-xs text-gray-400">({formatTanggalShort(prevFriday)})</span>
                </div>
                <span className="font-medium tabular-nums">{formatRupiah(pemasukanKotak)}</span>
              </div>
              <div className="flex justify-between text-sm py-0.5">
                <div>
                  <span className="text-gray-700">Infaq Online (QRIS + Transfer)</span>
                  <span className="ml-2 text-xs text-gray-400">({formatTanggalShort(prevFriday)} – {formatTanggalShort(weekEnd)})</span>
                </div>
                <span className="font-medium tabular-nums">{formatRupiah(pemasukanOnline)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-2 pt-2">
              <span className="uppercase tracking-wide text-[#1E5631]">Total Pemasukan</span>
              <span className="text-[#1E5631] tabular-nums">{formatRupiah(totalPemasukan)}</span>
            </div>
          </section>

          {/* PENGELUARAN */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-700 border-b-2 border-red-200 pb-1 mb-2">
              Pengeluaran
              <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">
                ({formatTanggalShort(prevFriday)} – {formatTanggalShort(weekEnd)})
              </span>
            </h3>
            {pengeluaranEntries.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-1">Tidak ada pengeluaran pekan ini</p>
            ) : (
              <div className="space-y-1">
                {pengeluaranEntries.map(([kat, jml]) => (
                  <div key={kat} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-600">{kat}</span>
                    <span className="font-medium tabular-nums">{formatRupiah(jml)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-2 pt-2">
              <span className="uppercase tracking-wide text-red-700">Total Pengeluaran</span>
              <span className="text-red-700 tabular-nums">{formatRupiah(totalPengeluaran)}</span>
            </div>
          </section>

          {/* TARGET INFAQ BULANAN */}
          <section className="border border-green-200 rounded-lg p-4 bg-green-50">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1E5631] mb-2">
              Target Infaq Bulanan — {bulanNama}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Target</span>
                <span className="font-medium tabular-nums">{formatRupiah(TARGET_BULANAN)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sudah terkumpul</span>
                <span className="font-semibold text-[#1E5631] tabular-nums">{formatRupiah(totalBulanIni)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sisa target</span>
                <span className={`font-semibold tabular-nums ${sisaTarget === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {sisaTarget === 0 ? '✓ Tercapai' : formatRupiah(sisaTarget)}
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1E5631] rounded-full"
                style={{ width: `${Math.min((totalBulanIni / TARGET_BULANAN) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-green-700 mt-1 text-right font-medium">
              {((totalBulanIni / TARGET_BULANAN) * 100).toFixed(1)}% tercapai
            </p>
          </section>

          {/* UPDATE WAKAF */}
          <section className="border border-emerald-300 rounded-lg p-4 bg-emerald-50">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-2">
              🏡 Update Program Wakaf Pembebasan Lahan
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Target wakaf</span>
                <span className="font-medium tabular-nums">{formatRupiah(TARGET_WAKAF)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dana terkumpul</span>
                <span className="font-semibold text-emerald-700 tabular-nums">{formatRupiah(totalWakaf)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Masih dibutuhkan</span>
                <span className="font-bold text-orange-600 tabular-nums">{formatRupiah(sisaWakaf)}</span>
              </div>
            </div>
            <div className="mt-2 h-2.5 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-700 rounded-full"
                style={{ width: `${progressWakaf}%` }}
              />
            </div>
            <p className="text-xs text-emerald-700 mt-1 text-right font-medium">
              {progressWakaf.toFixed(1)}% dari target
            </p>
          </section>

        </div>

        {/* TTD */}
        <div className="px-8 print:px-10 pb-8 border-t border-gray-200 pt-5">
          <div className="flex justify-between items-start">
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Ditetapkan di: Sleman</p>
              <p>Tanggal: {formatTanggalLong(tanggal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">Bendahara Masjid Pogung Raya</p>
              <div className="mt-12 border-b border-gray-400 w-44" />
              <p className="text-xs text-gray-500 mt-1">(Tanda Tangan)</p>
            </div>
          </div>
        </div>

        <div className="hidden print:block text-center text-xs text-gray-400 pb-4">
          Dicetak dari Sistem Informasi Keuangan Masjid Pogung Raya
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm 15mm; }
          body { background: white !important; }
          #invoice { box-shadow: none !important; }
        }
      `}</style>
    </>
  )
}
