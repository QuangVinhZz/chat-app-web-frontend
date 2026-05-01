/**
 * MessageDetailDialog — hiển thị chi tiết một tin nhắn:
 * - Nội dung đầy đủ
 * - Thời gian gửi chính xác
 * - Danh sách người đã xem (read receipts)
 * - Reactions chi tiết (ai react gì)
 */
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { X, Eye, Smile } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { messageService } from '../../services/messageService'
import { getInitials } from '../../utils/format'
import { cn } from '../../utils/cn'

export default function MessageDetailDialog({ message, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!message?.id) return
    setLoading(true)
    setError('')
    messageService.detail(message.id)
      .then(setDetail)
      .catch((e) => setError(e?.message || 'Không thể tải chi tiết.'))
      .finally(() => setLoading(false))
  }, [message?.id])

  if (!message) return null

  // Group reactions by emoji
  const reactionGroups = {}
  for (const r of (message.reactions ?? [])) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = []
    reactionGroups[r.emoji].push(r)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-base">Chi tiết tin nhắn</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Nội dung tin nhắn */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Nội dung</p>
            <div className="bg-muted rounded-xl px-4 py-3 text-sm">
              {message.isRecalled
                ? <span className="italic text-muted-foreground">[Tin nhắn đã thu hồi]</span>
                : message.content || <span className="italic text-muted-foreground">[Tệp đính kèm]</span>
              }
            </div>
          </div>

          {/* Thời gian */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Thời gian gửi</p>
            <p className="text-sm">
              {message.createdAt
                ? format(new Date(message.createdAt), "EEEE, dd/MM/yyyy 'lúc' HH:mm:ss", { locale: vi })
                : '—'}
            </p>
          </div>

          {/* Người gửi */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Người gửi</p>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.sender?.avatarUrl} alt={message.sender?.name} />
                <AvatarFallback>{getInitials(message.sender?.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{message.sender?.name || 'Unknown'}</span>
            </div>
          </div>

          {/* Reactions */}
          {Object.keys(reactionGroups).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
                <Smile className="w-3 h-3" /> Cảm xúc
              </p>
              <div className="space-y-1.5">
                {Object.entries(reactionGroups).map(([emoji, reactions]) => (
                  <div key={emoji} className="flex items-center gap-2 text-sm">
                    <span className="text-lg w-7 text-center">{emoji}</span>
                    <span className="text-muted-foreground">{reactions.length} người</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Đã xem */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
              <Eye className="w-3 h-3" /> Đã xem
            </p>
            {loading && <Spinner size="sm" />}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!loading && !error && (
              detail?.readers?.length > 0 ? (
                <div className="space-y-2">
                  {detail.readers.map((reader) => (
                    <div key={reader.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={reader.avatarUrl} alt={reader.name} />
                          <AvatarFallback className="text-[10px]">{getInitials(reader.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{reader.name}</span>
                      </div>
                      {reader.readAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(reader.readAt), 'HH:mm dd/MM')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có ai xem</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
