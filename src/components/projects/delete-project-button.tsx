'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteProjectButtonProps {
  projectId: string
}

export function DeleteProjectButton({ projectId }: DeleteProjectButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/projects')
        router.refresh()
      }
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Annuler
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        {deleting
          ? 'Suppression...'
          : confirming
            ? 'Confirmer la suppression'
            : 'Supprimer'}
      </Button>
    </div>
  )
}
