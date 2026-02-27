'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WritingWorkspace } from '@/components/write/writing-workspace'
import { useWritingStore } from '@/stores/writing-store'
import type { Project, DraftBlock } from '@/types'

export default function WritePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const { setBlocks, blocks } = useWritingStore()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch project and draft blocks
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (!projectRes.ok) {
        const data = await projectRes.json()
        throw new Error(data.error || 'Erreur lors du chargement du projet')
      }
      const { project: projectData } = await projectRes.json()
      setProject(projectData)

      // Fetch draft blocks
      const blocksRes = await fetch(`/api/projects/${projectId}/blocks`)
      if (blocksRes.ok) {
        const { blocks: blocksData } = await blocksRes.json()
        setBlocks(blocksData ?? [])
      } else {
        // If blocks endpoint doesn't exist yet or returns error, try empty
        setBlocks([])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du chargement'
      )
    } finally {
      setLoading(false)
    }
  }, [projectId, setBlocks])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check if all blocks are done
  const allDone =
    blocks.length > 0 && blocks.every((b) => b.status === 'done')

  if (loading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/dashboard')}
              >
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground">Projet introuvable.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/dashboard')}
              >
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No draft blocks: prompt user to generate outline first
  if (blocks.length === 0) {
    return (
      <div className="container max-w-5xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Redaction : {project.main_keyword}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Aucun bloc de redaction n&apos;a ete trouve pour ce projet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Vous devez d&apos;abord generer un plan (outline) et le
                valider pour creer les blocs de redaction.
              </p>
              <Button
                onClick={() =>
                  router.push(`/projects/${projectId}/outline`)
                }
              >
                Generer le plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Redaction</h1>
            <p className="text-muted-foreground mt-1">
              {project.main_keyword}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/projects/${projectId}/outline`)
              }
            >
              Voir le plan
            </Button>
            {allDone && (
              <Button
                onClick={() =>
                  router.push(`/projects/${projectId}/export`)
                }
              >
                Continuer vers l&apos;export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Writing workspace */}
      <WritingWorkspace projectId={projectId} />
    </div>
  )
}
