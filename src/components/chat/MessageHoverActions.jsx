import { useState } from 'react'
import {
  Smile,
  Reply,
  MoreVertical,
  Forward,
  RotateCcw,
  Trash2,
  Copy,
  Pin,
  PinOff,
  Star,
  StarOff,
  CheckSquare,
  Info,
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover'
import { cn } from '../../utils/cn'
import { messageService } from '../../services/messageService'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export default function MessageHoverActions({
  message,
  isOwn,
  onReply,
  onRecall,
  onDeleteForMe,
  onReact,
  onForward,
  onViewDetail,
  onSelectMultiple,
  onMessageUpdated,
}) {
  if (message.isRecalled) return null

  const [mainOpen, setMainOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [starring, setStarring] = useState(false)

  const close = () => setMainOpen(false)

  const handleCopy = () => {
    const text = message.content || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
    close()
  }

  const handlePin = async () => {
    close()
    if (pinning) return
    setPinning(true)
    try {
      if (message.isPinned) {
        await messageService.unpin(message.id)
        onMessageUpdated?.({ ...message, isPinned: false, pinnedBy: null, pinnedAt: null })
      } else {
        await messageService.pin(message.id)
        onMessageUpdated?.({ ...message, isPinned: true })
      }
    } catch (e) {
      console.error('Pin failed', e)
    } finally {
      setPinning(false)
    }
  }

  const handleStar = async () => {
    close()
    if (starring) return
    setStarring(true)
    try {
      if (message.isStarred) {
        await messageService.unstar(message.id)
        onMessageUpdated?.({ ...message, isStarred: false })
      } else {
        await messageService.star(message.id)
        onMessageUpdated?.({ ...message, isStarred: true })
      }
    } catch (e) {
      console.error('Star failed', e)
    } finally {
      setStarring(false)
    }
  }

  const handleSelectMultiple = () => {
    close()
    onSelectMultiple?.(message)
  }

  const handleViewDetail = () => {
    close()
    onViewDetail?.(message)
  }

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
      {/* Quick react */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="Thả cảm xúc"
          >
            <Smile className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align={isOwn ? 'end' : 'start'}>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className="w-8 h-8 rounded-full hover:bg-muted text-lg flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reply */}
      <button
        type="button"
        onClick={() => onReply(message)}
        className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        title="Trả lời"
      >
        <Reply className="w-4 h-4" />
      </button>

      {/* More menu */}
      <Popover open={mainOpen} onOpenChange={setMainOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="Tuỳ chọn"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align={isOwn ? 'end' : 'start'}>
          <div className="space-y-0.5">

            {/* Sao chép */}
            {message.content && (
              <MenuItem
                icon={Copy}
                label={copied ? 'Đã sao chép!' : 'Sao chép tin nhắn'}
                onClick={handleCopy}
              />
            )}

            {/* Chuyển tiếp */}
            <MenuItem
              icon={Forward}
              label="Chuyển tiếp"
              onClick={() => { onForward?.(message); close() }}
            />

            {/* Ghim / Bỏ ghim */}
            <MenuItem
              icon={message.isPinned ? PinOff : Pin}
              label={message.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
              onClick={handlePin}
              loading={pinning}
            />

            {/* Đánh dấu / Bỏ đánh dấu */}
            <MenuItem
              icon={message.isStarred ? StarOff : Star}
              label={message.isStarred ? 'Bỏ đánh dấu' : 'Đánh dấu tin nhắn'}
              onClick={handleStar}
              loading={starring}
              active={message.isStarred}
            />

            {/* Chọn nhiều */}
            <MenuItem
              icon={CheckSquare}
              label="Chọn nhiều tin nhắn"
              onClick={handleSelectMultiple}
            />

            {/* Xem chi tiết */}
            <MenuItem
              icon={Info}
              label="Xem chi tiết"
              onClick={handleViewDetail}
            />

            <div className="h-px bg-border my-1" />

            {/* Thu hồi — chỉ tin nhắn của mình */}
            {isOwn && (
              <MenuItem
                icon={RotateCcw}
                label="Thu hồi tin nhắn"
                onClick={() => { onRecall(message); close() }}
              />
            )}

            {/* Xóa ở phía tôi */}
            <MenuItem
              icon={Trash2}
              label="Xóa chỉ ở phía tôi"
              onClick={() => { onDeleteForMe(message); close() }}
              danger
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger = false, loading = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50',
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground',
        active && 'text-primary'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {loading && <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
    </button>
  )
}
