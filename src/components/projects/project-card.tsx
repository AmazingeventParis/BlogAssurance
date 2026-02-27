'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/projects/project-status-badge'
import type { Project } from '@/types'
import { INTENT_LABELS } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const createdDate = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">
              {project.main_keyword}
            </CardTitle>
            <ProjectStatusBadge status={project.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {INTENT_LABELS[project.intent]}
            </Badge>
            <span className="text-xs">
              {project.language.toUpperCase()} / {project.country.toUpperCase()}
            </span>
            <span className="ml-auto text-xs">{createdDate}</span>
          </div>
          {project.target_length && (
            <p className="mt-2 text-xs text-muted-foreground">
              Objectif : {project.target_length} mots
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
