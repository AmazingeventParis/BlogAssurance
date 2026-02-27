'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BlockStatusBadge } from '@/components/write/block-status-badge'
import { StreamingContent } from '@/components/write/streaming-content'
import { useWritingStore } from '@/stores/writing-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import { useStreaming } from '@/hooks/use-streaming'
import { cn } from '@/lib/utils'
import type { DraftBlock, ReviewIssue, BlockComment } from '@/types'
import { MessageSquare, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

interface RewriteBlockCardProps {
  block: DraftBlock
  projectId: string
  index: number
  blockComments: BlockComment[]
  blockIssues: ReviewIssue[]
  globalSuggestions: string[]
}

export function RewriteBlockCard({
  block,
  projectId,
  index,
  blockComments,
  blockIssues,
  globalSuggestions,
}: RewriteBlockCardProps) {
  const { streamingBlockId, streamingContent } = useWritingStore()
  const { addComment, updateCommentStatus } = useRewriteStore()
  const { startStreaming, stopStreaming } = useStreaming()

  const [commentText, setCommentText] = useState('')
  const [commentOpen, setCommentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isThisBlockStreaming = streamingBlockId === block.id
  const isAnyBlockStreaming = streamingBlockId !== null

  const handleRewrite = useCallback(() => {
    startStreaming(projectId, block.id, {
      mode: 'rewrite',
      reviewContext: { issues: blockIssues, globalSuggestions },
    })
  }, [startStreaming, projectId, block.id, blockIssues, globalSuggestions])

  const handleRewriteWithComment = useCallback(async () => {
    if (!commentText.trim()) return
    setSubmitting(true)

    try {
      // Post comment
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: block.id,
          commentText: commentText.trim(),
        }),
      })

      if (!res.ok) throw new Error('Erreur creation commentaire')

      const { comment } = await res.json()
      addComment(comment)

      // Start rewrite with comment
      startStreaming(projectId, block.id, {
        mode: 'rewrite',
        reviewContext: { issues: blockIssues, globalSuggestions },
        userComment: commentText.trim(),
      })

      // Mark comment as applied
      await fetch(
        `/api/projects/${projectId}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'applied' }),
        }
      )
      updateCommentStatus(comment.id, 'applied')

      setCommentText('')
    } catch (err) {
      console.error('Error submitting comment:', err)
    } finally {
      setSubmitting(false)
    }
  }, [
    commentText,
    projectId,
    block.id,
    blockIssues,
    globalSuggestions,
    startStreaming,
    addComment,
    updateCommentStatus,
  ])

  const handleStop = useCallback(() => {
    stopStreaming()
  }, [stopStreaming])

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isThisBlockStreaming && 'ring-2 ring-indigo-300 shadow-md',
        block.status === 'done' && !isThisBlockStreaming && 'border-green-200',
        block.status === 'error' && 'border-red-200'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-1">
              {index + 1}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {block.title || `Bloc ${index + 1}`}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {block.word_count > 0 && (
                  <span>
                    {block.word_count} mot{block.word_count > 1 ? 's' : ''}
                  </span>
                )}
                {blockIssues.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    {blockIssues.length} probleme
                    {blockIssues.length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BlockStatusBadge status={block.status} />
            {isThisBlockStreaming && (
              <Button size="sm" variant="destructive" onClick={handleStop}>
                Arreter
              </Button>
            )}
            {!isThisBlockStreaming && block.status === 'done' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRewrite}
                disabled={isAnyBlockStreaming}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Reecrire
              </Button>
            )}
            {block.status === 'error' && !isThisBlockStreaming && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRewrite}
                disabled={isAnyBlockStreaming}
              >
                Reessayer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Review issues for this block */}
        {blockIssues.length > 0 && !isThisBlockStreaming && (
          <div className="rounded-md bg-orange-50 border border-orange-200 p-3 space-y-2">
            <p className="text-xs font-medium text-orange-700">
              Problemes identifies par la relecture :
            </p>
            {blockIssues.map((issue, i) => (
              <div key={i} className="text-xs text-orange-800">
                <span className="font-medium">
                  [{issue.severity === 'critical'
                    ? 'Critique'
                    : issue.severity === 'major'
                      ? 'Majeur'
                      : 'Mineur'}]
                </span>{' '}
                {issue.description}
                {issue.suggestion && (
                  <span className="text-orange-600 italic">
                    {' '}
                    — {issue.suggestion}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Streaming state */}
        {isThisBlockStreaming && (
          <StreamingContent content={streamingContent} isStreaming={true} />
        )}

        {/* Done state: show final content */}
        {block.status === 'done' && !isThisBlockStreaming && block.content_html && (
          <div
            className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
            dangerouslySetInnerHTML={{ __html: block.content_html }}
          />
        )}

        {/* Pending state */}
        {block.status === 'pending' && !isThisBlockStreaming && (
          <p className="text-sm text-muted-foreground italic py-2">
            Ce bloc sera reecrit lors de la reecriture automatique.
          </p>
        )}

        {/* Error state */}
        {block.status === 'error' && !isThisBlockStreaming && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Une erreur est survenue lors de la reecriture de ce bloc.
            </p>
          </div>
        )}

        {/* Comment panel (collapsible) */}
        {block.status === 'done' && !isThisBlockStreaming && (
          <div className="border-t pt-3">
            <button
              onClick={() => setCommentOpen(!commentOpen)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Commentaire
              {blockComments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {blockComments.length}
                </Badge>
              )}
              {commentOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {commentOpen && (
              <div className="mt-3 space-y-3">
                {/* Previous comments */}
                {blockComments.length > 0 && (
                  <div className="space-y-2">
                    {blockComments.map((c) => (
                      <div
                        key={c.id}
                        className="text-sm bg-muted rounded-md p-2 flex items-start justify-between gap-2"
                      >
                        <p className="text-foreground">{c.comment_text}</p>
                        <Badge
                          variant={
                            c.status === 'applied' ? 'default' : 'secondary'
                          }
                          className="text-xs shrink-0"
                        >
                          {c.status === 'applied' ? 'Applique' : 'En attente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* New comment input */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Decrivez les modifications souhaitees pour ce bloc..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleRewriteWithComment}
                    disabled={
                      !commentText.trim() || isAnyBlockStreaming || submitting
                    }
                  >
                    {submitting
                      ? 'Envoi...'
                      : 'Valider et reecrire'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
