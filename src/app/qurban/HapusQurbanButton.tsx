'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

export function HapusQurbanButton({ id, nama }: { id: number; nama: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleHapus() {
    if (!confirm(`Hapus data "${nama}"?`)) return
    setLoading(true)
    const { error } = await supabase.from('hewan_qurban').delete().eq('id', id)
    if (error) alert('Gagal menghapus')
    else router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleHapus}
      disabled={loading}
      className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
      title="Hapus"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
