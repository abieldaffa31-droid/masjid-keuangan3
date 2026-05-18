'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { getTipeOptions, getTipe, HARGA_KAMBING } from './config'

const STATUS_OPTIONS = ['Lunas', 'DP', 'Belum Bayar']

function fmtRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

// ── Form Sapi ─────────────────────────────────────────────────────────────────
function SapiForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tipe, setTipe] = useState<'Diamond' | 'Platinum' | 'Gold'>('Diamond')
  const [grup, setGrup] = useState('')
  const [namaPemilik, setNamaPemilik] = useState('')
  const [status, setStatus] = useState('Lunas')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])

  const _tipeOptions = getTipeOptions('Sapi')
  const selectedTipe = getTipe('Sapi', tipe)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('hewan_qurban').insert({
        jenis_hewan: 'Sapi', tipe, grup: grup || null,
        nama_pemilik: namaPemilik || null,
        harga: selectedTipe?.harga_per_orang ?? 0,
        include_sembelih: true, status, tanggal, jumlah: 1,
      })
      if (error) throw error
      onClose(); router.refresh()
    } catch { alert('Gagal menyimpan') } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Tipe</Label>
        <div className="flex gap-2">
          {(['Diamond', 'Platinum', 'Gold'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTipe(t)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tipe === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50'}`}>
              {t}
            </button>
          ))}
        </div>
        {selectedTipe && (
          <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 mt-1">
            {fmtRp(selectedTipe.harga_ekor)}/ekor · {selectedTipe.harga_per_orang ? fmtRp(selectedTipe.harga_per_orang) + '/orang (1/7)' : ''}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Grup Sapi (contoh: Diamond 04)</Label>
        <Input placeholder="Diamond 04" value={grup} onChange={e => setGrup(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Nama Shohibul Qurban</Label>
        <Input placeholder="Kel. Ahmad / Bp. Budi" value={namaPemilik} onChange={e => setNamaPemilik(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none">
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Tanggal</Label>
          <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}

// ── Form Kambing (input jumlah per tipe) ──────────────────────────────────────
function KambingForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(HARGA_KAMBING.map(o => [o.tipe, '']))
  )
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Hapus data kambing lama lalu insert ulang dengan jumlah baru
      await supabase.from('hewan_qurban').delete().eq('jenis_hewan', 'Kambing')

      const rows = HARGA_KAMBING.flatMap(opt => {
        const n = parseInt(counts[opt.tipe] || '0') || 0
        if (n <= 0) return []
        return [{ jenis_hewan: 'Kambing', tipe: opt.tipe, grup: null,
          nama_pemilik: null, harga: opt.harga_ekor, include_sembelih: false,
          status: 'Lunas', tanggal, jumlah: n }]
      })

      if (rows.length > 0) {
        const { error } = await supabase.from('hewan_qurban').insert(rows)
        if (error) throw error
      }
      onClose(); router.refresh()
    } catch { alert('Gagal menyimpan') } finally { setLoading(false) }
  }

  const total = Object.values(counts).reduce((s, v) => s + (parseInt(v) || 0), 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">Masukkan jumlah ekor per tipe. Data lama akan diganti.</p>
      <div className="space-y-2">
        {HARGA_KAMBING.map(opt => (
          <div key={opt.tipe} className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{opt.tipe}</p>
              <p className="text-xs text-gray-400">{opt.berat_kg} kg · {fmtRp(opt.harga_ekor)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min="0" placeholder="0"
                value={counts[opt.tipe]}
                onChange={e => setCounts(p => ({ ...p, [opt.tipe]: e.target.value }))}
                className="w-20 text-center"
              />
              <span className="text-xs text-gray-400">ekor</span>
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 rounded px-3 py-1.5">
          Total: {total} ekor kambing
        </p>
      )}
      <div className="space-y-1">
        <Label>Tanggal</Label>
        <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function TambahQurbanDialog() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'sapi' | 'kambing'>('sapi')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2" />}
      >
        <Plus className="w-4 h-4" /> Tambah Hewan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input Hewan Qurban</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mt-1 mb-3">
          {(['sapi', 'kambing'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${tab === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50'}`}>
              {t === 'sapi' ? '🐄 Sapi' : '🐐 Kambing'}
            </button>
          ))}
        </div>
        {tab === 'sapi'
          ? <SapiForm onClose={() => setOpen(false)} />
          : <KambingForm onClose={() => setOpen(false)} />
        }
      </DialogContent>
    </Dialog>
  )
}
