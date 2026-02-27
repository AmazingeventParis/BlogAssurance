'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ExportActionsProps {
  projectId: string
  html: string
  slug: string
}

export function ExportActions({ projectId, html, slug }: ExportActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleCopyHTML = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = html
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/export?format=html`)
      if (!response.ok) {
        throw new Error('Erreur lors du telechargement')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${slug || 'article'}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={handleCopyHTML}
        className="min-w-[140px]"
      >
        {copySuccess ? 'Copie !' : 'Copier le HTML'}
      </Button>
      <Button
        onClick={handleDownload}
        disabled={downloading}
        className="min-w-[140px]"
      >
        {downloading ? 'Telechargement...' : 'Telecharger'}
      </Button>
    </div>
  )
}
