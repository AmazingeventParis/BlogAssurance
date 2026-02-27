'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BlockStatus } from '@/types'

interface BlockStatusBadgeProps {
  status: BlockStatus
  className?: string
}

const STATUS_CONFIG: Record<
  BlockStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  writing: {
    label: 'Redaction...',
    className:
      'bg-orange-100 text-orange-700 border-orange-200 animate-pulse',
  },
  done: {
    label: 'Termine',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  error: {
    label: 'Erreur',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
}

export function BlockStatusBadge({ status, className }: BlockStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
