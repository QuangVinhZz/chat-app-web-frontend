import { apiClient } from './apiClient'

/**
 * Friendship service — wraps FriendsController endpoints.
 *
 * Response shapes come straight from the backend:
 *   list():              { friends: [{ friendshipId, id, name, avatarUrl, bio, isOnline, lastSeenAt, since }] }
 *   receivedRequests():  { requests: [{ friendshipId, from: { id, name, avatarUrl }, createdAt }] }
 *   sentRequests():      { requests: [{ friendshipId, to:   { id, name, avatarUrl }, createdAt }] }
 */
export const friendService = {
  async list() {
    const data = await apiClient.get('/friends')
    return data?.friends ?? []
  },

  async getReceivedRequests() {
    const data = await apiClient.get('/friends/requests/received')
    return data?.requests ?? []
  },

  async getSentRequests() {
    const data = await apiClient.get('/friends/requests/sent')
    return data?.requests ?? []
  },

  async sendRequest(addresseeId) {
    const data = await apiClient.post('/friends/requests', {
      addressee_id: Number(addresseeId),
    })
    return data?.friendship
  },

  async accept(friendshipId) {
    const data = await apiClient.post(`/friends/requests/${friendshipId}/accept`, {})
    return data?.friendship
  },

  async reject(friendshipId) {
    return apiClient.post(`/friends/requests/${friendshipId}/reject`, {})
  },

  async cancel(friendshipId) {
    return apiClient.delete(`/friends/requests/${friendshipId}`)
  },

  async unfriend(userId) {
    return apiClient.delete(`/friends/${userId}`)
  },

  // --- blocks --------------------------------------------------------------
  async getBlocked() {
    const data = await apiClient.get('/blocks')
    return data?.blocked ?? []
  },

  async block(userId) {
    const data = await apiClient.post('/blocks', { user_id: Number(userId) })
    return data?.block
  },

  async unblock(userId) {
    return apiClient.delete(`/blocks/${userId}`)
  },
}
