import { apiClient } from './apiClient'

/**
 * Message service — wraps MessagesController endpoints.
 *
 * Backend message shape (from MessageService.serialize):
 *   {
 *     id: uuid,
 *     conversationId: uuid,
 *     senderId: uuid,
 *     content: string | null,
 *     replyToMessageId: uuid | null,
 *     forwardedFromId: uuid | null,
 *     isRecalled: boolean,
 *     createdAt: ISO datetime,
 *     sender: { id: uuid, name, avatarUrl },
 *     attachments: [{ id, url, type, fileName, mimeType, fileSize }],
 *     reactions: [{ userId: uuid, emoji }],
 *   }
 *
 * The REST list endpoint returns messages DESC by id. Callers that
 * render chronologically should reverse the array.
 */
export const messageService = {
  /**
   * List messages of a conversation, newest first.
   * @param {string} conversationId — conversation UUID
   * @param {{ before?: string, limit?: number }} options — `before` is a
   *   message UUID used as a cursor for pagination.
   */
  async list(conversationId, { before, limit = 30 } = {}) {
    const data = await apiClient.get(`/conversations/${conversationId}/messages`, {
      query: { before, limit },
    })
    return data?.messages ?? []
  },

  async send(conversationId, { content, replyToMessageId, attachmentIds } = {}) {
    const data = await apiClient.post(`/conversations/${conversationId}/messages`, {
      content,
      reply_to_message_id: replyToMessageId,
      attachment_ids: attachmentIds,
    })
    return data?.message
  },

  /**
   * Upload a file to be attached to a future message.
   * @param {File} file
   * @param {{ durationMs?: number, type?: 'image'|'video'|'audio'|'document' }} options
   *   - durationMs: voice recording length (so the UI doesn't probe).
   *   - type: override when extension misleads (e.g. .webm from MediaRecorder is audio).
   */
  async uploadAttachment(file, { durationMs, type } = {}) {
    const form = new FormData()
    form.append('file', file)
    if (durationMs != null) form.append('duration_ms', String(Math.round(durationMs)))
    if (type) form.append('type', type)
    const data = await apiClient.post('/messages/upload', form, { isForm: true })
    return data?.attachment
  },

  async recall(messageId) {
    const data = await apiClient.post(`/messages/${messageId}/recall`, {})
    return data?.message
  },

  async deleteForMe(messageId) {
    return apiClient.post(`/messages/${messageId}/delete`, {})
  },

  async forward(messageId, conversationIds) {
    const data = await apiClient.post(`/messages/${messageId}/forward`, {
      conversation_ids: conversationIds,
    })
    return data?.messages ?? []
  },

  async react(messageId, emoji) {
    const data = await apiClient.post(`/messages/${messageId}/reactions`, { emoji })
    return data?.reaction
  },

  async unreact(messageId, emoji) {
    return apiClient.delete(
      `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
    )
  },

  async pin(messageId) {
    return apiClient.post(`/messages/${messageId}/pin`, {})
  },

  async unpin(messageId) {
    return apiClient.delete(`/messages/${messageId}/pin`)
  },

  async star(messageId) {
    return apiClient.post(`/messages/${messageId}/star`, {})
  },

  async unstar(messageId) {
    return apiClient.delete(`/messages/${messageId}/star`)
  },

  async listStarred() {
    const data = await apiClient.get('/messages/starred')
    return data?.messages ?? []
  },

  async detail(messageId) {
    const data = await apiClient.get(`/messages/${messageId}/detail`)
    return data // { message, readers }
  },
}
