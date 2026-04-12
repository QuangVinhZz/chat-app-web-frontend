/**
 * Tiny formatting helpers shared across chat components.
 */

export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Aggregate a flat list of reactions `[{ userId, emoji }, ...]` into
 * one entry per emoji with a running count.
 *
 * Note: the `mine` flag is NOT set here — callers that need it should
 * post-process with the current user's id, since this util doesn't know
 * about user identity.
 */
export function groupReactions(reactions) {
  const byEmoji = new Map()
  for (const r of reactions) {
    const current = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false }
    current.count += 1
    byEmoji.set(r.emoji, current)
  }
  return Array.from(byEmoji.values())
}
