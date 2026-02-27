'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SerpResultsTable } from '@/components/serp/serp-results-table'
import { SerpInsights } from '@/components/serp/serp-insights'
import { PaaList } from '@/components/serp/paa-list'
import { RelatedSearches } from '@/components/serp/related-searches'
import type { SERPResult } from '@/lib/serp/serper'
import type { CompetitorInsights } from '@/lib/serp/insights'

interface SerpApiResponse {
  serp: SERPResult
  autocomplete: string[]
  insights: CompetitorInsights
  project: {
    id: string
    main_keyword: string
    status: string
  }
  error?: string
}

export default function SerpPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = params.projectId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SerpApiResponse | null>(null)
  const [projectKeyword, setProjectKeyword] = useState<string>('')
  const [fetchingProject, setFetchingProject] = useState(true)

  // Fetch project info on mount to display keyword
  const fetchProject = useCallback(async () => {
    try {
      setFetchingProject(true)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: project } = await supabase
        .from('ba_projects')
        .select('main_keyword, status')
        .eq('id', projectId)
        .single()

      if (project) {
        setProjectKeyword(project.main_keyword)
      }
    } catch {
      // Silently fail - the keyword will be shown once analysis is complete
    } finally {
      setFetchingProject(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/serp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Erreur lors de l\'analyse SERP')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyse SERP</h1>
        {fetchingProject ? (
          <p className="text-muted-foreground mt-1">Chargement du projet...</p>
        ) : projectKeyword ? (
          <p className="text-muted-foreground mt-1">
            Mot-cle :{' '}
            <span className="font-semibold text-foreground">
              &laquo; {projectKeyword} &raquo;
            </span>
          </p>
        ) : null}
      </div>

      {/* Launch button (shown before analysis) */}
      {!data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Analyse de la concurrence Google
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lancez l&apos;analyse SERP pour etudier les resultats Google actuels pour
              votre mot-cle. Cela permettra d&apos;identifier les patterns de titres,
              les domaines dominants et les questions frequentes.
            </p>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={runAnalysis} disabled={loading} size="lg">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyse en cours...
                </span>
              ) : (
                'Lancer l\'analyse SERP'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <svg
            className="animate-spin h-8 w-8 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">
            Interrogation de Google via Serper.dev...
          </p>
          <p className="text-xs text-muted-foreground">
            Cela peut prendre quelques secondes.
          </p>
        </div>
      )}

      {/* Results (shown after successful analysis) */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Insights */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Insights concurrentiels</h2>
            <SerpInsights insights={data.insights} />
          </div>

          {/* Organic results table */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Resultats organiques ({data.serp.organic.length})
            </h2>
            <SerpResultsTable results={data.serp.organic} />
          </div>

          {/* People Also Ask */}
          {data.serp.peopleAlsoAsk.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">People Also Ask</h2>
              <PaaList questions={data.serp.peopleAlsoAsk} />
            </div>
          )}

          {/* Related Searches + Autocomplete */}
          {(data.serp.relatedSearches.length > 0 ||
            data.autocomplete.length > 0) && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Recherches associees
              </h2>
              <RelatedSearches
                searches={data.serp.relatedSearches}
                autocomplete={data.autocomplete}
              />
            </div>
          )}

          {/* Continue button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              size="lg"
              onClick={() =>
                router.push(`/projects/${projectId}/outline`)
              }
            >
              Continuer vers le plan
              <svg
                className="ml-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
