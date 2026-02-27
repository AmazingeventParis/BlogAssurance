'use client'

import { useRef, useEffect, useState } from 'react'

interface HTMLPreviewProps {
  html: string
}

export function HTMLPreview({ html }: HTMLPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(600)

  useEffect(() => {
    // Adjust iframe height to match content once loaded
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const body = iframe.contentDocument?.body
        if (body) {
          const contentHeight = body.scrollHeight
          setIframeHeight(Math.min(Math.max(contentHeight + 40, 400), 2000))
        }
      } catch {
        // Cross-origin restrictions may prevent access in some edge cases
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [html])

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-500 ml-2">Apercu HTML</span>
      </div>
      <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Apercu de l'article"
          className="w-full border-0"
          style={{ height: `${iframeHeight}px` }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
