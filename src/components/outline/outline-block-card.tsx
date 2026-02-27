'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
} from 'lucide-react'
import type { OutlineBlock } from '@/types'

const BLOCK_TYPE_LABELS: Record<string, string> = {
  paragraph: 'Paragraphe',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  faq: 'FAQ',
  list: 'Liste',
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  paragraph: 'bg-gray-100 text-gray-700',
  h2: 'bg-blue-100 text-blue-800',
  h3: 'bg-sky-100 text-sky-700',
  h4: 'bg-cyan-100 text-cyan-700',
  faq: 'bg-purple-100 text-purple-800',
  list: 'bg-green-100 text-green-700',
}

const FORMAT_HINT_LABELS: Record<string, string> = {
  prose: 'Prose',
  bullets: 'Puces',
  table: 'Tableau',
  mixed: 'Mixte',
}

interface OutlineBlockCardProps {
  block: OutlineBlock
  index: number
  totalBlocks: number
  onUpdate: (id: string, updates: Partial<OutlineBlock>) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

export function OutlineBlockCard({
  block,
  index,
  totalBlocks,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OutlineBlockCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editHeading, setEditHeading] = useState(block.heading || '')
  const [editWordCount, setEditWordCount] = useState(block.word_count)
  const [editDirective, setEditDirective] = useState(block.writing_directive || '')

  const handleSave = () => {
    onUpdate(block.id, {
      heading: editHeading || null,
      word_count: editWordCount,
      writing_directive: editDirective,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditHeading(block.heading || '')
    setEditWordCount(block.word_count)
    setEditDirective(block.writing_directive || '')
    setIsEditing(false)
  }

  const indentClass =
    block.type === 'h3'
      ? 'ml-6'
      : block.type === 'h4'
        ? 'ml-12'
        : ''

  return (
    <div className={indentClass}>
      <Card className="group relative border transition-colors hover:border-primary/30">
        <CardContent className="p-4">
          {isEditing ? (
            <div className="space-y-3">
              {/* Heading edit */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Titre
                </label>
                <Input
                  value={editHeading}
                  onChange={(e) => setEditHeading(e.target.value)}
                  placeholder={block.type === 'paragraph' ? '(pas de titre)' : 'Titre du bloc'}
                />
              </div>

              {/* Word count edit */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nombre de mots cible
                </label>
                <Input
                  type="number"
                  value={editWordCount}
                  onChange={(e) => setEditWordCount(parseInt(e.target.value) || 0)}
                  min={50}
                  max={2000}
                />
              </div>

              {/* Directive edit */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Directive de redaction
                </label>
                <Textarea
                  value={editDirective}
                  onChange={(e) => setEditDirective(e.target.value)}
                  placeholder="Instructions pour le redacteur..."
                  rows={3}
                />
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Valider
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {/* Drag handle + reorder */}
              <div className="flex flex-col items-center gap-0.5 pt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={index === 0}
                  onClick={() => onMoveUp(block.id)}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={index === totalBlocks - 1}
                  onClick={() => onMoveDown(block.id)}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Block content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {/* Type badge */}
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${BLOCK_TYPE_COLORS[block.type] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {BLOCK_TYPE_LABELS[block.type] || block.type}
                  </span>

                  {/* Format hint badge */}
                  {block.format_hint && (
                    <Badge variant="outline" className="text-xs">
                      {FORMAT_HINT_LABELS[block.format_hint] || block.format_hint}
                    </Badge>
                  )}

                  {/* Word count */}
                  <span className="text-xs text-muted-foreground">
                    ~{block.word_count} mots
                  </span>
                </div>

                {/* Heading */}
                <p className="font-medium text-sm leading-tight">
                  {block.heading || (
                    <span className="text-muted-foreground italic">
                      {block.type === 'paragraph'
                        ? 'Bloc introduction'
                        : block.type === 'faq'
                          ? 'Section FAQ'
                          : 'Sans titre'}
                    </span>
                  )}
                </p>

                {/* Writing directive preview */}
                {block.writing_directive && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {block.writing_directive}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(block.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
