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
      user_id: Number(userId),
    })
    return data?.conversation
  },

  async createGroup({ name, memberIds }) {
    const data = await apiClient.post('/conversations/group', {
      name,
      member_ids: memberIds.map(Number),
    })
    return data?.conversation
  },

  async addMembers(conversationId, userIds) {
    const data = await apiClient.post(`/conversations/${conversationId}/members`, {
      user_ids: userIds.map(Number),
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
      user_id: Number(userId),
    })
    return data?.conversation
  },

  async disband(conversationId) {
    return apiClient.delete(`/conversations/${conversationId}`)
  },
}
