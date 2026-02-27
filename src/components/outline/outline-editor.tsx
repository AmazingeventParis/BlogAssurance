'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, FileText } from 'lucide-react'
import { OutlineBlockCard } from './outline-block-card'
import type { OutlineStructure, OutlineBlock } from '@/types'

interface OutlineEditorProps {
  outline: OutlineStructure
  onChange: (outline: OutlineStructure) => void
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function OutlineEditor({ outline, onChange }: OutlineEditorProps) {
  const [isAddingBlock, setIsAddingBlock] = useState(false)
  const [newBlockType, setNewBlockType] = useState<OutlineBlock['type']>('h2')
  const [newBlockHeading, setNewBlockHeading] = useState('')
  const [newBlockWordCount, setNewBlockWordCount] = useState(300)
  const [newBlockDirective, setNewBlockDirective] = useState('')
  const [newBlockFormatHint, setNewBlockFormatHint] = useState<OutlineBlock['format_hint']>('prose')

  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [editTitle, setEditTitle] = useState(outline.title)
  const [editMetaDesc, setEditMetaDesc] = useState(outline.meta_description)
  const [editSlug, setEditSlug] = useState(outline.slug)

  const totalWords = outline.content_blocks.reduce(
    (sum, block) => sum + block.word_count,
    0
  )

  // ---------- Block operations ----------
  const handleUpdateBlock = useCallback(
    (id: string, updates: Partial<OutlineBlock>) => {
      const newBlocks = outline.content_blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
      onChange({ ...outline, content_blocks: newBlocks })
    },
    [outline, onChange]
  )

  const handleDeleteBlock = useCallback(
    (id: string) => {
      const newBlocks = outline.content_blocks.filter((block) => block.id !== id)
      onChange({ ...outline, content_blocks: newBlocks })
    },
    [outline, onChange]
  )

  const handleMoveUp = useCallback(
    (id: string) => {
      const blocks = [...outline.content_blocks]
      const index = blocks.findIndex((b) => b.id === id)
      if (index <= 0) return
      ;[blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]]
      onChange({ ...outline, content_blocks: blocks })
    },
    [outline, onChange]
  )

  const handleMoveDown = useCallback(
    (id: string) => {
      const blocks = [...outline.content_blocks]
      const index = blocks.findIndex((b) => b.id === id)
      if (index < 0 || index >= blocks.length - 1) return
      ;[blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]
      onChange({ ...outline, content_blocks: blocks })
    },
    [outline, onChange]
  )

  const handleAddBlock = () => {
    const newBlock: OutlineBlock = {
      id: generateUUID(),
      type: newBlockType,
      heading: newBlockHeading || null,
      word_count: newBlockWordCount,
      writing_directive: newBlockDirective,
      format_hint: newBlockFormatHint,
    }
    onChange({
      ...outline,
      content_blocks: [...outline.content_blocks, newBlock],
    })
    // Reset form
    setNewBlockType('h2')
    setNewBlockHeading('')
    setNewBlockWordCount(300)
    setNewBlockDirective('')
    setNewBlockFormatHint('prose')
    setIsAddingBlock(false)
  }

  const handleSaveMeta = () => {
    onChange({
      ...outline,
      title: editTitle,
      meta_description: editMetaDesc,
      slug: editSlug,
    })
    setIsEditingMeta(false)
  }

  return (
    <div className="space-y-6">
      {/* Article metadata */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations de l&apos;article
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTitle(outline.title)
                setEditMetaDesc(outline.meta_description)
                setEditSlug(outline.slug)
                setIsEditingMeta(true)
              }}
            >
              Modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Titre H1</span>
            <p className="text-sm font-semibold">{outline.title}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Meta description</span>
            <p className="text-sm text-muted-foreground">{outline.meta_description}</p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Slug</span>
              <p className="text-sm font-mono text-muted-foreground">/{outline.slug}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Mots total</span>
              <Badge variant="secondary" className="ml-1">
                ~{totalWords} mots
              </Badge>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Blocs</span>
              <Badge variant="secondary" className="ml-1">
                {outline.content_blocks.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content blocks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Structure du plan ({outline.content_blocks.length} blocs)
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingBlock(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter un bloc
          </Button>
        </div>

        <div className="space-y-2">
          {outline.content_blocks.map((block, index) => (
            <OutlineBlockCard
              key={block.id}
              block={block}
              index={index}
              totalBlocks={outline.content_blocks.length}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>

        {outline.content_blocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun bloc dans le plan.</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setIsAddingBlock(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter le premier bloc
            </Button>
          </div>
        )}
      </div>

      {/* Add block dialog */}
      <Dialog open={isAddingBlock} onOpenChange={setIsAddingBlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un bloc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Block type */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type de bloc</label>
              <div className="flex flex-wrap gap-2">
                {(['paragraph', 'h2', 'h3', 'h4', 'faq'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={newBlockType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewBlockType(type)}
                  >
                    {type === 'paragraph'
                      ? 'Paragraphe'
                      : type === 'faq'
                        ? 'FAQ'
                        : type.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Heading */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Titre</label>
              <Input
                value={newBlockHeading}
                onChange={(e) => setNewBlockHeading(e.target.value)}
                placeholder={
                  newBlockType === 'paragraph'
                    ? '(optionnel pour les paragraphes)'
                    : 'Titre du bloc'
                }
              />
            </div>

            {/* Word count */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Nombre de mots cible
              </label>
              <Input
                type="number"
                value={newBlockWordCount}
                onChange={(e) => setNewBlockWordCount(parseInt(e.target.value) || 100)}
                min={50}
                max={2000}
              />
            </div>

            {/* Format hint */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Format</label>
              <div className="flex flex-wrap gap-2">
                {(['prose', 'bullets', 'table', 'mixed'] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={newBlockFormatHint === fmt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewBlockFormatHint(fmt)}
                  >
                    {fmt === 'prose'
                      ? 'Prose'
                      : fmt === 'bullets'
                        ? 'Puces'
                        : fmt === 'table'
                          ? 'Tableau'
                          : 'Mixte'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Writing directive */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Directive de redaction
              </label>
              <Textarea
                value={newBlockDirective}
                onChange={(e) => setNewBlockDirective(e.target.value)}
                placeholder="Instructions pour le redacteur sur le contenu de ce bloc..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingBlock(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddBlock}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit metadata dialog */}
      <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les informations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Titre H1</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Titre de l'article"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editTitle.length}/65 caracteres
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Meta description</label>
              <Textarea
                value={editMetaDesc}
                onChange={(e) => setEditMetaDesc(e.target.value)}
                placeholder="Description pour les moteurs de recherche"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editMetaDesc.length}/155 caracteres
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Slug URL</label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="slug-de-la-page"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingMeta(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveMeta}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
