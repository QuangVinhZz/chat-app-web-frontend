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

const sortConversations = (list) => {
  return [...list].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    if (a.isPinned && b.isPinned) {
      return (b.pinOrder ?? 0) - (a.pinOrder ?? 0)
    }
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return timeB - timeA
  })
}

const computePreview = (c) => {
  if (c.messages && c.messages.length > 0) {
    const lastMsg = c.messages[0]
    if (lastMsg.isRecalled || lastMsg.is_recalled) return '[Message recalled]'
    const content = lastMsg.content
    if (content?.startsWith('__system__:')) {
      const parts = content.split(':')
      const action = parts[1]
      const actorMember = c.members?.find((m) => m.user?.id === lastMsg.senderId)
      const actorName = actorMember?.nickname || lastMsg.sender?.name || 'Thành viên'
      if (action === 'joined') return `${actorName} đã tham gia nhóm`
      if (action === 'left') return `${actorName} đã rời nhóm`
      if (action === 'added') return `${actorName} đã thêm ${parts[3] || 'thành viên'}`
      if (action === 'removed') return `${actorName} đã xóa ${parts[3] || 'thành viên'}`
      if (action === 'custom') return parts.slice(2).join(':')
      if (action === 'nickname-changed') {
        const targetUuid = parts[2]
        const newNickname = parts.slice(3).join(':')
        const targetMember = c.members?.find((m) => m.user?.uuid === targetUuid || m.user?.id === targetUuid)
        const targetName = targetMember?.user?.name || 'thành viên'
        return newNickname
          ? `${actorName} đã đặt biệt danh cho ${targetName} là ${newNickname}`
          : `${actorName} đã gỡ biệt danh của ${targetName}`
      }
    }
    return lastMsg.content
      ? lastMsg.content
      : (lastMsg.attachments?.length ?? 0) > 0
        ? '[attachment]'
        : ''
  }
  if (c.lastMessagePreview) {
    const content = c.lastMessagePreview
    if (content.startsWith('__system__:')) {
      const parts = content.split(':')
      const action = parts[1]
      if (action === 'joined') return 'Một thành viên đã tham gia nhóm'
      if (action === 'left') return 'Một thành viên đã rời nhóm'
      if (action === 'added') return `Một thành viên đã được thêm vào nhóm`
      if (action === 'removed') return `Một thành viên đã bị xóa khỏi nhóm`
      if (action === 'custom') return parts.slice(2).join(':')
      if (action === 'nickname-changed') {
        const targetUuid = parts[2]
        const newNickname = parts.slice(3).join(':')
        const targetMember = c.members?.find((m) => m.user?.uuid === targetUuid || m.user?.id === targetUuid)
        const targetName = targetMember?.user?.name || 'thành viên'
        return newNickname
          ? `Một thành viên đã đặt biệt danh cho ${targetName} là ${newNickname}`
          : `Một thành viên đã gỡ biệt danh của ${targetName}`
      }
    }
    return c.lastMessagePreview
  }
  return ''
}

export const useConversationsStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const list = await conversationService.list()
      const mapped = list.map((c) => ({
        ...c,
        lastMessagePreview: computePreview(c),
      }))
      const sorted = sortConversations(mapped)
      set({ conversations: sorted })
      return sorted
    } finally {
      set({ loading: false })
    }
  },

  /** Insert-or-update a single conversation (preserves unreadCount). */
  upsert: (conversation) => {
    if (!conversation) return
    set((state) => {
      const updatedConv = {
        ...conversation,
        lastMessagePreview: computePreview(conversation),
      }
      const idx = state.conversations.findIndex((c) => c.id === updatedConv.id)
      const next = state.conversations.slice()
      if (idx === -1) {
        next.unshift({ unreadCount: 0, ...updatedConv })
      } else {
        next[idx] = {
          ...next[idx],
          ...updatedConv,
          // Keep an existing unreadCount if the incoming payload doesn't
          // carry one (e.g. upsert after a mutation that doesn't fetch
          // the count).
          unreadCount:
            updatedConv.unreadCount ?? next[idx].unreadCount ?? 0,
        }
      }
      return { conversations: sortConversations(next) }
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

  togglePin: async (conversationId) => {
    try {
      const res = await conversationService.togglePin(conversationId)
      set((state) => {
        const next = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              isPinned: res.isPinned,
              pinOrder: res.isPinned ? Date.now() : null,
            }
          }
          return c
        })
        return { conversations: sortConversations(next) }
      })
      // Fetch fresh list from DB to sync final order
      get().refresh().catch(() => {})
      return res
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      throw err
    }
  },

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
      let previewText = msg.isRecalled
        ? '[Message recalled]'
        : msg.content
          ? msg.content
          : (msg.attachments?.length ?? 0) > 0
            ? '[attachment]'
            : current.lastMessagePreview || ''

      if (msg.content?.startsWith('__system__:')) {
        const parts = msg.content.split(':')
        const action = parts[1]
        const actorMember = current.members?.find((m) => m.user?.id === msg.senderId)
        const actorName = actorMember?.nickname || msg.sender?.name || 'Thành viên'
        if (action === 'joined') previewText = `${actorName} đã tham gia nhóm`
        else if (action === 'left') previewText = `${actorName} đã rời nhóm`
        else if (action === 'added') previewText = `${actorName} đã thêm ${parts[3] || 'thành viên'}`
        else if (action === 'removed') previewText = `${actorName} đã xóa ${parts[3] || 'thành viên'}`
        else if (action === 'custom') previewText = parts.slice(2).join(':')
        else if (action === 'nickname-changed') {
          const targetUuid = parts[2]
          const newNickname = parts.slice(3).join(':')
          const targetMember = current.members?.find((m) => m.user?.uuid === targetUuid || m.user?.id === targetUuid)
          const targetName = targetMember?.user?.name || 'thành viên'
          previewText = newNickname
            ? `${actorName} đã đặt biệt danh cho ${targetName} là ${newNickname}`
            : `${actorName} đã gỡ biệt danh của ${targetName}`
        }
      }

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
      return { conversations: sortConversations(next) }
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
      socketService.on('friend:unblocked-by', () => get().refresh().catch(() => {})),
      socketService.on('presence:changed', ({ userId, isOnline, lastSeenAt }) => {
        set((state) => {
          const next = state.conversations.map((c) => {
            if (c.type !== 'direct') return c
            const members = c.members?.map((m) => {
              if (m.user?.id === userId) {
                return {
                  ...m,
                  user: { ...m.user, isOnline, lastSeenAt },
                }
              }
              return m
            })
            return { ...c, members }
          })
          return { conversations: next }
        })
      })
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
