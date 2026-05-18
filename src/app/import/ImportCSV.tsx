'use client'

import { useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseCSVBSI, autoKategori, type CSVRow } from './csvParser'
import { supabase } from '@/lib/supabase'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'

const KATEGORI_LIST = ['Infaq', 'Donasi', 'Wakaf', 'Operasional', 'SDM', 'Sarana', 'Pembangunan', 'Umum']

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function ImportCSV() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedCount, setSavedCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  function processFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Harap upload file CSV (.csv)')
      return
    }
    setFileName(file.name)
    setSaveStatus('idle')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSVBSI(text)
      setRows(parsed)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [])

  function toggleRow(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)))
  }

  function toggleAll() {
    const allSelected = rows.every((r) => r.selected)
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })))
  }

  function changeKategori(id: string, kat: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, kategori: kat } : r)))
  }

  async function handleSave() {
    const selected = rows.filter((r) => r.selected)
    if (selected.length === 0) return

    setSaveStatus('saving')
    setErrorMsg('')

    try {
      const { error } = await supabase.from('transaksi').insert(
        selected.map((r) => ({
          tanggal: r.tanggal,
          uraian: r.deskripsi,
          kategori: r.kategori,
          jenis: r.jenis,
          jumlah: r.nominal,
          saldo: r.saldo,
        }))
      )
      if (error) throw error
      setSavedCount(selected.length)
      setSaveStatus('success')
      setRows((prev) => prev.map((r) => (r.selected ? { ...r, selected: false } : r)))
    } catch (err: unknown) {
      setSaveStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data')
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length
  const totalMasuk = rows.filter((r) => r.selected && r.jenis === 'masuk').reduce((s, r) => s + r.nominal, 0)
  const totalKeluar = rows.filter((r) => r.selected && r.jenis === 'keluar').reduce((s, r) => s + r.nominal, 0)

  return (
    <div className="space-y-4">
      {/* Format info */}
      <Card className="border-blue-200 bg-blue-50 border shadow-none">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Format CSV BSI yang didukung:</p>
            <p className="text-blue-600 font-mono text-xs mt-1">
              Tanggal ; FT Number ; Deskripsi ; Nominal ; DB/CR ; Saldo
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Mendukung pemisah titik koma (;) atau koma (,). DB = Keluar, CR = Masuk.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        {fileName ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-10 h-10 text-green-600" />
            <p className="font-medium text-gray-700">{fileName}</p>
            <p className="text-sm text-gray-400">{rows.length} baris terdeteksi · Klik untuk ganti file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-400" />
            <p className="font-medium text-gray-600">Drag & drop file CSV, atau klik untuk pilih</p>
            <p className="text-sm text-gray-400">Ekspor mutasi rekening dari BSI Mobile / Internet Banking</p>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">{selectedCount} dari {rows.length} dipilih</span>
              <span className="text-green-600 font-medium">Masuk: {formatRupiah(totalMasuk)}</span>
              <span className="text-red-600 font-medium">Keluar: {formatRupiah(totalKeluar)}</span>
            </div>
            <div className="flex gap-2">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  {savedCount} transaksi tersimpan
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={selectedCount === 0 || saveStatus === 'saving'}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                {saveStatus === 'saving' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
                ) : (
                  <>Simpan {selectedCount} Transaksi ke Database</>
                )}
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 font-normal">
                Preview Data — periksa dan ubah kategori sebelum menyimpan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={rows.every((r) => r.selected)}
                          onChange={toggleAll}
                          className="rounded accent-green-600"
                        />
                      </TableHead>
                      <TableHead className="w-28">Tanggal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-36">Kategori</TableHead>
                      <TableHead className="w-20 text-center">Jenis</TableHead>
                      <TableHead className="text-right w-36">Nominal (Rp)</TableHead>
                      <TableHead className="text-right w-36">Saldo (Rp)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={`text-sm ${!row.selected ? 'opacity-40' : 'hover:bg-gray-50'}`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(row.id)}
                            className="rounded accent-green-600"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatTanggalPendek(row.tanggal)}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-gray-800 truncate max-w-xs">{row.deskripsi}</p>
                          {row.ftNumber && (
                            <p className="text-xs text-gray-400">{row.ftNumber}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <select
                            value={row.kategori}
                            onChange={(e) => changeKategori(row.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 w-full"
                          >
                            {KATEGORI_LIST.map((k) => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              row.jenis === 'masuk'
                                ? 'border-green-300 text-green-700 bg-green-50'
                                : 'border-red-300 text-red-700 bg-red-50'
                            }`}
                          >
                            {row.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium text-sm ${
                          row.jenis === 'masuk' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatRupiah(row.nominal)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-600">
                          {formatRupiah(row.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
