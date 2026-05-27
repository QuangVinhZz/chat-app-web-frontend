/**
 * NicknameDialog — Dialog thay đổi biệt danh của thành viên
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../utils/cn'

export default function NicknameDialog({ open, onClose, currentNickname = '', onConfirm }) {
  const [nickname, setNickname] = useState(currentNickname)

  useEffect(() => {
    if (open) {
      setNickname(currentNickname || '')
    }
  }, [currentNickname, open])

  if (!open) return null

  const handleConfirm = (e) => {
    e.preventDefault()
    onConfirm?.(nickname.trim())
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-bold text-base text-white">Đổi biệt danh</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          {/* Input */}
          <div className="px-5 py-6">
            <input
              type="text"
              className="w-full bg-[#2a2a2a] text-white border border-white/10 rounded-xl px-4 py-3 text-base outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] transition-colors placeholder:text-muted-foreground"
              placeholder="Nhập biệt danh (hoặc để trống để gỡ biệt danh)..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-black/20">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1877f2] hover:bg-[#1565d8] text-white font-medium transition-colors text-sm"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
