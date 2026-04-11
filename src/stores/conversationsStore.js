import { create } from 'zustand'
import { conversationService } from '../services/conversationService'
import { socketService } from '../services/socketService'
import { useUserStore } from './userStore'

/**
 * Conversations store — source of truth for the sidebar list.
 *
 * Responsibilities:
 *   - Mirror `/conversations` with `unreadCount` per conversation
 *   - React to realtime events so the list stays fresh even when the
 *     user isn't currently viewing a chat:
 *       * `message:new`          → bump last-message info + unread count
 *       * `message:recalled`     → patch the preview if it was the last
 *       * `conversation:read`    → clear my own unread count
 *   - Track which conversation is "active" (open in the ChatPage) so
 *     incoming messages for THAT conversation don't count as unread.
 */
let unsubs = []
let started = false

export const useConversationsStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
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

  /** Insert-or-update a single conversation (preserves unreadCount). */
  upsert: (conversation) => {
    if (!conversation) return
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conversation.id)
      const next = state.conversations.slice()
      if (idx === -1) {
        next.unshift({ unreadCount: 0, ...conversation })
      } else {
        next[idx] = {
          ...next[idx],
          ...conversation,
          // Keep an existing unreadCount if the incoming payload doesn't
          // carry one (e.g. upsert after a mutation that doesn't fetch
          // the count).
          unreadCount:
            conversation.unreadCount ?? next[idx].unreadCount ?? 0,
        }
      }
      return { conversations: next }
    })
  },

  remove: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
    })),

  findById: (id) => get().conversations.find((c) => c.id === id),

  /** The conversation currently open in the ChatPage (or null). */
  setActive: (convId) => {
    set({ activeConversationId: convId })
    if (convId) get().clearUnread(convId)
  },

  clearUnread: (convId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      ),
    }))
  },

  /** Sum of unread counts across all conversations. */
  getTotalUnread: () =>
    get().conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),

  /**
   * Apply a new message to the sidebar list:
   *   - Move its conversation to the top
   *   - Update `lastMessageAt` / `lastMessagePreview`
   *   - Increment `unreadCount` unless the message is mine or the
   *     conversation is currently active
   *
   * If the message belongs to a conversation we don't have locally yet
   * (e.g. a brand-new 1-1 a friend just started), fetch it and upsert.
   */
  onNewMessage: (msg) => {
    if (!msg || !msg.conversationId) return
    const myId = useUserStore.getState().user?.id
    const isMine = msg.senderId === myId
    const isActive = get().activeConversationId === msg.conversationId

    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === msg.conversationId)
      if (idx === -1) {
        // Not in the local list yet — fetch and upsert out of band.
        conversationService
          .get(msg.conversationId)
          .then((conv) => {
            if (!conv) return
            const initialUnread = isMine || isActive ? 0 : 1
            get().upsert({ ...conv, unreadCount: initialUnread })
          })
          .catch(() => {})
        return state
      }

      const current = state.conversations[idx]
      const previewText = msg.isRecalled
        ? '[Message recalled]'
        : msg.content
          ? msg.content
          : (msg.attachments?.length ?? 0) > 0
            ? '[attachment]'
            : current.lastMessagePreview || ''

      const updated = {
        ...current,
        lastMessageAt: msg.createdAt || current.lastMessageAt,
        lastMessagePreview: previewText,
        unreadCount:
          isMine || isActive
            ? current.unreadCount ?? 0
            : (current.unreadCount ?? 0) + 1,
      }

      const next = state.conversations.slice()
      next.splice(idx, 1)
      next.unshift(updated)
      return { conversations: next }
    })
  },

  /** Start global realtime subscriptions. Idempotent. */
  startRealtime: () => {
    if (started) return
    started = true

    unsubs.push(
      socketService.on('message:new', (msg) => {
        get().onNewMessage(msg)
      }),
      socketService.on('message:recalled', ({ id }) => {
        // If the recalled message was the last one in a conversation,
        // patch the preview. We don't know which conversation it belongs
        // to from this event alone — just update any matching preview by
        // doing nothing (Sidebar re-renders via other signals). The
        // bubble itself is patched in ChatPage.
        void id
      }),
      socketService.on('conversation:read', (payload) => {
        const myId = useUserStore.getState().user?.id
        if (!payload || !myId) return
        if (payload.userId === myId) {
          get().clearUnread(payload.conversationId)
        }
      }),
      // A new conversation that includes us (someone added us to a
      // group, or we just created one on another tab). Fetch the full
      // conversation payload so we have members + unreadCount, then
      // upsert into the list.
      socketService.on('conversation:joined', async (payload) => {
        if (!payload?.conversationId) return
        try {
          const conv = await conversationService.get(payload.conversationId)
          if (conv) get().upsert(conv)
        } catch {
          // Best-effort — if the fetch fails the list will be stale
          // until the next refresh.
        }
      }),
      // We've been removed from a conversation (kicked / left / the
      // group was disbanded). Drop it from the local list. ChatPage
      // subscribes separately and will navigate away if it happens to
      // be the active one.
      socketService.on('conversation:removed', (payload) => {
        if (!payload?.conversationId) return
        get().remove(payload.conversationId)
        if (get().activeConversationId === payload.conversationId) {
          set({ activeConversationId: null })
        }
      }),
      // A group's member list changed (add / remove / leave). If we
      // happen to have that conversation in state, refetch just it so
      // the GroupInfoDialog reflects the change.
      socketService.on('conversation:members-changed', async (payload) => {
        if (!payload?.conversationId) return
        if (!get().conversations.some((c) => c.id === payload.conversationId)) {
          return
        }
        try {
          const fresh = await conversationService.get(payload.conversationId)
          if (fresh) get().upsert(fresh)
        } catch {
          // ignore
        }
      }),
      // Any block / unblock affecting me → refresh the list so the
      // blockedByMe / blockedByOther flags update everywhere.
      socketService.on('friend:blocked', () => get().refresh().catch(() => {})),
      socketService.on('friend:blocked-by', () => get().refresh().catch(() => {})),
      socketService.on('friend:unblocked', () => get().refresh().catch(() => {})),
      socketService.on('friend:unblocked-by', () => get().refresh().catch(() => {}))
    )
  },

  stopRealtime: () => {
    for (const off of unsubs) off?.()
    unsubs = []
    started = false
  },

  reset: () => {
    for (const off of unsubs) off?.()
    unsubs = []
    started = false
    set({ conversations: [], activeConversationId: null, loading: false })
  },
}))
