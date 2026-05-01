import { useState, useEffect, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { cn } from '../utils/cn'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Spinner } from './ui/Spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog'
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

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'customer', label: 'Khách hàng' },
  { id: 'family', label: 'Gia đình' },
  { id: 'work', label: 'Công việc' },
  { id: 'friend', label: 'Bạn bè' },
  { id: 'later', label: 'Trả lời sau' },
]

export default function AddMembersDialog({ open, onClose, conversation, onSuccess }) {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')

  // Load friends when dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    setSelected(new Set())
    setSearch('')
    setActiveTab('all')

    friendService
      .list()
      .then((data) => {
        setFriends(data)
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load friends.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open])

  // Get existing member IDs
  const existingIds = useMemo(
    () => new Set(conversation?.members?.map((m) => m.user?.id) ?? []),
    [conversation]
  )

  // Filter friends
  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase()
    return friends
      .filter((f) => !existingIds.has(f.id)) // Exclude existing members
      .filter((f) => !q || (f.name || '').toLowerCase().includes(q))
  }, [friends, existingIds, search])

  // Group by first letter
  const groupedFriends = useMemo(() => {
    const groups = {}
    const recent = []

    filteredFriends.forEach((f) => {
      // Check if already in group (for "Trò chuyện gần đây")
      if (f.recentChat) {
        recent.push(f)
        return
      }

      const firstChar = (f.name || '?')[0].toUpperCase()
      if (!groups[firstChar]) groups[firstChar] = []
      groups[firstChar].push(f)
    })

    return { recent, groups }
  }, [filteredFriends])

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (selected.size === 0) return

    setSubmitting(true)
    setError('')

    try {
      const ids = Array.from(selected)
      await conversationService.addMembers(conversation.id, ids)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add members.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Thêm thành viên</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {friends.length === 0
                  ? 'Bạn chưa có bạn bè nào.'
                  : 'Tất cả bạn bè đã ở trong nhóm.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recent chats */}
              {groupedFriends.recent.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Trò chuyện gần đây
                  </h3>
                  <div className="space-y-1">
                    {groupedFriends.recent.map((friend) => (
                      <FriendItem
                        key={friend.id}
                        friend={friend}
                        selected={selected.has(friend.id)}
                        onToggle={() => toggleSelect(friend.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Alphabetical groups */}
              {Object.keys(groupedFriends.groups)
                .sort()
                .map((letter) => (
                  <div key={letter}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      {letter}
                    </h3>
                    <div className="space-y-1">
                      {groupedFriends.groups[letter].map((friend) => (
                        <FriendItem
                          key={friend.id}
                          friend={friend}
                          selected={selected.has(friend.id)}
                          onToggle={() => toggleSelect(friend.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Đang thêm...
              </>
            ) : (
              `Xác nhận${selected.size > 0 ? ` (${selected.size})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FriendItem({ friend, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors',
        selected ? 'bg-primary/10' : 'hover:bg-muted'
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          selected
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/30'
        )}
      >
        {selected && (
          <svg
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={friend.avatarUrl} alt={friend.name} />
        <AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{friend.name || 'Unknown'}</p>
        {friend.recentChat && (
          <p className="text-xs text-muted-foreground">Đã tham gia</p>
        )}
      </div>
    </button>
  )
}
