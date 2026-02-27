import { create } from 'zustand'
import type { DraftBlock } from '@/types'

interface WritingStore {
  blocks: DraftBlock[]
  streamingBlockId: string | null
  streamingContent: string
  setBlocks: (blocks: DraftBlock[]) => void
  setStreamingBlockId: (id: string | null) => void
  appendStreamingContent: (text: string) => void
  resetStreamingContent: () => void
  updateBlock: (id: string, updates: Partial<DraftBlock>) => void
}

export const useWritingStore = create<WritingStore>((set) => ({
  blocks: [],
  streamingBlockId: null,
  streamingContent: '',
  setBlocks: (blocks) => set({ blocks }),
  setStreamingBlockId: (id) => set({ streamingBlockId: id }),
  appendStreamingContent: (text) =>
    set((state) => ({ streamingContent: state.streamingContent + text })),
  resetStreamingContent: () => set({ streamingContent: '' }),
  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),
}))
