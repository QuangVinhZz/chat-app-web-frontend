import { useState, useEffect, useRef } from 'react'
import { X, Upload, RotateCcw } from 'lucide-react'

const BACKGROUND_PRESETS = [
  { id: 'default', name: 'Mặc định', value: '', preview: 'bg-muted/30 border border-white/10' },
  { id: 'sunset', name: 'Hoàng hôn', value: 'linear-gradient(135deg, #f59e0b, #ef4444)', preview: 'bg-gradient-to-br from-amber-500 to-red-500' },
  { id: 'ocean', name: 'Biển xanh', value: 'linear-gradient(135deg, #3b82f6, #06b6d4)', preview: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
  { id: 'aurora', name: 'Cực quang', value: 'linear-gradient(135deg, #10b981, #6366f1)', preview: 'bg-gradient-to-br from-emerald-500 to-indigo-500' },
  { id: 'lavender', name: 'Tím khói', value: 'linear-gradient(135deg, #8b5cf6, #ec4899)', preview: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { id: 'mint', name: 'Bạc hà', value: 'linear-gradient(135deg, #a7f3d0, #34d399)', preview: 'bg-gradient-to-br from-emerald-200 to-emerald-400' },
  { id: 'nebula', name: 'Tinh vân', value: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)', preview: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700' },
  { id: 'mesh', name: 'Hồng đào', value: 'linear-gradient(135deg, #fbcfe8, #f472b6)', preview: 'bg-gradient-to-br from-pink-200 to-pink-400' },
  { id: 'minimal-light', name: 'Xám sáng', value: '#f3f4f6', preview: 'bg-gray-100 border border-white/10' },
  { id: 'minimal-dark', name: 'Xám tối', value: '#1f2937', preview: 'bg-gray-800 border border-white/10' },
]

export default function ChatBackgroundDialog({ open, onClose, currentBackground = '', onConfirm }) {
  const [selectedBg, setSelectedBg] = useState(currentBackground)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setSelectedBg(currentBackground || '')
    }
  }, [currentBackground, open])

  if (!open) return null

  const handleSelectPreset = (value) => {
    setSelectedBg(value)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      alert('Chỉ chấp nhận định dạng ảnh JPG, PNG hoặc WEBP.')
      return
    }

    if (file.size > 1.5 * 1024 * 1024) {
      alert('Kích thước ảnh nền phải nhỏ hơn 1.5MB để tối ưu dung lượng lưu trữ.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedBg(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (e) => {
    e.preventDefault()
    onConfirm?.(selectedBg)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-bold text-base text-white">Đổi hình nền cuộc trò chuyện</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Presets grid */}
          <div>
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-3">
              Mẫu nền có sẵn
            </label>
            <div className="grid grid-cols-5 gap-3">
              {BACKGROUND_PRESETS.map((preset) => {
                const isSelected = selectedBg === preset.value
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 p-2 relative overflow-hidden transition-all duration-200 ${preset.preview} hover:scale-105 ${
                      isSelected ? 'ring-2 ring-[#1877f2] ring-offset-2 ring-offset-[#1e1e1e] scale-95' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {preset.id === 'default' && (
                      <RotateCcw className="w-5 h-5 text-white/70 font-semibold" />
                    )}
                    <span className="text-[10px] text-white/95 font-medium absolute bottom-1 bg-black/55 px-1.5 py-0.5 rounded-md truncate max-w-[90%]">
                      {preset.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Upload */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-3">
              Tải lên hình nền cá nhân
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            {selectedBg && !BACKGROUND_PRESETS.some(p => p.value === selectedBg) ? (
              <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-white/10 bg-[#2a2a2a] group flex items-center justify-center">
                <img
                  src={selectedBg}
                  alt="Custom Preview"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBg('')}
                    className="px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/80 text-white text-xs font-medium transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-white/20 hover:border-white/40 bg-[#2a2a2a] hover:bg-[#323232] rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-white/60 hover:text-white transition-all"
              >
                <Upload className="w-6 h-6 text-[#1877f2]" />
                <span className="text-sm font-medium">Tải ảnh lên từ thiết bị</span>
                <span className="text-xs text-white/40">Hỗ trợ JPG, PNG, WEBP tối đa 1.5MB</span>
              </button>
            )}
          </div>
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
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#1877f2] hover:bg-[#1565d8] text-white font-medium transition-colors text-sm"
          >
            Áp dụng hình nền
          </button>
        </div>
      </div>
    </div>
  )
}
