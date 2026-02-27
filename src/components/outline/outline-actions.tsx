'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Save, ArrowRight } from 'lucide-react'

interface OutlineActionsProps {
  hasOutline: boolean
  isGenerating: boolean
  isSaving: boolean
  onGenerate: () => void
  onSave: () => void
  onSaveAndContinue: () => void
}

export function OutlineActions({
  hasOutline,
  isGenerating,
  isSaving,
  onGenerate,
  onSave,
  onSaveAndContinue,
}: OutlineActionsProps) {
  if (!hasOutline) {
    return (
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generation du plan en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generer le plan
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={onGenerate}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Regeneration...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Regenerer le plan
          </>
        )}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isSaving || isGenerating}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>

        <Button
          onClick={onSaveAndContinue}
          disabled={isSaving || isGenerating}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Sauvegarder et continuer
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
