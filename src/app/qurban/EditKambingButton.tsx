'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { KambingForm } from './TambahQurbanDialog'

export function EditKambingButton({ initialCounts }: { initialCounts: Record<string, number> }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50" />
      }>
        <Pencil className="w-4 h-4" /> Edit Kambing
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🐐 Update Jumlah Kambing</DialogTitle>
        </DialogHeader>
        <KambingForm onClose={() => setOpen(false)} initialCounts={initialCounts} />
      </DialogContent>
    </Dialog>
  )
}
