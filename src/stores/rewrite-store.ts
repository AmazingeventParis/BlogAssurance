import { create } from 'zustand'
import type { ReviewResult, BlockComment } from '@/types'

interface RewriteStore {
  review: ReviewResult | null
  comments: BlockComment[]
  rewriteInProgress: boolean
  setReview: (review: ReviewResult | null) => void
  setComments: (comments: BlockComment[]) => void
  addComment: (comment: BlockComment) => void
  updateCommentStatus: (commentId: string, status: 'pending' | 'applied') => void
  setRewriteInProgress: (inProgress: boolean) => void
}

export const useRewriteStore = create<RewriteStore>((set) => ({
  review: null,
  comments: [],
  rewriteInProgress: false,
  setReview: (review) => set({ review }),
  setComments: (comments) => set({ comments }),
  addComment: (comment) =>
    set((state) => ({ comments: [...state.comments, comment] })),
  updateCommentStatus: (commentId, status) =>
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === commentId ? { ...c, status } : c
      ),
    })),
  setRewriteInProgress: (inProgress) => set({ rewriteInProgress: inProgress }),
}))
