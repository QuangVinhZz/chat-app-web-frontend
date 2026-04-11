import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Send,
  Clock,
  X,
  Trash2,
  Inbox,
  Ban,
  ShieldOff,
  MessageCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import { Card, CardContent } from '../components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/Dialog'
import { Spinner } from '../components/ui/Spinner'
import { friendService } from '../services/friendService'
import { userService } from '../services/userService'
import { socketService } from '../services/socketService'
import { useUserStore } from '../stores/userStore'
import { useFriendsStore } from '../stores/friendsStore'
import { ApiError } from '../services/apiClient'

const TABS = [
  { key: 'friends', label: 'My Friends', icon: Users },
  { key: 'received', label: 'Received', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Clock },
  { key: 'find', label: 'Find People', icon: UserPlus },
  { key: 'blocked', label: 'Blocked', icon: Ban },
]

const getInitials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export default function FriendsPage() {
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const setCounts = useFriendsStore((s) => s.setCounts)

  const [activeTab, setActiveTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [blocked, setBlocked] = useState([])
  const [tabLoading, setTabLoading] = useState(false)
  const [pending, setPending] = useState({}) // { [key]: true } — per-row in-flight
  const [error, setError] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [viewingUser, setViewingUser] = useState(null)

  // Per-tab loaders — called whenever the user switches tabs.
  const loadFriends = useCallback(async () => {
    const data = await friendService.list()
    setFriends(data)
    setCounts({ friendsCount: data.length })
  }, [setCounts])

  const loadReceived = useCallback(async () => {
    const data = await friendService.getReceivedRequests()
    setReceived(data)
    setCounts({ receivedCount: data.length })
  }, [setCounts])

  const loadSent = useCallback(async () => {
    const data = await friendService.getSentRequests()
    setSent(data)
  }, [])

  const loadBlocked = useCallback(async () => {
    const data = await friendService.getBlocked()
    setBlocked(data)
  }, [])

  // On first mount, warm up all four lists in parallel so the tab bar
  // badges (friends/received/sent/blocked) show correct counts without
  // waiting for the user to visit each tab.
  useEffect(() => {
    loadFriends().catch(() => {})
    loadReceived().catch(() => {})
    loadSent().catch(() => {})
    loadBlocked().catch(() => {})
    // Run once on mount — loaders are stable useCallbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload the active tab's data whenever the tab changes.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError('')
      if (activeTab === 'find') {
        // No fetch on mount for this tab — the user drives the search.
        // (handleSendRequest below still re-runs the server call itself.)
        return
      }
      setTabLoading(true)
      try {
        if (activeTab === 'friends') await loadFriends()
        else if (activeTab === 'received') await loadReceived()
        else if (activeTab === 'sent') await loadSent()
        else if (activeTab === 'blocked') await loadBlocked()
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Failed to load data.')
      } finally {
        if (!cancelled) setTabLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [activeTab, loadFriends, loadReceived, loadSent, loadBlocked])

  // Realtime — on any friendship event, refresh ALL four lists in
  // parallel. We can't just reload the active tab because the tab bar
  // counts (friends/received/sent/blocked) read from local state and
  // would otherwise drift out of sync with the server.
  // Quiet refresh (no spinner) — the tab body only re-renders values.
  useEffect(() => {
    const quietReloadAll = () => {
      loadFriends().catch(() => {})
      loadReceived().catch(() => {})
      loadSent().catch(() => {})
      loadBlocked().catch(() => {})
    }

    const events = [
      'friend:request:received',
      'friend:request:sent',
      'friend:request:accepted',
      'friend:request:rejected',
      'friend:request:cancelled',
      'friend:added',
      'friend:unfriended',
      'friend:blocked',
      'friend:blocked-by',
      'friend:unblocked',
    ]
    const offs = events.map((e) => socketService.on(e, quietReloadAll))
    return () => {
      for (const off of offs) off?.()
    }
  }, [loadFriends, loadReceived, loadSent, loadBlocked])

  // Presence — broadcast event, potentially very frequent. Patch the
  // matching friend inline instead of re-fetching the whole list so the
  // dot flips without any network churn. Also reflect the change in the
  // open detail dialog if the same user is being viewed.
  useEffect(() => {
    const handlePresence = ({ userId, isOnline, lastSeenAt }) => {
      setFriends((prev) => {
        const idx = prev.findIndex((f) => f.id === userId)
        if (idx === -1) return prev
        const next = prev.slice()
        next[idx] = { ...next[idx], isOnline, lastSeenAt }
        return next
      })
      setViewingUser((prev) =>
        prev && prev.id === userId ? { ...prev, isOnline, lastSeenAt } : prev
      )
      setSearchResults((prev) => {
        const idx = prev.findIndex((u) => u.id === userId)
        if (idx === -1) return prev
        const next = prev.slice()
        next[idx] = { ...next[idx], isOnline, lastSeenAt }
        return next
      })
    }
    return socketService.on('presence:changed', handlePresence)
  }, [])

  // --- actions -----------------------------------------------------------
  const withPending = async (key, fn) => {
    setPending((p) => ({ ...p, [key]: true }))
    try {
      await fn()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Action failed.'
      setError(msg)
    } finally {
      setPending((p) => {
        const next = { ...p }
        delete next[key]
        return next
      })
    }
  }

  const handleSendRequest = (userId) =>
    withPending(`send:${userId}`, async () => {
      await friendService.sendRequest(userId)
      // mark the user as "requested" in the local search results
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, __requested: true } : u))
      )
      // refresh sent list in the background so the Sent tab is accurate
      friendService.getSentRequests().then(setSent).catch(() => {})
    })

  const handleAccept = (friendshipId) =>
    withPending(`accept:${friendshipId}`, async () => {
      await friendService.accept(friendshipId)
      setReceived((prev) => {
        const next = prev.filter((r) => r.friendshipId !== friendshipId)
        setCounts({ receivedCount: next.length })
        return next
      })
      // refresh friends list
      friendService
        .list()
        .then((fresh) => {
          setFriends(fresh)
          setCounts({ friendsCount: fresh.length })
        })
        .catch(() => {})
    })

  const handleReject = (friendshipId) =>
    withPending(`reject:${friendshipId}`, async () => {
      await friendService.reject(friendshipId)
      setReceived((prev) => {
        const next = prev.filter((r) => r.friendshipId !== friendshipId)
        setCounts({ receivedCount: next.length })
        return next
      })
    })

  const handleCancel = (friendshipId) =>
    withPending(`cancel:${friendshipId}`, async () => {
      await friendService.cancel(friendshipId)
      setSent((prev) => prev.filter((r) => r.friendshipId !== friendshipId))
    })

  const handleUnfriend = (userId) => {
    if (!confirm('Remove this friend?')) return
    return withPending(`unfriend:${userId}`, async () => {
      await friendService.unfriend(userId)
      setFriends((prev) => {
        const next = prev.filter((f) => f.id !== userId)
        setCounts({ friendsCount: next.length })
        return next
      })
    })
  }

  const handleBlock = (userId) => {
    if (
      !confirm(
        'Block this user? You will no longer see each other in search, friends, or requests.'
      )
    )
      return
    return withPending(`block:${userId}`, async () => {
      await friendService.block(userId)
      // Block also deletes any friendship/request on the backend, so mirror
      // that locally — drop the user from every list regardless of source.
      setFriends((prev) => {
        const next = prev.filter((f) => f.id !== userId)
        setCounts({ friendsCount: next.length })
        return next
      })
      setReceived((prev) => {
        const next = prev.filter((r) => r.from?.id !== userId)
        setCounts({ receivedCount: next.length })
        return next
      })
      setSent((prev) => prev.filter((r) => r.to?.id !== userId))
      setSearchResults((prev) => prev.filter((u) => u.id !== userId))
    })
  }

  const handleUnblock = (userId) =>
    withPending(`unblock:${userId}`, async () => {
      await friendService.unblock(userId)
      setBlocked((prev) => prev.filter((b) => b.id !== userId))
    })

  // Open a draft chat with this friend. We deliberately do NOT create a
  // conversation on the server yet — that happens when the user actually
  // sends the first message (see ChatPage draft mode).
  const handleOpenChat = (userId) => {
    navigate(`/chat/new/${userId}`)
  }

  // Dialog-scoped wrappers: reuse the same backend calls, but also keep the
  // open detail dialog in sync with the latest friendship / block state.
  const handleSendRequestFromDialog = async (userId) => {
    await handleSendRequest(userId)
    setViewingUser((prev) => (prev && prev.id === userId ? { ...prev, __requested: true } : prev))
  }

  const handleBlockFromDialog = async (userId) => {
    await handleBlock(userId)
    // Backend removed this user from every list; close the modal.
    setViewingUser((prev) => (prev && prev.id === userId ? null : prev))
  }

  // --- search -----------------------------------------------------------
  const runSearch = async (e) => {
    e?.preventDefault?.()
    const q = searchQuery.trim()
    if (q.length < 2) {
      setError('Enter at least 2 characters to search.')
      return
    }
    setError('')
    setSearching(true)
    setHasSearched(true)
    try {
      const { users } = await userService.searchUsers({ q })
      // Tag users that already have a friendship / pending request so the
      // action button in the search results reflects the current state.
      const friendIds = new Set(friends.map((f) => f.id))
      const sentIds = new Set(sent.map((r) => r.to?.id))
      const receivedIds = new Set(received.map((r) => r.from?.id))
      setSearchResults(
        users.map((u) => ({
          ...u,
          __friend: friendIds.has(u.id),
          __requested: sentIds.has(u.id),
          __incoming: receivedIds.has(u.id),
        }))
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // --- counts for tab bar ------------------------------------------------
  const counts = useMemo(
    () => ({
      friends: friends.length,
      received: received.length,
      sent: sent.length,
      find: null,
      blocked: blocked.length,
    }),
    [friends.length, received.length, sent.length, blocked.length]
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 border-b flex items-center justify-between bg-card">
        <div>
          <h1 className="text-xl font-semibold">Friends</h1>
          <p className="text-sm text-muted-foreground">
            {friends.length} friends · {received.length} pending
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-4 border-b">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const count = counts[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count !== null && count > 0 && (
                  <span
                    className={cn(
                      'min-w-5 h-5 px-1.5 rounded-full text-xs flex items-center justify-center',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {tabLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <FriendsList
                friends={friends}
                pending={pending}
                onUnfriend={handleUnfriend}
                onBlock={handleBlock}
                onOpenChat={handleOpenChat}
              />
            )}

            {activeTab === 'received' && (
              <ReceivedList
                requests={received}
                pending={pending}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}

            {activeTab === 'sent' && (
              <SentList
                requests={sent}
                pending={pending}
                onCancel={handleCancel}
              />
            )}

            {activeTab === 'find' && (
              <FindPeople
                meId={me?.id}
                query={searchQuery}
                setQuery={setSearchQuery}
                searching={searching}
                results={searchResults}
                hasSearched={hasSearched}
                pending={pending}
                onSubmit={runSearch}
                onSendRequest={handleSendRequest}
                onBlock={handleBlock}
                onViewUser={setViewingUser}
              />
            )}

            {activeTab === 'blocked' && (
              <BlockedList
                blocked={blocked}
                pending={pending}
                onUnblock={handleUnblock}
              />
            )}
          </>
        )}
      </div>

      <UserDetailDialog
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        pending={pending}
        onSendRequest={handleSendRequestFromDialog}
        onBlock={handleBlockFromDialog}
      />
    </div>
  )
}

/* ---------------- sub-components ---------------- */

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function UserRow({ avatarUrl, name, meta, isOnline, onClick, children }) {
  const body = (
    <>
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        {isOnline !== undefined && (
          <span
            className={cn(
              'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card',
              isOnline ? 'bg-online' : 'bg-muted-foreground'
            )}
            aria-label={isOnline ? 'Online' : 'Offline'}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{name || 'Unknown'}</p>
        {meta && <p className="text-xs text-muted-foreground truncate">{meta}</p>}
      </div>
    </>
  )
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-4 flex-1 min-w-0 -mx-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          >
            {body}
          </button>
        ) : (
          <div className="flex items-center gap-4 flex-1 min-w-0">{body}</div>
        )}
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      </CardContent>
    </Card>
  )
}

function FriendsList({ friends, pending, onUnfriend, onBlock, onOpenChat }) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No friends yet"
        description="Search for people in the Find People tab to send a request."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {friends.map((f) => (
        <UserRow
          key={f.friendshipId}
          avatarUrl={f.avatarUrl}
          name={f.name}
          isOnline={Boolean(f.isOnline)}
          meta={
            f.isOnline
              ? 'Online'
              : f.lastSeenAt
                ? `Last seen ${formatDistanceToNow(new Date(f.lastSeenAt), { addSuffix: true })}`
                : 'Offline'
          }
        >
          <Button
            size="sm"
            disabled={pending[`chat:${f.id}`]}
            onClick={() => onOpenChat(f.id)}
            title="Chat"
          >
            {pending[`chat:${f.id}`] ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            disabled={pending[`block:${f.id}`]}
            onClick={() => onBlock(f.id)}
            aria-label="Block"
            title="Block"
          >
            {pending[`block:${f.id}`] ? (
              <Spinner size="sm" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={pending[`unfriend:${f.id}`]}
            onClick={() => onUnfriend(f.id)}
            aria-label="Unfriend"
            title="Unfriend"
          >
            {pending[`unfriend:${f.id}`] ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </UserRow>
      ))}
    </div>
  )
}

function BlockedList({ blocked, pending, onUnblock }) {
  if (blocked.length === 0) {
    return (
      <EmptyState
        icon={Ban}
        title="No blocked users"
        description="Users you block will appear here. They won't see you in search or be able to send requests."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {blocked.map((b) => (
        <UserRow
          key={b.blockId}
          avatarUrl={b.avatarUrl}
          name={b.name}
          meta={`Blocked ${formatDistanceToNow(new Date(b.blockedAt), { addSuffix: true })}`}
        >
          <Button
            size="sm"
            variant="outline"
            disabled={pending[`unblock:${b.id}`]}
            onClick={() => onUnblock(b.id)}
          >
            {pending[`unblock:${b.id}`] ? (
              <Spinner size="sm" />
            ) : (
              <>
                <ShieldOff className="w-4 h-4 mr-1" />
                Unblock
              </>
            )}
          </Button>
        </UserRow>
      ))}
    </div>
  )
}

function ReceivedList({ requests, pending, onAccept, onReject }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No incoming requests"
        description="When someone sends you a friend request, it'll show up here."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {requests.map((r) => (
        <UserRow
          key={r.friendshipId}
          avatarUrl={r.from?.avatarUrl}
          name={r.from?.name}
          meta={`Sent ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}`}
        >
          <Button
            size="sm"
            disabled={pending[`accept:${r.friendshipId}`]}
            onClick={() => onAccept(r.friendshipId)}
          >
            {pending[`accept:${r.friendshipId}`] ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending[`reject:${r.friendshipId}`]}
            onClick={() => onReject(r.friendshipId)}
          >
            {pending[`reject:${r.friendshipId}`] ? (
              <Spinner size="sm" />
            ) : (
              <>
                <UserX className="w-4 h-4 mr-1" />
                Reject
              </>
            )}
          </Button>
        </UserRow>
      ))}
    </div>
  )
}

function SentList({ requests, pending, onCancel }) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No pending requests"
        description="Requests you send that haven't been answered yet will show up here."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {requests.map((r) => (
        <UserRow
          key={r.friendshipId}
          avatarUrl={r.to?.avatarUrl}
          name={r.to?.name}
          meta={`Sent ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}`}
        >
          <Button
            size="sm"
            variant="outline"
            disabled={pending[`cancel:${r.friendshipId}`]}
            onClick={() => onCancel(r.friendshipId)}
          >
            {pending[`cancel:${r.friendshipId}`] ? (
              <Spinner size="sm" />
            ) : (
              <>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </>
            )}
          </Button>
        </UserRow>
      ))}
    </div>
  )
}

function FindPeople({
  meId,
  query,
  setQuery,
  searching,
  results,
  hasSearched,
  pending,
  onSubmit,
  onSendRequest,
  onBlock,
  onViewUser,
}) {
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searching || query.trim().length < 2}>
          {searching ? (
            <>
              <Spinner size="sm" className="text-primary-foreground mr-1" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-1" />
              Search
            </>
          )}
        </Button>
      </form>

      {!hasSearched && (
        <EmptyState
          icon={UserPlus}
          title="Find people to connect with"
          description="Type a name, email, or phone number and press Search."
        />
      )}

      {hasSearched && !searching && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different name, email, or phone number."
        />
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results
            .filter((u) => u.id !== meId)
            .map((u) => {
              const key = `send:${u.id}`
              const isPending = Boolean(pending[key])
              const label = u.__friend
                ? 'Friends'
                : u.__requested
                  ? 'Requested'
                  : u.__incoming
                    ? 'Pending you'
                    : null
              return (
                <UserRow
                  key={u.id}
                  avatarUrl={u.avatarUrl || u.avatar_url}
                  name={u.name}
                  meta={u.bio || ''}
                  onClick={() => onViewUser(u)}
                >
                  {label ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                      {label}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => onSendRequest(u.id)}
                    >
                      {isPending ? (
                        <Spinner size="sm" className="text-primary-foreground" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={pending[`block:${u.id}`]}
                    onClick={() => onBlock(u.id)}
                    aria-label="Block"
                    title="Block"
                  >
                    {pending[`block:${u.id}`] ? (
                      <Spinner size="sm" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                  </Button>
                </UserRow>
              )
            })}
        </div>
      )}
    </div>
  )
}

function UserDetailDialog({ user, onClose, pending, onSendRequest, onBlock }) {
  const open = Boolean(user)

  const sendKey = user ? `send:${user.id}` : null
  const blockKey = user ? `block:${user.id}` : null
  const isSending = sendKey ? Boolean(pending[sendKey]) : false
  const isBlocking = blockKey ? Boolean(pending[blockKey]) : false

  const label = !user
    ? null
    : user.__friend
      ? 'Already friends'
      : user.__requested
        ? 'Request sent'
        : user.__incoming
          ? 'Pending your response'
          : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle>User profile</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={user.avatarUrl || user.avatar_url}
                    alt={user.name}
                  />
                  <AvatarFallback className="text-2xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background',
                    user.isOnline ? 'bg-online' : 'bg-muted-foreground'
                  )}
                />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold">{user.name || 'Unknown'}</h3>
                <p className="text-xs text-muted-foreground">
                  {user.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>

              {user.bio ? (
                <p className="text-sm text-center text-muted-foreground max-w-sm whitespace-pre-wrap">
                  {user.bio}
                </p>
              ) : (
                <p className="text-sm text-center text-muted-foreground/60 italic">
                  No bio yet
                </p>
              )}

              {label && (
                <span className="mt-2 text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {label}
                </span>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {!label && (
                <Button
                  onClick={() => onSendRequest(user.id)}
                  disabled={isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <Spinner size="sm" className="text-primary-foreground" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send request
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onBlock(user.id)}
                disabled={isBlocking}
                className={cn(!label ? 'flex-1' : 'w-full')}
              >
                {isBlocking ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Block
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
