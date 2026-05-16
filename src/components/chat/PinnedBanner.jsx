/**
 * PinnedBanner — hiển thị banner tin nhắn đã ghim ở đầu chat.
 * - 1 tin nhắn: click để scroll đến
 * - Nhiều tin nhắn: nút "+N ghim ∨" mở dropdown danh sách
 */
import { useState } from 'react'
import { Pin, ChevronDown, ChevronUp, X, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../../utils/cn'
import { messageService } from '../../services/messageService'

export default function PinnedBanner({ pinned, onScrollTo, onUnpin }) {
  const [open, setOpen] = useState(false)

  if (!pinned || pinned.length === 0) return null

  const latest = pinned[pinned.length - 1]

  const getPreview = (msg) => {
    if (msg.isRecalled) return '[Tin nhắn đã thu hồi]'
    if (msg.content) return msg.content
    if (msg.attachments?.length > 0) return '[Tệp đính kèm]'
    return ''
  }

  const handleUnpin = async (e, msg) => {
    e.stopPropagation()
    try {
      await messageService.unpin(msg.id)
      onUnpin?.(msg)
    } catch (err) {
      console.error('Unpin failed', err)
    }
  }

  return (
    <div className="shrink-0 border-b border-border bg-card z-10">
      {/* Main bar */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />

        {/* Preview — click để scroll đến tin nhắn mới nhất */}
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => { onScrollTo?.(latest); setOpen(false) }}
        >
          <p className="text-[11px] text-amber-500 font-semibold leading-none mb-0.5">
            Tin nhắn đã ghim
          </p>
          <p className="text-xs text-foreground truncate">
            {getPreview(latest)}
          </p>
        </button>

        {/* Nút "+N ghim" nếu có nhiều */}
        {pinned.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors shrink-0"
          >
            +{pinned.length - 1} ghim
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Dropdown danh sách tất cả tin nhắn ghim */}
      {open && (
        <div className="border-t border-border bg-card">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Danh sách ghim ({pinned.length})
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Thu gọn ∧
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {[...pinned].reverse().map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                </div>

                {/* Content */}
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => { onScrollTo?.(msg); setOpen(false) }}
                >
                  <p className="text-xs font-medium text-foreground leading-none mb-0.5">
                    {msg.sender?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getPreview(msg)}
                  </p>
                  {msg.pinnedAt && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(msg.pinnedAt), 'HH:mm dd/MM/yyyy')}
                    </p>
                  )}
                </button>

                {/* Unpin button */}
                <button
                  type="button"
                  onClick={(e) => handleUnpin(e, msg)}
                  className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Bỏ ghim"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
