'use client'

import { useCallback, useRef } from 'react'
import { useWritingStore } from '@/stores/writing-store'
import type { ReviewIssue } from '@/types'

export interface StreamOptions {
  mode?: 'write' | 'rewrite'
  reviewContext?: { issues: ReviewIssue[]; globalSuggestions: string[] }
  userComment?: string
}

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null)
  const {
    setStreamingBlockId,
    appendStreamingContent,
    resetStreamingContent,
    updateBlock,
  } = useWritingStore()

  const startStreaming = useCallback(
    async (projectId: string, blockId: string, options?: StreamOptions) => {
      // Abort any in-progress stream
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setStreamingBlockId(blockId)
      resetStreamingContent()
      updateBlock(blockId, { status: 'writing' })

      try {
        const response = await fetch(
          `/api/projects/${projectId}/stream-block`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blockId,
              mode: options?.mode,
              reviewContext: options?.reviewContext,
              userComment: options?.userComment,
            }),
            signal: abortRef.current.signal,
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            (errorData as { error?: string }).error || `Erreur HTTP ${response.status}`
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('Pas de flux de lecture disponible')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'text') {
                  appendStreamingContent(data.text)
                } else if (data.type === 'saved') {
                  // Server confirmed save — update block with final word count
                  const finalContent =
                    useWritingStore.getState().streamingContent
                  updateBlock(blockId, {
                    content_html: finalContent,
                    status: 'done',
                    word_count: data.word_count ?? finalContent.split(/\s+/).length,
                  })
                } else if (data.type === 'done') {
                  // Stream complete — finalize block from accumulated content
                  const finalContent =
                    useWritingStore.getState().streamingContent
                  const wordCount = finalContent
                    .replace(/<[^>]*>/g, ' ')
                    .split(/\s+/)
                    .filter(Boolean).length
                  updateBlock(blockId, {
                    content_html: finalContent,
                    status: 'done',
                    word_count: wordCount,
                  })
                } else if (data.type === 'error') {
                  updateBlock(blockId, { status: 'error' })
                }
              } catch {
                // Skip unparseable JSON lines
              }
            }
          }
        }

        // If we did not get a 'saved' or 'done' event, finalize from content
        const state = useWritingStore.getState()
        if (state.streamingBlockId === blockId) {
          const finalContent = state.streamingContent
          if (finalContent) {
            const wordCount = finalContent
              .replace(/<[^>]*>/g, ' ')
              .split(/\s+/)
              .filter(Boolean).length
            updateBlock(blockId, {
              content_html: finalContent,
              status: 'done',
              word_count: wordCount,
            })
          }
        }

        setStreamingBlockId(null)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          updateBlock(blockId, { status: 'error' })
          setStreamingBlockId(null)
        }
      }
    },
    [
      setStreamingBlockId,
      appendStreamingContent,
      resetStreamingContent,
      updateBlock,
    ]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    const state = useWritingStore.getState()
    if (state.streamingBlockId) {
      const finalContent = state.streamingContent
      if (finalContent) {
        const wordCount = finalContent
          .replace(/<[^>]*>/g, ' ')
          .split(/\s+/)
          .filter(Boolean).length
        updateBlock(state.streamingBlockId, {
          content_html: finalContent,
          status: 'done',
          word_count: wordCount,
        })
      }
      setStreamingBlockId(null)
    }
  }, [setStreamingBlockId, updateBlock])

  return { startStreaming, stopStreaming }
}
