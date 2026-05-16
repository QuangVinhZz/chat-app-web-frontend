import { X } from 'lucide-react'
import { Dialog, DialogContent } from './ui/Dialog'

export default function DissolveGroupDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 bg-[#1a1f2e] [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg">Giải tán nhóm</h2>
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-300 leading-relaxed mb-6">
            Mời tất cả mọi người rời nhóm và xóa tin nhắn? Nhóm đã giải tán sẽ KHÔNG THỂ khôi phục.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              Không
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm?.()
                onClose()
              }}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Giải tán nhóm
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
