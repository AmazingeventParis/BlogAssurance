'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { HTMLPreview } from '@/components/export/html-preview'
import { ExportActions } from '@/components/export/export-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OutlineData {
  title: string
  meta_description: string
  slug: string
}

export default function ExportPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [html, setHtml] = useState<string>('')
  const [bodyHtml, setBodyHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outline, setOutline] = useState<OutlineData | null>(null)
  const [wordCount, setWordCount] = useState(0)

  const fetchExportData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch full HTML, body-only HTML, and project data in parallel
      const [fullRes, bodyRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/export?format=html`),
        fetch(`/api/projects/${projectId}/export?format=body`),
        fetch(`/api/projects/${projectId}`),
      ])

      // The export API returns HTML (text/html), not JSON
      // On error it returns JSON, on success it returns HTML
      if (!fullRes.ok) {
        let errMsg = 'Erreur lors de la recuperation du HTML'
        try {
          const errData = await fullRes.json()
          errMsg = errData.error || errMsg
        } catch {
          // Response was not JSON, use default message
        }
        throw new Error(errMsg)
      }

      const fullHtml = await fullRes.text()
      const bodyContent = bodyRes.ok ? await bodyRes.text() : ''

      setHtml(fullHtml)
      setBodyHtml(bodyContent)

      // Count words from body content by stripping HTML tags
      const textContent = bodyContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const words = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0
      setWordCount(words)

      // Extract outline info from HTML and project data
      const titleMatch = fullHtml.match(/<title>(.*?)<\/title>/)
      const metaMatch = fullHtml.match(/<meta name="description" content="(.*?)"/)

      let mainKeyword = ''
      if (projectRes.ok) {
        try {
          const projectData = await projectRes.json()
          mainKeyword = projectData.project?.main_keyword || ''
        } catch {
          // Ignore JSON parse errors
        }
      }

      setOutline({
        title: titleMatch?.[1] || mainKeyword || 'Article',
        meta_description: metaMatch?.[1] || '',
        slug: mainKeyword
          ? mainKeyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          : 'article',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchExportData()
  }, [fetchExportData])

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Compilation de l&apos;article...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <Link href={`/projects/${projectId}/rewrite`}>
                <Button variant="outline">Retour a la reecriture</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/projects/${projectId}/rewrite`}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            &larr; Retour a la reecriture
          </Link>
          <h1 className="text-2xl font-bold">Export de l&apos;article</h1>
        </div>
        <ExportActions
          projectId={projectId}
          html={html}
          slug={outline?.slug || 'article'}
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          {wordCount.toLocaleString('fr-FR')} mots
        </Badge>
        <Badge variant="secondary" className="text-sm py-1 px-3">
          {html.length.toLocaleString('fr-FR')} caracteres HTML
        </Badge>
      </div>

      {/* Meta description */}
      {outline?.meta_description && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meta description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{outline.meta_description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {outline.meta_description.length} / 160 caracteres
            </p>
          </CardContent>
        </Card>
      )}

      {/* HTML Preview */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Apercu</h2>
        <HTMLPreview html={html} />
      </div>

      {/* Raw HTML section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Code HTML (corps uniquement)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[400px] text-xs font-mono whitespace-pre-wrap break-all border">
            {bodyHtml}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
