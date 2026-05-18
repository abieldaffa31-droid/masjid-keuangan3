import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Wallet, CheckCircle } from 'lucide-react'
import { TambahQurbanDialog } from './TambahQurbanDialog'
import { HARGA_SAPI, HARGA_KAMBING } from './config'

export const dynamic = 'force-dynamic'



const STATUS_COLOR: Record<string, string> = {
  'Lunas':       'bg-green-100 text-green-700',
  'DP':          'bg-yellow-100 text-yellow-700',
  'Belum Bayar': 'bg-red-100 text-red-700',
}

type Row = {
  id: number
  jenis_hewan: string
  tipe: string
  grup: string | null
  nama_pemilik: string | null
  harga: number
  status: string
  keterangan: string | null
  tanggal: string
}

export default async function QurbanPage() {
  noStore()
  const { data } = await supabase
    .from('hewan_qurban')
    .select('*')
    .order('grup', { ascending: true })
    .order('id',   { ascending: true })

  const list: Row[] = data ?? []

  const sapiList    = list.filter(r => r.jenis_hewan === 'Sapi')
  const kambingList = list.filter(r => r.jenis_hewan === 'Kambing')
  const totalHarga  = list.reduce((s, r) => s + (r.harga ?? 0), 0)

  // Jumlah sapi = grup yang sudah penuh (tepat 7 orang)
  const sapiGrupCount: Record<string, number> = {}
  for (const r of sapiList) {
    const g = r.grup ?? 'Tanpa Grup'
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const jumlahSapi      = Object.values(sapiGrupCount).filter(n => n === 7).length
  const sapiGrupSet     = new Set(sapiList.map(r => r.grup).filter(Boolean))

  // Grup per tipe untuk sapi
  function sapiGrupByTipe(tipe: string) {
    const rows = sapiList.filter(r => r.tipe === tipe)
    const grups: Record<string, Row[]> = {}
    for (const r of rows) {
      const g = r.grup ?? 'Tanpa Grup'
      if (!grups[g]) grups[g] = []
      grups[g].push(r)
    }
    return grups
  }

  const sapiDiamond  = sapiGrupByTipe('Diamond')
  const sapiPlatinum = sapiGrupByTipe('Platinum')
  const sapiGold     = sapiGrupByTipe('Gold')

  // Kambing per tipe — pakai kolom jumlah
  const kambingByTipe = kambingList.reduce<Record<string, number>>((a, r) => {
    a[r.tipe] = (a[r.tipe] ?? 0) + 1; return a
  }, {})
  const totalKambing = Object.values(kambingByTipe).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Program Qurban</h2>
          <p className="text-sm text-gray-500">Masjid Pogung Raya</p>
        </div>
        <TambahQurbanDialog />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="text-3xl leading-none">🐄</div>
            <div>
              <p className="text-xs text-gray-500">Total Sapi</p>
              <p className="text-2xl font-bold text-orange-600">{jumlahSapi}</p>
              <p className="text-xs text-gray-400">
                ekor penuh · {sapiGrupSet.size - jumlahSapi > 0 ? `${sapiGrupSet.size - jumlahSapi} proses` : 'semua penuh'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="text-3xl leading-none">🐐</div>
            <div>
              <p className="text-xs text-gray-500">Total Kambing</p>
              <p className="text-2xl font-bold text-amber-600">{totalKambing}</p>
              <p className="text-xs text-gray-400">ekor</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lunas</p>
              <p className="text-2xl font-bold text-blue-600">
                {list.filter(r => r.status === 'Lunas').length}
              </p>
              <p className="text-xs text-gray-400">dari {list.length} peserta</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Referensi harga ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-700">🐄 Referensi Harga Sapi</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 border-b">
                <th className="text-left pb-1">Tipe</th>
                <th className="text-right pb-1">Per Ekor</th>
                <th className="text-right pb-1">1/7 Orang</th>
              </tr></thead>
              <tbody>
                {HARGA_SAPI.map(opt => (
                  <tr key={opt.tipe} className="border-b border-gray-50">
                    <td className="py-1.5 font-medium text-gray-700">{opt.label}</td>
                    <td className="text-right text-gray-500">{formatRupiah(opt.harga_ekor)}</td>
                    <td className="text-right font-semibold text-green-600">{opt.harga_per_orang ? formatRupiah(opt.harga_per_orang) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">✓ Sudah termasuk biaya penyembelihan</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-700">🐐 Referensi Harga Kambing</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 border-b">
                <th className="text-left pb-1">Tipe</th>
                <th className="text-right pb-1">Berat</th>
                <th className="text-right pb-1">Harga</th>
              </tr></thead>
              <tbody>
                {HARGA_KAMBING.map(opt => (
                  <tr key={opt.tipe} className="border-b border-gray-50">
                    <td className="py-1.5 font-medium text-gray-700">{opt.tipe}</td>
                    <td className="text-right text-gray-400">{opt.berat_kg} kg</td>
                    <td className="text-right font-semibold text-amber-600">{formatRupiah(opt.harga_ekor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">+ Biaya sembelih Rp 100.000/ekor</p>
          </CardContent>
        </Card>
      </div>

      {/* ── SAPI ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800">🐄 Sapi — {jumlahSapi} ekor</h3>

        {[
          { label: 'Diamond', color: 'blue',   harga: 4_000_000, grups: sapiDiamond },
          { label: 'Platinum', color: 'purple', harga: 3_750_000, grups: sapiPlatinum },
          { label: 'Gold',     color: 'yellow', harga: 3_500_000, grups: sapiGold },
        ].map(({ label, harga, grups }) => {
          const grupEntries = Object.entries(grups)
          if (grupEntries.length === 0) return null
          return (
            <Card key={label} className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>
                    Tipe {label}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {formatRupiah(harga)}/orang · {grupEntries.length} sapi
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {grupEntries.reduce((s, [, r]) => s + r.length, 0)} shohibul
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grupEntries.map(([grupName, members]) => (
                    <div key={grupName} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">{grupName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          members.length === 7
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {members.length}/7
                        </span>
                      </div>
                      <ol className="space-y-0.5">
                        {Array.from({ length: 7 }, (_, i) => {
                          const m = members[i]
                          return (
                            <li key={i} className="flex gap-1.5 text-xs">
                              <span className="text-gray-300 w-4 shrink-0">{i + 1}.</span>
                              {m ? (
                                <span className="text-gray-700 leading-tight">{m.nama_pemilik}</span>
                              ) : (
                                <span className="text-gray-200 italic">— kosong —</span>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── KAMBING ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800">🐐 Kambing — {kambingList.length} ekor</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            {kambingList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada data kambing</p>
            ) : (
              <div className="space-y-1.5">
                {HARGA_KAMBING.map(opt => {
                  const n = kambingByTipe[opt.tipe] ?? 0
                  return (
                    <div key={opt.tipe} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-gray-700">{opt.tipe}</span>
                        <span className="ml-2 text-xs text-gray-400">{opt.berat_kg} kg · {formatRupiah(opt.harga_ekor)}</span>
                      </div>
                      <span className={`text-base font-bold ${n > 0 ? 'text-amber-600' : 'text-gray-200'}`}>{n} ekor</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tabel semua peserta ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daftar Seluruh Peserta Qurban</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10 text-center">No</TableHead>
                <TableHead>Jenis / Tipe</TableHead>
                <TableHead>Grup / Sapi</TableHead>
                <TableHead>Nama Shohibul Qurban</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Harga (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length > 0 ? (
                list.map((r, idx) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-400 text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.jenis_hewan === 'Sapi' ? '🐄' : '🐐'} {r.jenis_hewan} · {r.tipe}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{r.grup || '-'}</TableCell>
                    <TableCell className="text-sm font-medium">{r.nama_pemilik || '-'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-orange-600 whitespace-nowrap">
                      {formatRupiah(r.harga)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                    Belum ada data. Jalankan <code>npm run seed:qurban</code> setelah setup SQL.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Total Dana ──────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-xl">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Dana Terkumpul</p>
            <p className="text-2xl font-bold text-green-600">{formatRupiah(totalHarga)}</p>
            <p className="text-xs text-gray-400">dari {list.length} peserta · {list.filter(r => r.status === 'Lunas').length} lunas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
