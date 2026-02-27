'use client'

import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BlockWriter } from './block-writer'
import { useWritingStore } from '@/stores/writing-store'
import { useStreaming } from '@/hooks/use-streaming'

interface WritingWorkspaceProps {
  projectId: string
}

export function WritingWorkspace({ projectId }: WritingWorkspaceProps) {
  const { blocks, streamingBlockId } = useWritingStore()
  const { startStreaming, stopStreaming } = useStreaming()

  // Sort blocks by sort_order
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order),
    [blocks]
  )

  // Compute progress
  const totalBlocks = sortedBlocks.length
  const doneBlocks = sortedBlocks.filter((b) => b.status === 'done').length
  const progressPercent = totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0
  const allDone = totalBlocks > 0 && doneBlocks === totalBlocks
  const isStreaming = streamingBlockId !== null

  // Count pending blocks
  const pendingBlocks = sortedBlocks.filter((b) => b.status === 'pending')
  const hasPending = pendingBlocks.length > 0

  // Write all pending blocks sequentially
  const handleWriteAll = useCallback(async () => {
    const pending = sortedBlocks.filter((b) => b.status === 'pending' || b.status === 'error')

    for (const block of pending) {
      // Wait for the current streaming to finish before starting the next
      await new Promise<void>((resolve) => {
        const checkDone = () => {
          const state = useWritingStore.getState()
          if (state.streamingBlockId === null) {
            resolve()
          } else {
            setTimeout(checkDone, 200)
          }
        }

        startStreaming(projectId, block.id)

        // Give it a moment to start, then begin checking
        setTimeout(checkDone, 500)
      })
    }
  }, [sortedBlocks, startStreaming, projectId])

  // Total word count
  const totalWordCount = sortedBlocks.reduce((sum, b) => sum + (b.word_count ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Redaction des blocs</h2>
            <p className="text-sm text-muted-foreground">
              {doneBlocks} / {totalBlocks} blocs rediges
              {totalWordCount > 0 && (
                <span className="ml-2">
                  ({totalWordCount.toLocaleString('fr-FR')} mots au total)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <Button variant="destructive" size="sm" onClick={stopStreaming}>
                Arreter la redaction
              </Button>
            )}
            {hasPending && !isStreaming && (
              <Button onClick={handleWriteAll}>
                Rediger tout ({pendingBlocks.length} bloc
                {pendingBlocks.length > 1 ? 's' : ''})
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {progressPercent}% complete
          </p>
        </div>
      </div>

      {/* Block list */}
      <div className="space-y-4">
        {sortedBlocks.map((block, index) => (
          <BlockWriter
            key={block.id}
            block={block}
            projectId={projectId}
            index={index}
          />
        ))}
      </div>

      {/* Completion message */}
      {allDone && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
          <p className="text-green-800 font-medium text-lg">
            Tous les blocs ont ete rediges avec succes !
          </p>
          <p className="text-green-600 text-sm mt-1">
            {totalWordCount.toLocaleString('fr-FR')} mots au total.
            Vous pouvez maintenant exporter votre article.
          </p>
        </div>
      )}
    </div>
  )
}
