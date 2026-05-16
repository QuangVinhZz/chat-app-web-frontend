/**
 * Zustand store for AI chat state.
 *
 * Manages:
 *  - The single AI conversation (1 per user, lazy-created)
 *  - Messages for that conversation
 *  - Loading / error state
 */
import { create } from 'zustand'
import { aiService } from '../services/aiService'
import { messageService } from '../services/messageService'

export const useAiStore = create((set, get) => ({
  // The AI conversation object (null until first startConversation call)
  conversation: null,
  conversationLoaded: false,

  // Messages in chronological order (oldest → newest)
  messages: [],

  // True while waiting for AI reply
  loading: false,

  // Error string or null
  error: null,

  // Rate limiting: track request timestamps (last 60 seconds)
  requestTimestamps: [],

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  /**
   * Clean up old timestamps (older than 60 seconds)
   */
  cleanupOldTimestamps() {
    const now = Date.now()
    set((s) => ({
      requestTimestamps: s.requestTimestamps.filter((ts) => now - ts < 60000),
    }))
  },

  /**
   * Check if user can send a request (rate limit: 10 requests per minute)
   */
  canSendRequest() {
    get().cleanupOldTimestamps()
    return get().requestTimestamps.length < 10
  },

  /**
   * Ensure the AI conversation exists. Idempotent — returns cached if
   * already loaded.
   */
  async ensureConversation() {
    if (get().conversation) return get().conversation
    try {
      const conv = await aiService.startConversation()
      set({ conversation: conv, conversationLoaded: true })
      return conv
    } catch (err) {
      set({ error: err?.message || 'Failed to start AI conversation.' })
      throw err
    }
  },

  /**
   * Load message history for the AI conversation.
   * Uses cache — won't re-fetch if messages already present.
   */
  async loadMessages(force = false) {
    const conv = get().conversation
    if (!conv?.id) return
    if (!force && get().messages.length > 0) return

    set({ loading: true, error: null })
    try {
      const msgs = await messageService.list(conv.id, { limit: 50 })
      // Backend returns newest-first; store oldest-first
      set({ messages: msgs.slice().reverse() })
    } catch (err) {
      set({ error: err?.message || 'Failed to load messages.' })
    } finally {
      set({ loading: false })
    }
  },

  /**
   * Send a message to the AI and append both user + AI messages.
   * @param {string} content
   */
  async sendMessage(content) {
    if (get().loading) return
    const conv = get().conversation
    if (!conv?.id) return

    // Check rate limit
    if (!get().canSendRequest()) {
      const error = 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một chút trước khi gửi tiếp.'
      set({ error })
      throw new Error(error)
    }

    // Optimistic: append user message immediately
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      conversationId: conv.id,
      senderId: '__me__',
      content,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }
    set((s) => ({ messages: [...s.messages, optimisticMsg], loading: true, error: null }))

    try {
      const { userMessage, aiMessage } = await aiService.sendMessage(conv.id, content)

      // Record successful request timestamp
      set((s) => ({
        requestTimestamps: [...s.requestTimestamps, Date.now()],
      }))

      set((s) => {
        // Replace optimistic message with real one, then append AI reply
        const filtered = s.messages.filter((m) => m.id !== tempId)
        return {
          messages: [...filtered, userMessage, aiMessage],
          loading: false,
        }
      })
    } catch (err) {
      // Remove optimistic message on failure
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== tempId),
        loading: false,
        error: err?.message || 'AI failed to respond.',
      }))
      throw err
    }
  },

  clearError() {
    set({ error: null })
  },

  /**
   * Clear all messages (start new chat)
   */
  clearMessages() {
    set({ messages: [], error: null })
  },

  /**
   * Delete all messages in the conversation from database
   */
  async deleteAllMessages() {
    const conv = get().conversation
    const messages = get().messages
    if (!conv?.id || messages.length === 0) return

    try {
      // Recall all messages (this marks them as deleted in database)
      const deletePromises = messages
        .filter(m => !m._optimistic) // Skip optimistic messages
        .map(msg => messageService.recall(msg.id).catch(() => {})) // Ignore individual failures
      
      await Promise.all(deletePromises)
      
      // Clear from UI
      set({ messages: [], error: null })
    } catch (err) {
      set({ error: 'Không thể xóa tin nhắn. Vui lòng thử lại.' })
      throw err
    }
  },

  reset() {
    set({
      conversation: null,
      conversationLoaded: false,
      messages: [],
      loading: false,
      error: null,
      requestTimestamps: [],
    })
  },
}))
