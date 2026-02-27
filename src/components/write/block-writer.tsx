'use client'

import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlockStatusBadge } from './block-status-badge'
import { StreamingContent } from './streaming-content'
import { useWritingStore } from '@/stores/writing-store'
import { useStreaming } from '@/hooks/use-streaming'
import { cn } from '@/lib/utils'
import type { DraftBlock } from '@/types'

interface BlockWriterProps {
  block: DraftBlock
  projectId: string
  index: number
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  h2: 'Section H2',
  h3: 'Sous-section H3',
  h4: 'Sous-section H4',
  paragraph: 'Paragraphe',
  list: 'Liste',
  faq: 'FAQ',
}

export function BlockWriter({ block, projectId, index }: BlockWriterProps) {
  const { streamingBlockId, streamingContent } = useWritingStore()
  const { startStreaming, stopStreaming } = useStreaming()

  const isThisBlockStreaming = streamingBlockId === block.id
  const isAnyBlockStreaming = streamingBlockId !== null
  const blockType = BLOCK_TYPE_LABELS[block.section_id?.split('-')[0] ?? ''] ?? 'Bloc'

  const handleWrite = useCallback(() => {
    startStreaming(projectId, block.id)
  }, [startStreaming, projectId, block.id])

  const handleRewrite = useCallback(() => {
    startStreaming(projectId, block.id)
  }, [startStreaming, projectId, block.id])

  const handleStop = useCallback(() => {
    stopStreaming()
  }, [stopStreaming])

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isThisBlockStreaming && 'ring-2 ring-orange-300 shadow-md',
        block.status === 'done' && 'border-green-200',
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
                {blockType}
                {block.word_count > 0 && (
                  <span className="ml-2">
                    {block.word_count} mot{block.word_count > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BlockStatusBadge status={block.status} />
            {block.status === 'pending' && (
              <Button
                size="sm"
                onClick={handleWrite}
                disabled={isAnyBlockStreaming}
              >
                Rediger
              </Button>
            )}
            {isThisBlockStreaming && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
              >
                Arreter
              </Button>
            )}
            {block.status === 'done' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRewrite}
                disabled={isAnyBlockStreaming}
              >
                Re-ecrire
              </Button>
            )}
            {block.status === 'error' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleWrite}
                disabled={isAnyBlockStreaming}
              >
                Reessayer
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Streaming state: show live content */}
        {isThisBlockStreaming && (
          <StreamingContent
            content={streamingContent}
            isStreaming={true}
          />
        )}

        {/* Done state: show final content */}
        {block.status === 'done' && !isThisBlockStreaming && block.content_html && (
          <div
            className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
            dangerouslySetInnerHTML={{ __html: block.content_html }}
          />
        )}

        {/* Pending state: show placeholder */}
        {block.status === 'pending' && !isThisBlockStreaming && (
          <p className="text-sm text-muted-foreground italic py-2">
            Ce bloc n&apos;a pas encore ete redige. Cliquez sur &quot;Rediger&quot; pour
            lancer la generation.
          </p>
        )}

        {/* Error state: show error message */}
        {block.status === 'error' && !isThisBlockStreaming && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Une erreur est survenue lors de la generation de ce bloc.
              Cliquez sur &quot;Reessayer&quot; pour relancer la redaction.
            </p>
            {block.content_html && (
              <div className="mt-3 border-t border-red-200 pt-3">
                <p className="text-xs text-red-600 mb-2">Contenu partiel recupere :</p>
                <div
                  className="prose prose-sm max-w-none prose-p:text-red-900"
                  dangerouslySetInnerHTML={{ __html: block.content_html }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
