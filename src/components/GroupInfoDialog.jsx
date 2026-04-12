import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Crown,
  Shield,
  UserMinus,
  UserPlus,
  LogOut,
  Trash2,
  ArrowRightLeft,
  Hash,
  Search,
  Camera,
} from 'lucide-react'
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
import { conversationService } from '../services/conversationService'
import { friendService } from '../services/friendService'
import { ApiError } from '../services/apiClient'
import { canManageMembers, isOwner } from '../utils/conversation'

const getInitials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const roleLabel = (role) =>
  role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member'

/**
 * Full group management dialog.
 *
 * Actions exposed per-member (gated by role):
 *   - Promote to admin        (owner only)
 *   - Demote to member        (owner only)
 *   - Transfer ownership      (owner only)
 *   - Remove from group       (owner or admin; cannot remove owner)
 *
 * Self actions:
 *   - Leave group             (any non-owner member)
 *   - Disband group           (owner only)
 *   - Add members from friends (owner or admin)
 */
export default function GroupInfoDialog({
  open,
  onOpenChange,
  conversation,
  meRole,
  meId,
  onConversationUpdated,
  onConversationRemoved,
}) {
  const [view, setView] = useState('members') // 'members' | 'add'
  const [pending, setPending] = useState({})
  const [error, setError] = useState('')

  // Add-members tab state
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(new Set())

  // Avatar upload
  const avatarInputRef = useRef(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Reset transient state whenever the dialog opens/closes.
  useEffect(() => {
    if (!open) return
    setView('members')
    setError('')
    setPicked(new Set())
    setSearch('')
  }, [open])

  // Load friends lazily when the Add-members view is shown.
  useEffect(() => {
    if (!open || view !== 'add') return
    let cancelled = false
    setLoadingFriends(true)
    friendService
      .list()
      .then((data) => {
        if (cancelled) return
        setFriends(data)
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFriends(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, view])

  const withPending = async (key, fn) => {
    setPending((p) => ({ ...p, [key]: true }))
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.')
    } finally {
      setPending((p) => {
        const next = { ...p }
        delete next[key]
        return next
      })
    }
  }

  const members = conversation?.members ?? []
  const existingIds = useMemo(() => new Set(members.map((m) => m.user?.id)), [members])

  const canManage = canManageMembers(meRole)
  const owner = isOwner(meRole)

  // --- actions -----------------------------------------------------------
  const reloadConversation = async () => {
    const fresh = await conversationService.get(conversation.id)
    onConversationUpdated?.(fresh)
  }

  const handleAddMembers = () =>
    withPending('add', async () => {
      const ids = Array.from(picked)
      if (ids.length === 0) return
      await conversationService.addMembers(conversation.id, ids)
      await reloadConversation()
      setPicked(new Set())
      setView('members')
    })

  const handleRemove = (userId) =>
    withPending(`remove:${userId}`, async () => {
      await conversationService.removeMember(conversation.id, userId)
      await reloadConversation()
    })

  const handleRole = (userId, role) =>
    withPending(`role:${userId}`, async () => {
      await conversationService.updateMemberRole(conversation.id, userId, role)
      await reloadConversation()
    })

  const handleTransfer = (userId) =>
    withPending(`transfer:${userId}`, async () => {
      if (!confirm('Transfer ownership to this member? You will become an admin.')) return
      await conversationService.transferOwnership(conversation.id, userId)
      await reloadConversation()
    })

  const handleLeave = () =>
    withPending('leave', async () => {
      if (!confirm('Leave this group?')) return
      await conversationService.leave(conversation.id)
      onOpenChange(false)
      onConversationRemoved?.(conversation.id)
    })

  const handleDisband = () =>
    withPending('disband', async () => {
      if (
        !confirm(
          'Disband this group? All messages will be deleted and members will lose access.'
        )
      )
        return
      await conversationService.disband(conversation.id)
      onOpenChange(false)
      onConversationRemoved?.(conversation.id)
    })

  const handleAvatarClick = () => {
    if (!canManage) return
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setError('')
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Avatar must be a JPG or PNG image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be smaller than 2MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const updated = await conversationService.updateGroupAvatar(
        conversation.id,
        file
      )
      if (updated) onConversationUpdated?.(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload avatar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // --- filtered friend list for Add view --------------------------------
  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase()
    return friends
      .filter((f) => !existingIds.has(f.id))
      .filter((f) => !q || (f.name || '').toLowerCase().includes(q))
  }, [friends, existingIds, search])

  const togglePick = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!conversation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {conversation.avatarUrl ? (
                <Avatar className="w-14 h-14 rounded-lg">
                  <AvatarImage src={conversation.avatarUrl} alt={conversation.name} />
                  <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-semibold">
                    {getInitials(conversation.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Hash className="w-7 h-7 text-primary" />
                </div>
              )}
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 disabled:opacity-70"
                    aria-label="Change group avatar"
                    title="Change avatar"
                  >
                    {uploadingAvatar ? (
                      <Spinner size="sm" className="text-primary-foreground" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">
                {conversation.name || 'Group'}
              </DialogTitle>
              <DialogDescription>
                {members.length} member{members.length === 1 ? '' : 's'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Switch between members & add views */}
        {canManage && (
          <div className="flex gap-1 border-b">
            <button
              type="button"
              onClick={() => setView('members')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                view === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setView('add')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                view === 'add'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <UserPlus className="w-4 h-4" />
              Add members
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {view === 'members' && (
          <div className="space-y-2">
            {members.map((m) => {
              const u = m.user
              if (!u) return null
              const isSelf = u.id === meId
              const isTargetOwner = m.role === 'owner'
              return (
                <div
                  key={m.id ?? u.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={u.avatarUrl} alt={u.name} />
                    <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {u.name || 'Unknown'} {isSelf && <span className="text-muted-foreground">(you)</span>}
                      </p>
                      {m.role === 'owner' && (
                        <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      )}
                      {m.role === 'admin' && (
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{roleLabel(m.role)}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {owner && !isSelf && !isTargetOwner && m.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Promote to admin"
                        disabled={pending[`role:${u.id}`]}
                        onClick={() => handleRole(u.id, 'admin')}
                      >
                        {pending[`role:${u.id}`] ? <Spinner size="sm" /> : <Shield className="w-4 h-4" />}
                      </Button>
                    )}
                    {owner && !isSelf && !isTargetOwner && m.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Demote to member"
                        disabled={pending[`role:${u.id}`]}
                        onClick={() => handleRole(u.id, 'member')}
                      >
                        {pending[`role:${u.id}`] ? <Spinner size="sm" /> : <Shield className="w-4 h-4 opacity-50" />}
                      </Button>
                    )}
                    {owner && !isSelf && !isTargetOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Transfer ownership"
                        disabled={pending[`transfer:${u.id}`]}
                        onClick={() => handleTransfer(u.id)}
                      >
                        {pending[`transfer:${u.id}`] ? (
                          <Spinner size="sm" />
                        ) : (
                          <ArrowRightLeft className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {canManage && !isSelf && !isTargetOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove from group"
                        disabled={pending[`remove:${u.id}`]}
                        onClick={() => handleRemove(u.id)}
                      >
                        {pending[`remove:${u.id}`] ? (
                          <Spinner size="sm" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'add' && canManage && (
          <div className="space-y-3">
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
                    : 'All your friends are already in this group.'}
                </p>
              ) : (
                <ul>
                  {filteredFriends.map((f) => {
                    const selected = picked.has(f.id)
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => togglePick(f.id)}
                          className={cn(
                            'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
                            selected ? 'bg-primary/10' : 'hover:bg-muted'
                          )}
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={f.avatarUrl} alt={f.name} />
                            <AvatarFallback>{getInitials(f.name)}</AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium truncate flex-1">
                            {f.name || 'Unknown'}
                          </p>
                          {selected && (
                            <span className="text-xs text-primary font-medium">
                              Selected
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddMembers} disabled={pending.add || picked.size === 0}>
                {pending.add ? (
                  <>
                    <Spinner size="sm" className="text-primary-foreground mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add {picked.size || ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {owner ? (
            <Button
              variant="destructive"
              onClick={handleDisband}
              disabled={pending.disband}
              className="w-full sm:w-auto"
            >
              {pending.disband ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disband group
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleLeave}
              disabled={pending.leave}
              className="w-full sm:w-auto text-destructive hover:text-destructive"
            >
              {pending.leave ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave group
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
