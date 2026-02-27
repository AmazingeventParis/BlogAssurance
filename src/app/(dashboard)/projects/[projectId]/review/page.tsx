'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReviewResult, ReviewIssue } from '@/types'

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: 'Exactitude',
  sources: 'Sources',
  coherence: 'Coherence',
  completeness: 'Completude',
  seo: 'SEO',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 50) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function getSeverityBadge(severity: ReviewIssue['severity']) {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critique</Badge>
    case 'major':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100" variant="outline">Majeur</Badge>
    case 'minor':
      return <Badge variant="secondary">Mineur</Badge>
  }
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [review, setReview] = useState<ReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(false)

  const fetchReview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/review`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const { review: reviewData } = await res.json()
      if (reviewData) {
        setReview(reviewData.review_json as ReviewResult)
        setHasExisting(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la generation')
      }
      const { result } = await res.json()
      setReview(result as ReviewResult)
      setHasExisting(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setGenerating(false)
    }
  }

  // Collect all issues from all dimensions sorted by severity
  const allIssues: ReviewIssue[] = review
    ? Object.values(review.dimensions)
        .flatMap((d) => d.issues)
        .sort((a, b) => {
          const order = { critical: 0, major: 1, minor: 2 }
          return order[a.severity] - order[b.severity]
        })
    : []

  if (loading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Relecture experte</h1>
          <p className="text-muted-foreground mt-1">
            Evaluation approfondie de l&apos;article par l&apos;IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/write`)}
          >
            Retour a la redaction
          </Button>
          {review && (
            <Button
              onClick={() => router.push(`/projects/${projectId}/rewrite`)}
            >
              Lancer la reecriture
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Generate / Regenerate button */}
      {!review && !generating && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Lancez la relecture experte pour evaluer votre article sur 5 dimensions.
            </p>
            <Button onClick={handleGenerate} size="lg">
              Lancer la relecture
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Analyse en cours... L&apos;IA relit l&apos;article complet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review results */}
      {review && (
        <>
          {/* Overall score */}
          <Card className={`mb-6 ${getScoreBg(review.overall_score)}`}>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Score global
                  </p>
                  <p className={`text-5xl font-bold ${getScoreColor(review.overall_score)}`}>
                    {review.overall_score}
                    <span className="text-xl text-muted-foreground">/100</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Analyse...' : 'Relancer la relecture'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dimension cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {Object.entries(review.dimensions).map(([key, dim]) => (
              <Card key={key} className={getScoreBg(dim.score)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {DIMENSION_LABELS[key] || dim.label}
                    </CardTitle>
                    <span className={`text-2xl font-bold ${getScoreColor(dim.score)}`}>
                      {dim.score}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{dim.summary}</p>
                  {dim.issues.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {dim.issues.length} probleme{dim.issues.length > 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Issues list */}
          {allIssues.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  Problemes identifies ({allIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allIssues.map((issue, i) => (
                    <div
                      key={i}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(issue.severity)}
                        <Badge variant="outline">
                          {DIMENSION_LABELS[issue.dimension] || issue.dimension}
                        </Badge>
                        {issue.location && (
                          <span className="text-xs text-muted-foreground">
                            {issue.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{issue.description}</p>
                      {issue.suggestion && (
                        <p className="text-sm text-muted-foreground italic">
                          Suggestion : {issue.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {review.suggestions && review.suggestions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  Suggestions d&apos;amelioration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {review.suggestions.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
