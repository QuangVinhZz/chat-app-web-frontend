import { apiClient } from './apiClient'

/**
 * Poll service — wraps PollsController endpoints.
 *
 * Poll payload shape:
 *   {
 *     id, question, allowMultiple, isClosed, totalVotes, createdAt,
 *     createdBy: { id, name, avatarUrl },
 *     options: [{ id, text, voteCount, votedByMe }]
 *   }
 */
export const pollService = {
  async create(conversationId, { question, options, allowMultiple = false }) {
    const data = await apiClient.post(`/conversations/${conversationId}/polls`, {
      question,
      options,
      allow_multiple: allowMultiple,
    })
    return data // { poll, message }
  },

  async get(pollId) {
    const data = await apiClient.get(`/polls/${pollId}`)
    return data?.poll
  },

  async vote(pollId, optionIds) {
    const data = await apiClient.post(`/polls/${pollId}/vote`, { option_ids: optionIds })
    return data?.poll
  },

  async unvote(pollId) {
    const data = await apiClient.delete(`/polls/${pollId}/vote`)
    return data?.poll
  },

  async close(pollId) {
    const data = await apiClient.post(`/polls/${pollId}/close`, {})
    return data?.poll
  },

  async voters(pollId) {
    const data = await apiClient.get(`/polls/${pollId}/voters`)
    return data?.options ?? []
  },
}
