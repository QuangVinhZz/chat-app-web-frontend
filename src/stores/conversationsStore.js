import { create } from 'zustand'
import { conversationService } from '../services/conversationService'

/**
 * Conversations store — shared source of truth for the list that the
 * Sidebar renders and the ChatPage header relies on.
 *
 * Backend conversations are already sorted by `lastMessageAt desc` in
 * the list endpoint, so we just mirror them locally.
 */
export const useConversationsStore = create((set, get) => ({
  conversations: [],
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const list = await conversationService.list()
      set({ conversations: list })
      return list
    } finally {
      set({ loading: false })
    }
  },

  /** Insert-or-update a single conversation (used after create / updates). */
  upsert: (conversation) => {
    if (!conversation) return
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conversation.id)
      const next = state.conversations.slice()
      if (idx === -1) {
        next.unshift(conversation)
      } else {
        next[idx] = { ...next[idx], ...conversation }
      }
      return { conversations: next }
    })
  },

  /** Remove a conversation (e.g. after disband / leave). */
  remove: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
    })),

  findById: (id) => {
    const num = Number(id)
    return get().conversations.find((c) => c.id === num)
  },

  reset: () => set({ conversations: [], loading: false }),
}))
