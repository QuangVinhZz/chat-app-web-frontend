/**
 * AutoDeleteDialog — Cài đặt tin nhắn tự xóa
 * Options: 1 ngày, 7 ngày, 14 ngày, Không bao giờ
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../utils/cn'

const OPTIONS = [
  { label: '1 ngày', value: '1d' },
  { label: '7 ngày', value: '7d' },
  { label: '14 ngày', value: '14d' },
  { label: 'Không bao giờ', value: 'never' },
]

export default function AutoDeleteDialog({ open, onClose, currentValue = 'never', onConfirm }) {
  const [selected, setSelected] = useState(currentValue)

  if (!open) return null

  const handleConfirm = () => {
    onConfirm?.(selected)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="bg-[#1e1e1e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-bold text-base text-white">Cài đặt tin nhắn tự xóa</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="py-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-4 px-6 py-3.5 cursor-pointer hover:bg-white/5 transition-colors"
            >
              {/* Radio */}
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                selected === opt.value
                  ? 'border-[#1877f2] bg-[#1877f2]'
                  : 'border-white/40'
              )}>
                {selected === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <span className="text-base text-white">{opt.label}</span>
              <input
                type="radio"
                className="sr-only"
                name="auto-delete"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
              />
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565d8] text-white font-medium transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}
