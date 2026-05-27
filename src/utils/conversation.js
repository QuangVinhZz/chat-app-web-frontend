/**
 * Helpers for rendering a conversation in the UI.
 *
 * Direct conversations don't have a name/avatar of their own — they
 * inherit from the OTHER participant.
 */

export function getOtherMember(conversation, meId) {
  if (!conversation?.members) return null
  return conversation.members.find((m) => m.user?.id !== meId) ?? null
}

export function getConversationDisplayName(conversation, meId) {
  if (!conversation) return ''
  if (conversation.type === 'group') return conversation.name || 'Group'
  const other = getOtherMember(conversation, meId)
  if (!other) return 'Tài liệu của tôi'
  return other?.nickname || other?.user?.name || 'Unknown'
}

export function getConversationAvatarUrl(conversation, meId) {
  if (!conversation) return null
  if (conversation.type === 'group') return conversation.avatarUrl || null
  const other = getOtherMember(conversation, meId)
  if (!other) return null
  return other?.user?.avatarUrl || null
}

export function getConversationIsOnline(conversation, meId) {
  if (conversation?.type !== 'direct') return undefined
  const other = getOtherMember(conversation, meId)
  if (other?.user?.email === 'ai-bot@system.local') return true
  return Boolean(other?.user?.isOnline)
}

/**
 * Find the role of a given user in a conversation.
 * Returns 'owner' | 'admin' | 'member' | null.
 */
export function getMemberRole(conversation, userId) {
  if (!conversation?.members || !userId) return null
  const m = conversation.members.find((x) => x.user?.id === userId)
  return m?.role ?? null
}

export const canManageMembers = (role) => role === 'owner' || role === 'admin'
export const isOwner = (role) => role === 'owner'
