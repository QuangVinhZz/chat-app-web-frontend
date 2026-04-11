import { useEffect, useMemo, useState } from 'react'
import { Search, Forward, Check, Hash } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { Spinner } from './ui/Spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog'
import { useUserStore } from '../stores/userStore'
import { useConversationsStore } from '../stores/conversationsStore'
import { messageService } from '../services/messageService'
import { ApiError } from '../services/apiClient'
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
} from '../utils/conversation'

const getInitials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

/**
 * Forward a message to one or more conversations.
 *
 * Props:
 *   open, onOpenChange
 *   message                — the message to forward
 *   currentConversationId  — excluded from the target list
 *   onForwarded            — optional callback (count) after success
 */
export default function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  currentConversationId,
  onForwarded,
}) {
  const me = useUserStore((s) => s.user)
  const conversations = useConversationsStore((s) => s.conversations)
  const refreshConversations = useConversationsStore((s) => s.refresh)

  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSearch('')
    setPicked(new Set())
    setError('')
    // Refresh conversations in case the list is stale.
    refreshConversations().catch(() => {})
  }, [open, refreshConversations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations
      .filter((c) => c.id && c.id !== currentConversationId)
      .filter((c) => {
        if (!q) return true
        const name = getConversationDisplayName(c, me?.id).toLowerCase()
        return name.includes(q)
      })
  }, [conversations, currentConversationId, me?.id, search])

  const toggle = (convId) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(convId)) next.delete(convId)
      else next.add(convId)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (picked.size === 0) {
      setError('Select at least one conversation.')
      return
    }
    if (!message?.id) {
      setError('Nothing to forward.')
      return
    }
    setSubmitting(true)
    try {
      const ids = Array.from(picked)
      await messageService.forward(message.id, ids)
      onForwarded?.(ids.length)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to forward.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>
            Pick one or more conversations to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {/* Preview of the message being forwarded */}
        {message && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-xs text-muted-foreground mb-1">
              From {message.sender?.name || 'Unknown'}
            </p>
            <p className="line-clamp-2">
              {message.isRecalled
                ? '[Message recalled]'
                : message.content || '[attachment]'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-lg">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {conversations.length === 0
                  ? 'No conversations yet.'
                  : 'No conversations match your search.'}
              </p>
            ) : (
              <ul>
                {filtered.map((conv) => {
                  const selected = picked.has(conv.id)
                  const isGroup = conv.type === 'group'
                  const name = getConversationDisplayName(conv, me?.id)
                  const avatarUrl = isGroup
                    ? null
                    : getConversationAvatarUrl(conv, me?.id)
                  return (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => toggle(conv.id)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
                          selected ? 'bg-primary/10' : 'hover:bg-muted'
                        )}
                      >
                        {isGroup ? (
                          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <Hash className="w-5 h-5 text-primary" />
                          </div>
                        ) : (
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                          </Avatar>
                        )}
                        <p className="text-sm font-medium truncate flex-1">{name}</p>
                        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {picked.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {picked.size} conversation{picked.size === 1 ? '' : 's'} selected
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || picked.size === 0}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground mr-2" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Forward className="w-4 h-4 mr-2" />
                  Forward
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
