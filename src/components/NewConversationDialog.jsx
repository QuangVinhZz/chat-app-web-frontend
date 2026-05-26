import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Users, Search, Check, QrCode } from 'lucide-react'
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
  const [joinCode, setJoinCode] = useState('')
  const [commentsRestricted, setCommentsRestricted] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')
    setSearch('')
    setSelected(new Set())
    setGroupName('')
    setJoinCode('')
    setCommentsRestricted(false)
    setLoadingFriends(true)
    friendService
      .list()
      .then((data) => {
        if (!cancelled) setFriends(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Không thể tải danh sách bạn bè.')
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

    if (mode === 'join') {
      const code = joinCode.trim().toUpperCase()
      if (code.length < 4) {
        setError('Nhập mã tham gia hợp lệ.')
        return
      }
      setSubmitting(true)
      try {
        const res = await conversationService.joinByCode(code)
        if (res && res.status === 'pending') {
          alert(res.message || 'Yêu cầu tham gia của bạn đã được gửi và đang chờ phê duyệt.')
          onOpenChange(false)
        } else {
          onCreated?.(res?.conversation)
          onOpenChange(false)
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Mã không hợp lệ.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    const ids = Array.from(selected)

    if (ids.length === 0) {
      setError(mode === 'direct' ? 'Vui lòng chọn một người bạn để trò chuyện.' : 'Vui lòng chọn ít nhất một thành viên.')
      return
    }
    if (mode === 'group' && !groupName.trim()) {
      setError('Vui lòng nhập tên nhóm.')
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
          commentsRestricted,
        })
      }
      onCreated?.(conversation)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo cuộc hội thoại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bắt đầu cuộc trò chuyện mới</DialogTitle>
          <DialogDescription>
            Tạo cuộc trò chuyện 1-1 với một người bạn hoặc tạo nhóm với nhiều thành viên.
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 border-b">
          {[
            { key: 'direct', label: 'Trực tiếp', icon: MessageCircle },
            { key: 'group', label: 'Nhóm', icon: Users },
            { key: 'join', label: 'Mã tham gia', icon: QrCode },
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
            <>
              <div className="space-y-2">
                <Label htmlFor="groupName">Tên nhóm</Label>
                <Input
                  id="groupName"
                  placeholder="Ví dụ: Nhóm phát triển"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={commentsRestricted}
                  onChange={(e) => setCommentsRestricted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Chỉ trưởng/phó nhóm được bình luận
                  <span className="block text-xs text-muted-foreground">
                    Thành viên thường chỉ đọc, không gửi tin nhắn.
                  </span>
                </span>
              </label>
            </>
          )}

          {mode === 'join' && (
            <div className="space-y-2">
              <Label htmlFor="joinCode">Mã tham gia (từ QR / link)</Label>
              <Input
                id="joinCode"
                placeholder="VD: AB12CD34"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={32}
                className="font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Dán mã trưởng nhóm chia sẻ để tham gia nhóm — kể cả khi bạn không phải bạn bè.
              </p>
            </div>
          )}

          {mode !== 'join' && (
          <div className="space-y-2">
            <Label>{mode === 'direct' ? 'Chọn bạn bè' : 'Thêm thành viên'}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bạn bè..."
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
                    ? "Bạn chưa có người bạn nào."
                    : 'Không tìm thấy người bạn nào khớp với tìm kiếm.'}
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
                              {f.name || 'Không rõ'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {f.isOnline ? 'Đang hoạt động' : f.bio || 'Không hoạt động'}
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
                Đã chọn {selected.size} thành viên
              </p>
            )}
          </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground mr-2" />
                  {mode === 'join' ? 'Đang tham gia...' : 'Đang tạo...'}
                </>
              ) : mode === 'direct' ? (
                'Bắt đầu trò chuyện'
              ) : mode === 'join' ? (
                'Tham gia nhóm'
              ) : (
                'Tạo nhóm'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
