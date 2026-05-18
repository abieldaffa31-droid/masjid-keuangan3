import { supabase } from '@/lib/supabase'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BookOpen, Smartphone, ShoppingBag, TrendingUp } from 'lucide-react'
import { InputJumatDialog } from './InputJumatDialog'
import { CetakInvoiceButton } from './CetakInvoiceButton'

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export default async function JumatPage() {
  const { data: jumatList } = await supabase
    .from('infaq_jumat')
    .select('*')
    .order('tanggal_jumat', { ascending: false })

  const list = jumatList ?? []

  // Ambil semua transaksi masuk untuk menghitung online infaq per pekan
  let onlinePerPekan: Record<string, number> = {}
  if (list.length > 0) {
    const dateMin = list[list.length - 1].tanggal_jumat
    const dateMax = addDays(list[0].tanggal_jumat, 6)
    const { data: masukList } = await supabase
      .from('transaksi')
      .select('tanggal, jumlah, kategori')
      .gte('tanggal', dateMin)
      .lte('tanggal', dateMax)
      .eq('jenis', 'masuk')

    // Kelompokkan ke pekan masing-masing (tanggal_jumat sebagai key)
    if (masukList) {
      for (const row of list) {
        const weekEnd = addDays(row.tanggal_jumat, 6)
        onlinePerPekan[row.tanggal_jumat] = masukList
          .filter(t =>
            t.tanggal >= row.tanggal_jumat &&
            t.tanggal <= weekEnd &&
            !/wakaf/i.test(t.kategori ?? '')
          )
          .reduce((s, t) => s + t.jumlah, 0)
      }
    }
  }

  const totalKotak  = list.reduce((s, j) => s + j.jumlah_kotak, 0)
  const totalOnline = list.reduce((s, j) => s + (onlinePerPekan[j.tanggal_jumat] ?? 0), 0)
  const grandTotal  = totalKotak + totalOnline
  const jumlahPerkan = list.length
  const rataRata    = jumlahPerkan > 0 ? grandTotal / jumlahPerkan : 0

  const now = new Date()
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const jumatBulanIni = list.filter((j) => j.tanggal_jumat.startsWith(bulanIni))
  const totalBulanIni = jumatBulanIni.reduce((s, j) =>
    s + j.jumlah_kotak + (onlinePerPekan[j.tanggal_jumat] ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Infaq Jumat</h2>
          <p className="text-sm text-gray-500">Rekap kotak amal & transfer online per pekan</p>
        </div>
        <InputJumatDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Kotak Amal</p>
              <p className="text-xl font-bold text-green-700">{formatRupiah(totalKotak)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Online</p>
              <p className="text-xl font-bold text-blue-700">{formatRupiah(totalOnline)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <BookOpen className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bulan Ini</p>
              <p className="text-xl font-bold text-amber-700">{formatRupiah(totalBulanIni)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rata-rata/Pekan</p>
              <p className="text-xl font-bold text-purple-700">{formatRupiah(rataRata)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Rekap Per Pekan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Tanggal Jumat</TableHead>
                <TableHead className="text-right">Kotak Amal (Rp)</TableHead>
                <TableHead className="text-right">Online (Rp)</TableHead>
                <TableHead className="text-right">Total (Rp)</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length > 0 ? (
                <>
                  {list.map((j, idx) => {
                    const online = onlinePerPekan[j.tanggal_jumat] ?? 0
                    const total  = j.jumlah_kotak + online
                    return (
                    <TableRow key={j.id} className="hover:bg-gray-50">
                      <TableCell className="text-center text-gray-400 text-sm">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{formatTanggal(j.tanggal_jumat)}</TableCell>
                      <TableCell className="text-right text-sm">{formatRupiah(j.jumlah_kotak)}</TableCell>
                      <TableCell className="text-right text-sm">{formatRupiah(online)}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-green-700">
                        {formatRupiah(total)}
                      </TableCell>
                      <TableCell>
                        <CetakInvoiceButton tanggal={j.tanggal_jumat} />
                      </TableCell>
                    </TableRow>
                    )
                  })}
                  <TableRow className="bg-green-50 font-bold">
                    <TableCell colSpan={2} className="text-sm font-bold text-gray-700 border-t-2 border-green-200">
                      Total Keseluruhan
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-green-700">
                      {formatRupiah(totalKotak)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-blue-700">
                      {formatRupiah(totalOnline)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-gray-800">
                      {formatRupiah(grandTotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Belum ada data infaq Jumat
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
