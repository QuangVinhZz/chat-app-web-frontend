import { apiClient } from './apiClient'

/**
 * Conversation service — wraps ConversationsController endpoints.
 *
 * Backend conversation shape:
 *   {
 *     id, type: 'direct' | 'group', name, avatarUrl, ownerId,
 *     createdBy, lastMessageAt, lastMessagePreview, createdAt, updatedAt,
 *     members: [
 *       { id, role: 'owner' | 'admin' | 'member', joinedAt,
 *         user: { id, name, avatarUrl, bio, isOnline, lastSeenAt } }
 *     ]
 *   }
 */
export const conversationService = {
  async list() {
    const data = await apiClient.get('/conversations')
    return data?.conversations ?? []
  },

  async get(id) {
    const data = await apiClient.get(`/conversations/${id}`)
    return data?.conversation
  },

  async createDirect(userId) {
    const data = await apiClient.post('/conversations/direct', {
      user_id: userId,
    })
    return data?.conversation
  },

  async createGroup({ name, memberIds, commentsRestricted = false }) {
    const data = await apiClient.post('/conversations/group', {
      name,
      member_ids: memberIds,
      comments_restricted: commentsRestricted,
    })
    return data?.conversation
  },

  /** Join a group via shared invite code (from a QR scan or pasted link). */
  async joinByCode(code) {
    const data = await apiClient.post('/conversations/join', { code })
    return data
  },

  /** Rotate the group invite code — old code/QR becomes invalid. */
  async regenerateInviteCode(conversationId) {
    const data = await apiClient.post(
      `/conversations/${conversationId}/invite-code/regenerate`,
      {}
    )
    return data?.inviteCode
  },

  /** Update group-wide settings (currently: comments_restricted, name, approve_members). */
  async updateSettings(conversationId, settings) {
    const data = await apiClient.put(
      `/conversations/${conversationId}/settings`,
      {
        comments_restricted: settings.commentsRestricted,
        approve_members: settings.approveMembers,
        name: settings.name,
      }
    )
    return data?.conversation
  },

  async getJoinRequests(conversationId) {
    const data = await apiClient.get(`/conversations/${conversationId}/join-requests`)
    return data ?? []
  },

  async approveJoinRequest(conversationId, requestId) {
    return apiClient.post(`/conversations/${conversationId}/join-requests/${requestId}/approve`, {})
  },

  async rejectJoinRequest(conversationId, requestId) {
    return apiClient.post(`/conversations/${conversationId}/join-requests/${requestId}/reject`, {})
  },

  async addMembers(conversationId, userIds) {
    const data = await apiClient.post(`/conversations/${conversationId}/members`, {
      user_ids: userIds,
    })
    return data?.added ?? []
  },

  async removeMember(conversationId, userId) {
    return apiClient.delete(`/conversations/${conversationId}/members/${userId}`)
  },

  async leave(conversationId) {
    return apiClient.post(`/conversations/${conversationId}/leave`, {})
  },

  async updateMemberRole(conversationId, userId, role) {
    const data = await apiClient.put(
      `/conversations/${conversationId}/members/${userId}/role`,
      { role }
    )
    return data?.member
  },

  async transferOwnership(conversationId, userId) {
    const data = await apiClient.post(`/conversations/${conversationId}/transfer`, {
      user_id: userId,
    })
    return data?.conversation
  },

  async disband(conversationId) {
    return apiClient.delete(`/conversations/${conversationId}`)
  },

  /**
   * Mark the conversation as read up to the given message (or now).
   * Fire-and-forget — callers typically don't need the response.
   */
  async markRead(conversationId, lastMessageId) {
    return apiClient.post(`/conversations/${conversationId}/read`, {
      last_message_id: lastMessageId,
    })
  },

  /**
   * Upload a new avatar image for a group conversation. Owner or admin
   * only; returns the updated conversation.
   */
  async updateGroupAvatar(conversationId, file) {
    const form = new FormData()
    form.append('avatar', file)
    const data = await apiClient.put(
      `/conversations/${conversationId}/avatar`,
      form,
      { isForm: true }
    )
    return data?.conversation
  },

  /**
   * Toggle mute status for the current user in a conversation.
   * Returns { isMuted: boolean }
   */
  async toggleMute(conversationId) {
    const data = await apiClient.post(`/conversations/${conversationId}/mute`, {})
    return data
  },

  /**
   * Toggle pin status for the current user in a conversation.
   * Returns { isPinned: boolean }
   */
  async togglePin(conversationId) {
    const data = await apiClient.post(`/conversations/${conversationId}/pin`, {})
    return data
  },
}
