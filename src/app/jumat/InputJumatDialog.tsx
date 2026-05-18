'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { formatRupiah } from '@/lib/format'

export function InputJumatDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  function getLastFriday() {
    const d = new Date()
    const day = d.getDay()
    const diff = day >= 5 ? day - 5 : day + 2
    d.setDate(d.getDate() - diff)
    return d.toISOString().split('T')[0]
  }

  const [form, setForm] = useState({
    tanggal_jumat: getLastFriday(),
    jumlah_kotak: '',
    jumlah_online: '',
  })

  const totalPreview =
    Number(form.jumlah_kotak.replace(/\D/g, '') || 0) +
    Number(form.jumlah_online.replace(/\D/g, '') || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('infaq_jumat').upsert({
        tanggal_jumat: form.tanggal_jumat,
        jumlah_kotak: Number(form.jumlah_kotak.replace(/\D/g, '')),
        jumlah_online: Number(form.jumlah_online.replace(/\D/g, '')),
      }, { onConflict: 'tanggal_jumat' })
      if (error) throw error
      setOpen(false)
      setForm({ tanggal_jumat: getLastFriday(), jumlah_kotak: '', jumlah_online: '' })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan data infaq Jumat')
    } finally {
      setLoading(false)
    }
  }

  function formatInput(val: string) {
    const num = val.replace(/\D/g, '')
    return num ? Number(num).toLocaleString('id-ID') : ''
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="bg-green-700 hover:bg-green-800 gap-2" />}
      >
        <Plus className="w-4 h-4" />
        Input Infaq Jumat
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input Infaq Jumat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="tanggal_jumat">Tanggal Jumat</Label>
            <Input
              id="tanggal_jumat"
              type="date"
              value={form.tanggal_jumat}
              onChange={(e) => setForm({ ...form, tanggal_jumat: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jumlah_kotak">Kotak Amal (Rp)</Label>
            <Input
              id="jumlah_kotak"
              placeholder="Contoh: 3.500.000"
              value={form.jumlah_kotak}
              onChange={(e) => setForm({ ...form, jumlah_kotak: formatInput(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jumlah_online">Transfer Online (Rp)</Label>
            <Input
              id="jumlah_online"
              placeholder="Contoh: 850.000"
              value={form.jumlah_online}
              onChange={(e) => setForm({ ...form, jumlah_online: formatInput(e.target.value) })}
              required
            />
          </div>

          {totalPreview > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">
                Total:{' '}
                <span className="font-bold text-green-700">{formatRupiah(totalPreview)}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-green-700 hover:bg-green-800" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
