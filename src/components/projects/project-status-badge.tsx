'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types'
import { PROJECT_STATUS_LABELS } from '@/types'

const statusStyles: Record<ProjectStatus, string> = {
  draft:
    'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100',
  serp_done:
    'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  outline_done:
    'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  writing:
    'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  completed:
    'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({
  status,
  className,
}: ProjectStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], className)}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}
