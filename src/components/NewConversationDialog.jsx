import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Users, Search, Check } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
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
import { friendService } from '../services/friendService'
import { conversationService } from '../services/conversationService'
import { ApiError } from '../services/apiClient'

const getInitials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

/**
 * Unified dialog with two tabs: "Direct" (pick one friend) and "Group"
 * (pick multiple + name). Loads the current friends list when opened.
 *
 * Props:
 *   open, onOpenChange
 *   onCreated(conversation)   — called with the new/existing conversation
 */
export default function NewConversationDialog({ open, onOpenChange, onCreated }) {
  const [mode, setMode] = useState('direct')
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [groupName, setGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')
    setSearch('')
    setSelected(new Set())
    setGroupName('')
    setLoadingFriends(true)
    friendService
      .list()
      .then((data) => {
        if (!cancelled) setFriends(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load friends.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => (f.name || '').toLowerCase().includes(q))
  }, [friends, search])

  const toggle = (userId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (mode === 'direct') {
        next.clear()
        next.add(userId)
      } else {
        if (next.has(userId)) next.delete(userId)
        else next.add(userId)
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const ids = Array.from(selected)

    if (ids.length === 0) {
      setError(mode === 'direct' ? 'Pick a friend to chat with.' : 'Select at least one member.')
      return
    }
    if (mode === 'group' && !groupName.trim()) {
      setError('Please give the group a name.')
      return
    }

    setSubmitting(true)
    try {
      let conversation
      if (mode === 'direct') {
        conversation = await conversationService.createDirect(ids[0])
      } else {
        conversation = await conversationService.createGroup({
          name: groupName.trim(),
          memberIds: ids,
        })
      }
      onCreated?.(conversation)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create conversation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new conversation</DialogTitle>
          <DialogDescription>
            Create a 1-on-1 chat with a friend or a group with multiple members.
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 border-b">
          {[
            { key: 'direct', label: 'Direct', icon: MessageCircle },
            { key: 'group', label: 'Group', icon: Users },
          ].map((t) => {
            const Icon = t.icon
            const active = mode === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setMode(t.key)
                  setSelected(new Set())
                  setError('')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {mode === 'group' && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Group name</Label>
              <Input
                id="groupName"
                placeholder="e.g. Dev team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{mode === 'direct' ? 'Pick a friend' : 'Add members'}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {friends.length === 0
                    ? "You don't have any friends yet."
                    : 'No friends match your search.'}
                </p>
              ) : (
                <ul>
                  {filteredFriends.map((f) => {
                    const picked = selected.has(f.id)
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => toggle(f.id)}
                          className={cn(
                            'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
                            picked ? 'bg-primary/10' : 'hover:bg-muted'
                          )}
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={f.avatarUrl} alt={f.name} />
                            <AvatarFallback>{getInitials(f.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {f.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {f.isOnline ? 'Online' : f.bio || 'Offline'}
                            </p>
                          </div>
                          {picked && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {mode === 'group' && selected.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selected.size} member{selected.size === 1 ? '' : 's'} selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground mr-2" />
                  Creating...
                </>
              ) : mode === 'direct' ? (
                'Start chat'
              ) : (
                'Create group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
