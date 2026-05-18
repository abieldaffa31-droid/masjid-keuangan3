'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, AlertCircle, FileText, Trash2 } from 'lucide-react'

interface WakafRow {
  tanggal: string
  nama_wakif: string
  keterangan: string
  jumlah: number
  _error?: string
}

// ── Parse CSV wakaf ───────────────────────────────────────────────────────────
function parseWakafCSV(text: string): WakafRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Deteksi separator: koma atau titik koma
  const sep = lines[0].includes(';') ? ';' : ','

  const rows: WakafRow[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(sep).map(c => c.replace(/^"|"$/g, '').trim())
    const [tanggal = '', nama_wakif = '', keterangan = '', jumlahRaw = '0'] = cols

    const jumlah = parseInt(jumlahRaw.replace(/\D/g, '')) || 0
    const error = !tanggal
      ? 'Tanggal kosong'
      : !nama_wakif
      ? 'Nama wakif kosong'
      : jumlah <= 0
      ? 'Jumlah tidak valid'
      : undefined

    rows.push({ tanggal, nama_wakif, keterangan, jumlah, _error: error })
  }
  return rows
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

// ── Komponen utama ────────────────────────────────────────────────────────────
export function ImportWakaf() {
  const [rows, setRows] = useState<WakafRow[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRows(parseWakafCSV(text))
    }
    reader.readAsText(file, 'utf-8')
  }

  const validRows = rows.filter(r => !r._error)
  const errorRows = rows.filter(r => r._error)
  const total = validRows.reduce((s, r) => s + r.jumlah, 0)

  async function handleSave() {
    if (validRows.length === 0) return
    setSaving(true)
    setResult(null)

    const BATCH = 50
    let ok = 0, fail = 0

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH)
      const { error } = await supabase.from('wakaf').insert(
        batch.map(r => ({
          tanggal:    r.tanggal,
          nama_wakif: r.nama_wakif,
          keterangan: r.keterangan || null,
          jumlah:     r.jumlah,
        }))
      )
      if (error) fail += batch.length
      else ok += batch.length
    }

    setResult({ ok, fail })
    setSaving(false)
    if (fail === 0) {
      setRows([])
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleReset() {
    setRows([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Template download hint */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Format CSV yang diperlukan:</p>
          <code className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded block">
            tanggal,nama_wakif,keterangan,jumlah
          </code>
          <p className="text-xs text-blue-600 mt-2">
            Contoh: <span className="font-mono">2026-01-15,Hamba Allah,Wakaf Pembebasan Lahan,5000000</span>
          </p>
          <ul className="text-xs text-blue-600 mt-2 space-y-0.5 list-disc list-inside">
            <li>Tanggal format: YYYY-MM-DD (mis. 2026-01-15)</li>
            <li>Jumlah: angka saja tanpa titik/koma (mis. 5000000)</li>
            <li>Keterangan boleh kosong</li>
            <li>Separator: koma (,) atau titik koma (;)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-800">Upload File CSV Wakaf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Klik untuk pilih file CSV</span>
            <span className="text-xs text-gray-400 mt-1">atau drag & drop</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${result.fail === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
              {result.fail === 0
                ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
              <div className="text-sm">
                <p className={`font-medium ${result.fail === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {result.ok} data wakaf berhasil disimpan
                  {result.fail > 0 && `, ${result.fail} gagal`}
                </p>
                {result.fail === 0 && (
                  <p className="text-green-600 text-xs">Dashboard wakaf sudah terupdate</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview tabel */}
      {rows.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-gray-800">Preview Data</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {validRows.length} valid · {errorRows.length} error ·{' '}
                  Total: <span className="font-semibold text-green-700">{formatRp(total)}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-gray-400 hover:text-red-500 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-10">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Tanggal</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Nama Wakif</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Keterangan</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Jumlah</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 ${r._error ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2 text-gray-700">{r.tanggal || '—'}</td>
                      <td className="px-4 py-2 text-gray-800 font-medium">{r.nama_wakif || '—'}</td>
                      <td className="px-4 py-2 text-gray-500">{r.keterangan || '-'}</td>
                      <td className="px-4 py-2 text-right text-green-700 font-semibold">
                        {r.jumlah > 0 ? formatRp(r.jumlah) : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r._error
                          ? <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">{r._error}</span>
                          : <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tombol simpan */}
            {validRows.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                <p className="text-xs text-gray-500">
                  {validRows.length} baris siap disimpan ke Supabase
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-700 hover:bg-green-800 text-white gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {saving ? 'Menyimpan…' : `Simpan ${validRows.length} Data Wakaf`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
