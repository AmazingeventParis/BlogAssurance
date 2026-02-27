'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { OutlineEditor } from '@/components/outline/outline-editor'
import { OutlineActions } from '@/components/outline/outline-actions'
import type { Project, OutlineStructure, Outline } from '@/types'

export default function OutlinePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [outline, setOutline] = useState<Outline | null>(null)
  const [structure, setStructure] = useState<OutlineStructure | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------- Fetch project and outline ----------
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch project
      const projectRes = await fetch(`/api/projects`)
      if (!projectRes.ok) throw new Error('Erreur lors du chargement du projet')
      const projectData = await projectRes.json()
      const found = projectData.projects?.find(
        (p: Project) => p.id === projectId
      )
      if (!found) {
        setError('Projet non trouve')
        setIsLoading(false)
        return
      }
      setProject(found)

      // Fetch outline
      const outlineRes = await fetch(`/api/projects/${projectId}/outline`)
      if (outlineRes.ok) {
        const outlineData = await outlineRes.json()
        if (outlineData.outline) {
          setOutline(outlineData.outline)
          setStructure(outlineData.outline.structure_json as OutlineStructure)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Generate outline ----------
  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/outline`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la generation du plan')
      }

      const data = await res.json()
      setOutline(data.outline)
      setStructure(data.structure as OutlineStructure)

      // Update project status locally
      if (project) {
        setProject({ ...project, status: 'outline_done' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsGenerating(false)
    }
  }

  // ---------- Save outline ----------
  const handleSave = async () => {
    if (!structure) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/outline/save`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure_json: structure }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      const data = await res.json()
      setOutline(data.outline)

      if (data.warning) {
        setError(data.warning)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }

  // ---------- Save and continue ----------
  const handleSaveAndContinue = async () => {
    if (!structure) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/outline/save`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure_json: structure }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      router.push(`/projects/${projectId}/write`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSaving(false)
    }
  }

  // ---------- Handle outline structure changes ----------
  const handleOutlineChange = (newStructure: OutlineStructure) => {
    setStructure(newStructure)
  }

  // ---------- Loading state ----------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement du projet...</p>
        </div>
      </div>
    )
  }

  // ---------- Error state (no project) ----------
  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="font-medium">{error || 'Projet non trouve'}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/dashboard')}
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/projects/${projectId}/serp`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Plan de l&apos;article</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{project.main_keyword}</Badge>
              <Badge variant="outline">{project.intent}</Badge>
              <span className="text-xs text-muted-foreground">
                ~{project.target_length} mots
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No outline state */}
      {!structure && !isGenerating && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-semibold mb-2">
                Aucun plan genere
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Generez un plan structure pour votre article SEO. L&apos;IA analysera votre
                mot-cle, l&apos;intention de recherche et les donnees SERP pour creer
                une structure optimisee.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating state */}
      {isGenerating && !structure && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">
              Generation du plan en cours...
            </h2>
            <p className="text-sm text-muted-foreground">
              L&apos;IA analyse votre mot-cle et structure l&apos;article.
              Cela peut prendre 15 a 30 secondes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Outline editor */}
      {structure && (
        <OutlineEditor outline={structure} onChange={handleOutlineChange} />
      )}

      {/* Action buttons */}
      <OutlineActions
        hasOutline={!!structure}
        isGenerating={isGenerating}
        isSaving={isSaving}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onSaveAndContinue={handleSaveAndContinue}
      />
    </div>
  )
}
