import { supabase } from '@/lib/supabase'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransaksiFilter } from './TransaksiFilter'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { bulan?: string; kategori?: string }
}

export default async function TransaksiPage({ searchParams }: PageProps) {
  const now = new Date()
  const bulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const bulan = searchParams.bulan ?? bulanDefault
  const kategori = searchParams.kategori ?? 'Semua'

  // Ambil kategori unik dari semua data
  const { data: katRows } = await supabase
    .from('transaksi')
    .select('kategori')
    .not('kategori', 'is', null)
  const kategoriList = ['Semua', ...Array.from(new Set((katRows ?? []).map(r => r.kategori))).sort()]

  // Hitung hari terakhir bulan yang benar (April=30, Februari=28/29, dll)
  const [thn, bln2] = bulan.split('-').map(Number)
  const lastDay = new Date(thn, bln2, 0).getDate()
  const bulanAkhir = `${bulan}-${String(lastDay).padStart(2, '0')}`

  let query = supabase
    .from('transaksi')
    .select('*')
    .gte('tanggal', `${bulan}-01`)
    .lte('tanggal', bulanAkhir)
    .order('tanggal', { ascending: true })

  if (kategori !== 'Semua') {
    query = query.eq('kategori', kategori)
  }

  const { data: transaksi } = await query

  const totalMasuk = transaksi?.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0) ?? 0
  const totalKeluar = transaksi?.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0) ?? 0

  const [tahun, bln] = bulan.split('-')
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(
    new Date(Number(tahun), Number(bln) - 1)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Buku Besar — {namaBulan} {tahun}
          </h2>
          <p className="text-sm text-gray-500">{transaksi?.length ?? 0} transaksi ditemukan</p>
        </div>
        <TransaksiFilter bulan={bulan} kategori={kategori} kategoriList={kategoriList} />
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Masuk</p>
            <p className="text-lg font-bold text-green-600">{formatRupiah(totalMasuk)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Keluar</p>
            <p className="text-lg font-bold text-red-600">{formatRupiah(totalKeluar)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Selisih</p>
            <p className={`text-lg font-bold ${totalMasuk - totalKeluar >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatRupiah(totalMasuk - totalKeluar)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daftar Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Uraian</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Masuk (Rp)</TableHead>
                <TableHead className="text-right">Keluar (Rp)</TableHead>
                <TableHead className="text-right">Saldo (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaksi && transaksi.length > 0 ? (
                transaksi.map((t, idx) => (
                  <TableRow key={t.id} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-400 text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{formatTanggalPendek(t.tanggal)}</TableCell>
                    <TableCell className="text-sm font-medium">{t.uraian}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {t.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600 font-medium">
                      {t.jenis === 'masuk' ? formatRupiah(t.jumlah) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600 font-medium">
                      {t.jenis === 'keluar' ? formatRupiah(t.jumlah) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-gray-700">
                      {formatRupiah(t.saldo)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    Tidak ada transaksi untuk periode ini
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
