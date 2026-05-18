'use client'

import { cn } from '@/lib/utils'

interface ProgressProps {
  value?: number
  className?: string
  fillClassName?: string
}

function Progress({ value = 0, className, fillClassName }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full bg-green-500 transition-all duration-500', fillClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }
