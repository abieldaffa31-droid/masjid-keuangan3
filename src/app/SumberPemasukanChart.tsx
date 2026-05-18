'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── Warna ─────────────────────────────────────────────────────────────────────
const WARNA: Record<string, string> = {
  'QRIS / QR Code': '#2E75B6',
  'QRIS':           '#2E75B6',
  'Transfer Bank':  '#70AD47',
  'Kotak Amal':     '#ED7D31',
  'Tunai':          '#ED7D31',
  'Lainnya':        '#9E9E9E',
}

// Mapping kategori operasional → sumber untuk chart
const KAT_TO_SUMBER: Record<string, string> = {
  'INFAQ QRIS':      'QRIS / QR Code',
  'DONASI TRANSFER': 'Transfer Bank',
  'INFAQ TUNAI':     'Kotak Amal',
}

function warnaFor(name: string) { return WARNA[name] ?? '#9E9E9E' }

// ── Format angka singkat ──────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000)
    return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000)
    return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  return `Rp ${n.toLocaleString('id-ID')}`
}

interface ChartRow { name: string; value: number; count: number; persen: string; fill: string }

function buildRows(entries: { sumber: string; jumlah: number }[]): ChartRow[] {
  const map: Record<string, { total: number; count: number }> = {}
  for (const e of entries) {
    const k = e.sumber || 'Lainnya'
    if (!map[k]) map[k] = { total: 0, count: 0 }
    map[k].total += e.jumlah
    map[k].count += 1
  }
  const grand = Object.values(map).reduce((s, v) => s + v.total, 0)
  return Object.entries(map)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, { total, count }]) => ({
      name,
      value:  total,
      count,
      persen: grand > 0 ? ((total / grand) * 100).toFixed(1) : '0',
      fill:   warnaFor(name),
    }))
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm space-y-0.5">
      <p className="font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-500">{d.count} transaksi</p>
      <p className="text-gray-700 font-medium">{fmt(d.value)}</p>
      <p className="text-gray-400">{d.persen}%</p>
    </div>
  )
}

// ── Card donut ────────────────────────────────────────────────────────────────
function DonutCard({ title, data, loading }: { title: string; data: ChartRow[]; loading: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="border-0 shadow-sm flex-1 min-w-0">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
        {!loading && data.length > 0 && (
          <p className="text-xs text-gray-400">Total: {fmt(total)}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400 animate-pulse">
            Memuat data…
          </div>
        ) : data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Belum ada data
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <ResponsiveContainer width={148} height={148}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%"
                    innerRadius={40} outerRadius={66}
                    dataKey="value" stroke="none" paddingAngle={2}
                  >
                    {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {data.map((d) => (
                <div key={d.name} className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: d.fill }} />
                    <span className="text-xs text-gray-600 leading-tight">{d.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-700">{d.persen}%</p>
                    <p className="text-xs text-gray-400">{fmt(d.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SumberPemasukanChart() {
  const [opRows,  setOpRows]  = useState<ChartRow[]>([])
  const [wkRows,  setWkRows]  = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [opRes, wkRes] = await Promise.all([
        // Operasional: ambil kategori dari transaksi masuk
        supabase
          .from('transaksi')
          .select('kategori, jumlah')
          .eq('jenis', 'masuk')
          .gt('jumlah', 0),
        // Wakaf: ambil sumber dari transaksi_wakaf
        supabase
          .from('transaksi_wakaf')
          .select('sumber, uang_masuk')
          .gt('uang_masuk', 0),
      ])

      // Map kategori operasional ke label sumber yang bersih
      const opEntries = (opRes.data ?? []).map(r => ({
        sumber: KAT_TO_SUMBER[r.kategori] ?? 'Lainnya',
        jumlah: r.jumlah,
      }))

      const wkEntries = (wkRes.data ?? [])
        .filter(r => r.sumber !== 'Saldo Awal')
        .map(r => ({ sumber: r.sumber || 'Lainnya', jumlah: r.uang_masuk }))

      setOpRows(buildRows(opEntries))
      setWkRows(buildRows(wkEntries))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-gray-800">Sumber Pemasukan</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Auto-update dari CSV
        </span>
      </div>
      <div className="flex gap-4">
        <DonutCard title="Operasional" data={opRows} loading={loading} />
        <DonutCard title="Wakaf"       data={wkRows} loading={loading} />
      </div>
    </div>
  )
}
