'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RewriteBlockCard } from '@/components/rewrite/rewrite-block-card'
import { useWritingStore } from '@/stores/writing-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useStreaming } from '@/hooks/use-streaming'
import type { DraftBlock, ReviewResult, ReviewIssue, BlockComment } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

export default function RewritePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const { blocks, setBlocks, streamingBlockId } = useWritingStore()
  const {
    review,
    comments,
    rewriteInProgress,
    setReview,
    setComments,
    setRewriteInProgress,
  } = useRewriteStore()
  const { startStreaming, stopStreaming } = useStreaming()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewExpanded, setReviewExpanded] = useState(false)

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [blocksRes, reviewRes, commentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/blocks`),
        fetch(`/api/projects/${projectId}/review`),
        fetch(`/api/projects/${projectId}/comments`),
      ])

      if (blocksRes.ok) {
        const { blocks: blocksData } = await blocksRes.json()
        setBlocks(blocksData as DraftBlock[])
      }

      if (reviewRes.ok) {
        const { review: reviewData } = await reviewRes.json()
        if (reviewData) {
          setReview(reviewData.review_json as ReviewResult)
        }
      }

      if (commentsRes.ok) {
        const { comments: commentsData } = await commentsRes.json()
        setComments(commentsData as BlockComment[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [projectId, setBlocks, setReview, setComments])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sort blocks by sort_order
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order),
    [blocks]
  )

  // Collect all issues
  const allIssues: ReviewIssue[] = useMemo(() => {
    if (!review) return []
    return Object.values(review.dimensions).flatMap((d) => d.issues)
  }, [review])

  const globalSuggestions = useMemo(
    () => review?.suggestions ?? [],
    [review]
  )

  // Match issues to blocks by location matching block title
  const getBlockIssues = useCallback(
    (block: DraftBlock): ReviewIssue[] => {
      if (!block.title) return []
      const title = block.title.toLowerCase()
      return allIssues.filter((issue) => {
        if (!issue.location) return false
        return issue.location.toLowerCase().includes(title) ||
               title.includes(issue.location.toLowerCase())
      })
    },
    [allIssues]
  )

  // Get comments for a block
  const getBlockComments = useCallback(
    (blockId: string): BlockComment[] => {
      return comments.filter((c) => c.block_id === blockId)
    },
    [comments]
  )

  // Progress
  const totalBlocks = sortedBlocks.length
  const doneBlocks = sortedBlocks.filter((b) => b.status === 'done').length
  const progressPercent =
    totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0
  const isStreaming = streamingBlockId !== null
  const totalWordCount = sortedBlocks.reduce(
    (sum, b) => sum + (b.word_count ?? 0),
    0
  )

  // Handle "Rewrite All"
  const handleRewriteAll = useCallback(async () => {
    setRewriteInProgress(true)

    try {
      // Set project status to rewriting
      await fetch(`/api/projects/${projectId}/rewrite-all`, {
        method: 'POST',
      })

      // Rewrite each block sequentially
      for (const block of sortedBlocks) {
        if (block.status !== 'done') continue

        const blockIssues = getBlockIssues(block)

        await new Promise<void>((resolve) => {
          const checkDone = () => {
            const state = useWritingStore.getState()
            if (state.streamingBlockId === null) {
              resolve()
            } else {
              setTimeout(checkDone, 200)
            }
          }

          startStreaming(projectId, block.id, {
            mode: 'rewrite',
            reviewContext: { issues: blockIssues, globalSuggestions },
          })

          setTimeout(checkDone, 500)
        })
      }
    } catch (err) {
      console.error('Rewrite all error:', err)
    } finally {
      setRewriteInProgress(false)
    }
  }, [
    sortedBlocks,
    projectId,
    startStreaming,
    getBlockIssues,
    globalSuggestions,
    setRewriteInProgress,
  ])

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reecriture</h1>
          <p className="text-muted-foreground mt-1">
            Ameliorez chaque bloc en fonction de la relecture experte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/review`)}
          >
            Retour a la relecture
          </Button>
          <Button
            onClick={() => router.push(`/projects/${projectId}/export`)}
          >
            Exporter
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Compact review summary */}
      {review && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resume de la relecture</CardTitle>
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-bold ${getScoreColor(review.overall_score)}`}
                >
                  {review.overall_score}/100
                </span>
                <button
                  onClick={() => setReviewExpanded(!reviewExpanded)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {reviewExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          {reviewExpanded && (
            <CardContent>
              <div className="grid gap-2 grid-cols-5 mb-3">
                {Object.entries(review.dimensions).map(([key, dim]) => (
                  <div key={key} className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {DIMENSION_LABELS[key] || dim.label}
                    </p>
                    <p
                      className={`text-lg font-bold ${getScoreColor(dim.score)}`}
                    >
                      {dim.score}
                    </p>
                  </div>
                ))}
              </div>
              {allIssues.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {allIssues.length} probleme
                  {allIssues.length > 1 ? 's' : ''} identifies au total
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Progress and actions */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Blocs</h2>
            <p className="text-sm text-muted-foreground">
              {doneBlocks} / {totalBlocks} blocs
              {totalWordCount > 0 && (
                <span className="ml-2">
                  ({totalWordCount.toLocaleString('fr-FR')} mots)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <Button variant="destructive" size="sm" onClick={stopStreaming}>
                Arreter
              </Button>
            )}
            {!isStreaming && !rewriteInProgress && (
              <Button onClick={handleRewriteAll}>
                Lancer la reecriture automatique
              </Button>
            )}
            {rewriteInProgress && !isStreaming && (
              <Badge variant="secondary">Reecriture en cours...</Badge>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {progressPercent}%
          </p>
        </div>
      </div>

      {/* Block list */}
      <div className="space-y-4">
        {sortedBlocks.map((block, index) => (
          <RewriteBlockCard
            key={block.id}
            block={block}
            projectId={projectId}
            index={index}
            blockComments={getBlockComments(block.id)}
            blockIssues={getBlockIssues(block)}
            globalSuggestions={globalSuggestions}
          />
        ))}
      </div>
    </div>
  )
}
