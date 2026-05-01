/**
 * AI Service — wraps the backend AI endpoints.
 *
 * POST /ai/conversations  → start (or return existing) AI conversation
 * POST /ai/chat           → send a message and get AI reply
 */
import { apiClient } from './apiClient'

export const aiService = {
  /**
   * Create (or return existing) AI conversation for the current user.
   * @returns {Promise<object>} conversation object
   */
  async startConversation() {
    const data = await apiClient.post('/ai/conversations')
    return data?.conversation ?? data
  },

  /**
   * Send a message to an AI conversation and receive the AI reply.
   * @param {string} conversationId - UUID of the AI conversation
   * @param {string} content - user message text
   * @returns {Promise<{userMessage: object, aiMessage: object}>}
   */
  async sendMessage(conversationId, content) {
    const data = await apiClient.post('/ai/chat', {
      conversation_id: conversationId,
      content,
    })
    return data // { userMessage, aiMessage }
  },
}
