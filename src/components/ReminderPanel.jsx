/**
 * ReminderPanel — panel "Danh sách nhắc hẹn"
 * Hiển thị khi chưa có nhắc hẹn: icon lịch ngủ + text + nút Tạo nhắc hẹn
 */
import { useState } from 'react'
import { ArrowLeft, Plus, AlarmClock, X } from 'lucide-react'
import { cn } from '../utils/cn'

// Icon lịch ngủ (SVG tự vẽ giống ảnh)
function SleepCalendarIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar body */}
      <rect x="12" y="24" width="72" height="60" rx="8" fill="#3a3a3a" />
      {/* Calendar top bar */}
      <rect x="12" y="24" width="72" height="18" rx="8" fill="#4a4a4a" />
      <rect x="12" y="34" width="72" height="8" fill="#4a4a4a" />
      {/* Rings */}
      <rect x="28" y="14" width="8" height="20" rx="4" fill="#5a5a5a" />
      <rect x="60" y="14" width="8" height="20" rx="4" fill="#5a5a5a" />
      {/* Inner white area */}
      <rect x="20" y="46" width="56" height="32" rx="4" fill="#2a2a2a" />
      {/* Z letters */}
      <text x="62" y="30" fontSize="14" fontWeight="bold" fill="#888" fontFamily="Arial">Z</text>
      <text x="72" y="20" fontSize="10" fontWeight="bold" fill="#888" fontFamily="Arial">z</text>
    </svg>
  )
}

export default function ReminderPanel({ open, onBack }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reminders, setReminders] = useState([])

  if (!open) return null

  const handleCreate = () => {
    if (!title.trim() || !date || !time) return
    setReminders((prev) => [
      ...prev,
      { id: Date.now(), title: title.trim(), date, time },
    ])
    setTitle('')
    setDate('')
    setTime('')
    setShowCreate(false)
  }

  return (
    <div className="absolute inset-0 z-10 bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-base">Danh sách nhắc hẹn</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          title="Tạo nhắc hẹn"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {reminders.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
            <SleepCalendarIcon />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Chưa có nhắc hẹn nào được chia sẻ trong hội thoại này
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-[#1877f2] hover:bg-[#1565d8] text-white font-semibold transition-colors"
            >
              <AlarmClock className="w-4 h-4" />
              Tạo nhắc hẹn
            </button>
          </div>
        ) : (
          /* Reminder list */
          <div className="p-4 space-y-3">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <AlarmClock className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.date} {r.time}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReminders((prev) => prev.filter((x) => x.id !== r.id))}
                  className="w-6 h-6 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-[#1877f2] hover:bg-[#1565d8] text-white font-semibold transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Thêm nhắc hẹn
            </button>
          </div>
        )}
      </div>

      {/* Create reminder modal */}
      {showCreate && (
        <div className="absolute inset-0 z-20 bg-black/50 flex items-end">
          <div className="bg-card w-full rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tạo nhắc hẹn</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Tiêu đề nhắc hẹn..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!title.trim() || !date || !time}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-white transition-colors',
                title.trim() && date && time
                  ? 'bg-[#1877f2] hover:bg-[#1565d8]'
                  : 'bg-[#1877f2]/40 cursor-not-allowed'
              )}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
