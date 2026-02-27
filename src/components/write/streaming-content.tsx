'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StreamingContentProps {
  content: string
  isStreaming: boolean
  className?: string
}

export function StreamingContent({
  content,
  isStreaming,
  className,
}: StreamingContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-scroll to bottom as new content arrives
  useEffect(() => {
    if (isStreaming && containerRef.current && content.length > prevLengthRef.current) {
      const el = containerRef.current
      el.scrollTop = el.scrollHeight
    }
    prevLengthRef.current = content.length
  }, [content, isStreaming])

  if (!content && isStreaming) {
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm">Generation en cours...</span>
        </div>
      </div>
    )
  }

  if (!content) {
    return null
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn(
          'prose prose-sm max-w-none overflow-y-auto',
          'prose-headings:text-foreground prose-p:text-foreground',
          'prose-strong:text-foreground prose-li:text-foreground',
          'transition-opacity duration-300 ease-in',
          isStreaming ? 'max-h-[500px]' : ''
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-5 bg-orange-500 ml-0.5 align-text-bottom"
          style={{
            animation: 'blink-cursor 0.8s steps(2) infinite',
          }}
        />
      )}
      <style jsx>{`
        @keyframes blink-cursor {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
