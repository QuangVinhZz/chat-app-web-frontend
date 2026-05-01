/**
 * ReportDialog — Báo xấu tài khoản / tin nhắn
 * Lý do: Nội dung nhạy cảm, Làm phiền, Lừa đảo, Lý do khác
 */
import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { cn } from '../utils/cn'
import { apiClient } from '../services/apiClient'

const REASONS = [
  { label: 'Nội dung nhạy cảm', value: 'Nội dung nhạy cảm' },
  { label: 'Làm phiền', value: 'Làm phiền' },
  { label: 'Lừa đảo', value: 'Lừa đảo' },
  { label: 'Lý do khác', value: 'Lý do khác' },
]

export default function ReportDialog({ open, onClose, targetType = 'user', targetId, targetName }) {
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await apiClient.post('/reports', {
        target_type: targetType,
        target_id: targetId,
        reason: selected,
      })
      setDone(true)
    } catch (e) {
      setError(e?.message || 'Báo xấu thất bại, thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelected('')
    setDone(false)
    setError('')
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div
        className="bg-[#1e1e1e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-base text-white">Báo xấu tài khoản</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-white font-medium mb-1">Đã gửi báo cáo</p>
            <p className="text-sm text-white/60">Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 px-6 py-2 rounded-xl bg-[#1877f2] text-white font-medium"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            {/* Subtitle */}
            <p className="px-5 pb-3 text-sm text-white/70">
              Chọn lý do báo xấu tài khoản{targetName ? ` ${targetName}` : ''}
            </p>

            {/* Reasons */}
            <div className="border-t border-white/10">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    selected === r.value ? 'border-[#1877f2]' : 'border-white/30'
                  )}>
                    {selected === r.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1877f2]" />
                    )}
                  </div>
                  <span className="text-sm text-white flex-1">{r.label}</span>
                  <input
                    type="radio"
                    className="sr-only"
                    name="report-reason"
                    value={r.value}
                    checked={selected === r.value}
                    onChange={() => setSelected(r.value)}
                  />
                </label>
              ))}
            </div>

            {/* Đính kèm bằng chứng */}
            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">Đính kèm bằng chứng (Tùy chọn)</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Bạn có thể đính kèm tin nhắn và tải ảnh liên quan để làm rõ vi phạm.{' '}
                    <span className="text-[#1877f2]">Tìm hiểu thêm</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
              </div>
            </div>

            {error && (
              <p className="px-5 pb-2 text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className={cn(
                  'w-full py-3 rounded-xl font-semibold text-white transition-colors',
                  selected && !submitting
                    ? 'bg-[#1877f2] hover:bg-[#1565d8]'
                    : 'bg-[#1877f2]/40 cursor-not-allowed'
                )}
              >
                {submitting ? 'Đang gửi...' : 'Báo xấu'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
