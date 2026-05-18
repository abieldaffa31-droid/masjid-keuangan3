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

export function TambahWakafDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nama_wakif: '',
    keterangan: '',
    jumlah: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('wakaf').insert({
        tanggal: form.tanggal,
        nama_wakif: form.nama_wakif,
        keterangan: form.keterangan,
        jumlah: Number(form.jumlah.replace(/\D/g, '')),
      })
      if (error) throw error
      setOpen(false)
      setForm({ tanggal: new Date().toISOString().split('T')[0], nama_wakif: '', keterangan: '', jumlah: '' })
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan data wakaf')
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
        render={<Button className="bg-green-700 hover:bg-green-800 text-white gap-2" />}
      >
        <Plus className="w-4 h-4" />
        Tambah Wakaf
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input Data Wakaf</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input
              id="tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nama_wakif">Nama Wakif</Label>
            <Input
              id="nama_wakif"
              placeholder="Contoh: Hamba Allah / Nama Lengkap"
              value={form.nama_wakif}
              onChange={(e) => setForm({ ...form, nama_wakif: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="keterangan">Keterangan (opsional)</Label>
            <Input
              id="keterangan"
              placeholder="Wakaf Pembangunan / Wakaf Umum"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jumlah">Jumlah (Rp)</Label>
            <Input
              id="jumlah"
              placeholder="Contoh: 1.000.000"
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: formatInput(e.target.value) })}
              required
            />
          </div>
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
