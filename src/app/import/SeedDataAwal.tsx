'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { SALDO_AWAL, INFAQ_JUMAT_DATA } from './seedData'
import { CheckCircle, AlertCircle, Loader2, Database, BookOpen } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function SeedDataAwal() {
  const [saldoStatus, setSaldoStatus] = useState<Status>('idle')
  const [jumatStatus, setJumatStatus] = useState<Status>('idle')
  const [saldoMsg, setSaldoMsg] = useState('')
  const [jumatMsg, setJumatMsg] = useState('')

  async function insertSaldoAwal() {
    setSaldoStatus('loading')
    setSaldoMsg('')
    try {
      const { error } = await supabase.from('transaksi').insert({
        tanggal: SALDO_AWAL.tanggal,
        uraian: SALDO_AWAL.uraian,
        kategori: SALDO_AWAL.kategori,
        jenis: SALDO_AWAL.jenis,
        jumlah: SALDO_AWAL.jumlah,
        saldo: SALDO_AWAL.saldo,
      })
      if (error) throw error
      setSaldoStatus('success')
      setSaldoMsg('Saldo awal berhasil ditambahkan')
    } catch (err: unknown) {
      setSaldoStatus('error')
      setSaldoMsg(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  async function insertInfaqJumat() {
    setJumatStatus('loading')
    setJumatMsg('')
    try {
      const { error } = await supabase.from('infaq_jumat').upsert(
        INFAQ_JUMAT_DATA.map((d) => ({
          tanggal_jumat: d.tanggal_jumat,
          jumlah_kotak: d.jumlah_kotak,
          jumlah_online: d.jumlah_online,
        })),
        { onConflict: 'tanggal_jumat' }
      )
      if (error) throw error
      setJumatStatus('success')
      setJumatMsg(`${INFAQ_JUMAT_DATA.length} pekan infaq Jumat berhasil disimpan`)
    } catch (err: unknown) {
      setJumatStatus('error')
      setJumatMsg(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  const totalInfaqJumat = INFAQ_JUMAT_DATA.reduce((s, d) => s + d.jumlah_kotak + d.jumlah_online, 0)

  return (
    <div className="space-y-6">
      {/* Saldo Awal */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-5 h-5 text-green-600" />
            Saldo Awal Operasional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Tanggal</p>
              <p className="font-semibold text-gray-800">{formatTanggal(SALDO_AWAL.tanggal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Keterangan</p>
              <p className="font-semibold text-gray-800">{SALDO_AWAL.uraian}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Jumlah</p>
              <p className="font-bold text-green-700 text-lg">{formatRupiah(SALDO_AWAL.jumlah)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Jenis</p>
              <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                Saldo Masuk
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={insertSaldoAwal}
              disabled={saldoStatus === 'loading' || saldoStatus === 'success'}
              className="bg-green-700 hover:bg-green-800 gap-2"
            >
              {saldoStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
              ) : saldoStatus === 'success' ? (
                <><CheckCircle className="w-4 h-4" />Tersimpan</>
              ) : (
                'Masukkan ke Database'
              )}
            </Button>
            {saldoMsg && (
              <div className={`flex items-center gap-1.5 text-sm ${
                saldoStatus === 'success' ? 'text-green-700' : 'text-red-600'
              }`}>
                {saldoStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {saldoMsg}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Infaq Jumat */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-amber-600" />
              Infaq Jumat — {INFAQ_JUMAT_DATA.length} Pekan (Jan–Mei 2026)
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Keseluruhan</p>
              <p className="font-bold text-amber-700">{formatRupiah(totalInfaqJumat)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Tanggal Jumat</TableHead>
                  <TableHead className="text-right">Kotak Amal (Rp)</TableHead>
                  <TableHead className="text-right">Online (Rp)</TableHead>
                  <TableHead className="text-right">Total (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INFAQ_JUMAT_DATA.map((row, idx) => (
                  <TableRow key={row.tanggal_jumat} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-400 text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{formatTanggal(row.tanggal_jumat)}</TableCell>
                    <TableCell className="text-right text-sm">{formatRupiah(row.jumlah_kotak)}</TableCell>
                    <TableCell className="text-right text-sm text-gray-400">—</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-amber-700">
                      {formatRupiah(row.jumlah_kotak + row.jumlah_online)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-amber-50 font-bold">
                  <TableCell colSpan={2} className="text-sm font-bold text-gray-700">
                    Total ({INFAQ_JUMAT_DATA.length} pekan)
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-amber-700">
                    {formatRupiah(totalInfaqJumat)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-400">—</TableCell>
                  <TableCell className="text-right text-sm font-bold text-gray-800">
                    {formatRupiah(totalInfaqJumat)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={insertInfaqJumat}
              disabled={jumatStatus === 'loading' || jumatStatus === 'success'}
              className="bg-amber-600 hover:bg-amber-700 gap-2"
            >
              {jumatStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
              ) : jumatStatus === 'success' ? (
                <><CheckCircle className="w-4 h-4" />Tersimpan</>
              ) : (
                `Simpan ${INFAQ_JUMAT_DATA.length} Pekan ke Database`
              )}
            </Button>
            {jumatMsg && (
              <div className={`flex items-center gap-1.5 text-sm ${
                jumatStatus === 'success' ? 'text-green-700' : 'text-red-600'
              }`}>
                {jumatStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {jumatMsg}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
