import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { formatRupiah } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Wallet, CheckCircle } from 'lucide-react'
import { TambahQurbanDialog } from './TambahQurbanDialog'
import { HapusQurbanButton } from './HapusQurbanButton'
import { EditKambingButton } from './EditKambingButton'
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

  // Sapi: grup penuh (7 orang) + 1 ekor penuh
  const sapiGrupCount: Record<string, number> = {}
  for (const r of sapiList.filter(r => r.keterangan !== '1_ekor_penuh')) {
    const g = r.grup ?? 'Tanpa Grup'
    sapiGrupCount[g] = (sapiGrupCount[g] ?? 0) + 1
  }
  const sapiGrupPenuh   = Object.values(sapiGrupCount).filter(n => n === 7).length
  const sapi1EkorPenuh  = sapiList.filter(r => r.keterangan === '1_ekor_penuh').length
  const jumlahSapi      = sapiGrupPenuh + sapi1EkorPenuh
  const sapiGrupSet     = new Set(sapiList.filter(r => r.keterangan !== '1_ekor_penuh').map(r => r.grup).filter(Boolean))

  // Grup per tipe untuk sapi (exclude 1 ekor penuh)
  function sapiGrupByTipe(tipe: string) {
    const rows = sapiList.filter(r => r.tipe === tipe && r.keterangan !== '1_ekor_penuh')
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
  const sapiEkonomis = sapiGrupByTipe('Ekonomis')
  const sapi1EkorList = sapiList.filter(r => r.keterangan === '1_ekor_penuh')

  // Kambing per tipe
  const kambingByTipe = kambingList.reduce<Record<string, number>>((a, r) => {
    const jumlah = (r as Row & { jumlah?: number }).jumlah ?? 1
    a[r.tipe] = (a[r.tipe] ?? 0) + jumlah; return a
  }, {})
  const totalKambing = Object.values(kambingByTipe).reduce((s, n) => s + n, 0)
  const kambingInitialCounts = Object.fromEntries(HARGA_KAMBING.map(o => [o.tipe, kambingByTipe[o.tipe] ?? 0]))

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
          { label: 'Diamond',  grups: sapiDiamond },
          { label: 'Platinum', grups: sapiPlatinum },
          { label: 'Gold',     grups: sapiGold },
          { label: 'Ekonomis', grups: sapiEkonomis },
        ].map(({ label, grups }) => {
          const grupEntries = Object.entries(grups)
          if (grupEntries.length === 0) return null
          return (
            <Card key={label} className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Tipe {label}</span>
                  <span className="text-xs text-gray-400">{grupEntries.reduce((s, [, r]) => s + r.length, 0)} shohibul</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grupEntries.map(([grupName, members]) => (
                    <div key={grupName} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">{grupName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${members.length === 7 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {members.length}/7
                        </span>
                      </div>
                      <ol className="space-y-0.5">
                        {Array.from({ length: 7 }, (_, i) => {
                          const m = members[i]
                          return (
                            <li key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="text-gray-300 w-4 shrink-0">{i + 1}.</span>
                              {m ? (
                                <span className="flex-1 text-gray-700">{m.nama_pemilik}</span>
                              ) : (
                                <span className="flex-1 text-gray-200 italic">— kosong —</span>
                              )}
                              {m && <HapusQurbanButton id={m.id} nama={m.nama_pemilik ?? ''} />}
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

        {/* Sapi 1 ekor penuh */}
        {sapi1EkorList.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm">1 Ekor Penuh (Keluarga)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {sapi1EkorList.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 w-6 shrink-0">{i + 1}.</span>
                  <span className="flex-1 font-medium text-gray-700">{r.nama_pemilik}</span>
                  <span className="text-xs text-gray-400 mr-3">{r.tipe} · {formatRupiah(r.harga)}</span>
                  <HapusQurbanButton id={r.id} nama={r.nama_pemilik ?? ''} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── KAMBING ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">🐐 Kambing — {totalKambing} ekor</h3>
          <EditKambingButton initialCounts={kambingInitialCounts} />
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            {totalKambing === 0 ? (
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

      {/* ── Tabel semua peserta (sapi) ───────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daftar Peserta Sapi</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10 text-center">No</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Grup</TableHead>
                <TableHead>Nama Shohibul Qurban</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Harga (Rp)</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sapiList.length > 0 ? (
                sapiList.map((r, idx) => (
                  <TableRow key={r.id} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-400 text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{r.tipe}{r.keterangan === '1_ekor_penuh' ? ' 🏠' : ''}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.grup || (r.keterangan === '1_ekor_penuh' ? '1 ekor penuh' : '-')}</TableCell>
                    <TableCell className="text-sm font-medium">{r.nama_pemilik || '-'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-orange-600 whitespace-nowrap">
                      {formatRupiah(r.harga)}
                    </TableCell>
                    <TableCell>
                      <HapusQurbanButton id={r.id} nama={r.nama_pemilik ?? `#${r.id}`} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                    Belum ada data sapi
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
