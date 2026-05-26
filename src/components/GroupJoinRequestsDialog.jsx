import { useEffect, useState } from 'react'
import { ArrowLeft, Check, X, ShieldAlert } from 'lucide-react'
import { Dialog, DialogContent } from './ui/Dialog'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { getInitials } from '../utils/format'
import { conversationService } from '../services/conversationService'

export default function GroupJoinRequestsDialog({ open, onClose, conversation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState(null)
  const [error, setError] = useState('')

  const fetchRequests = async () => {
    if (!conversation?.id) return
    setLoading(true)
    setError('')
    try {
      const data = await conversationService.getJoinRequests(conversation.id)
      setRequests(data)
    } catch (err) {
      console.error('Failed to fetch join requests:', err)
      setError('Không thể tải danh sách yêu cầu phê duyệt.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && conversation?.id) {
      fetchRequests()
    }
  }, [open, conversation?.id])

  const handleApprove = async (requestId) => {
    setSubmittingId(requestId)
    setError('')
    try {
      await conversationService.approveJoinRequest(conversation.id, requestId)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error('Failed to approve request:', err)
      setError(err?.message || 'Phê duyệt thất bại.')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleReject = async (requestId) => {
    setSubmittingId(requestId)
    setError('')
    try {
      await conversationService.rejectJoinRequest(conversation.id, requestId)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error('Failed to reject request:', err)
      setError(err?.message || 'Từ chối thất bại.')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[80vh] p-0 gap-0 bg-[#1a1f2e] flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 shrink-0 text-white">
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-base flex-1 text-center -mr-9">Yêu cầu phê duyệt</h2>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center gap-2 border border-red-500/20 shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 text-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
              <p className="text-sm text-gray-400">Đang tải danh sách...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-800/30 flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-sm font-medium">Không có yêu cầu chờ duyệt</p>
              <p className="text-xs mt-1">Tất cả các thành viên mới đã được phê duyệt.</p>
            </div>
          ) : (
            <div className="px-4 py-2 space-y-3 mt-2">
              {requests.map((request) => {
                const user = request.user
                if (!user) return null
                const name = user.fullName || user.full_name || user.name || 'Người dùng ẩn danh'
                const userAvatar = user.avatarUrl || user.avatar_url || null
                const isSubmitting = submittingId === request.id

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-800/20 rounded-xl border border-gray-800/30 hover:border-gray-800/60 transition-colors"
                  >
                    <Avatar className="h-10 w-10 rounded-full shrink-0">
                      <AvatarImage 
                        src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                        alt={name} 
                      />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{name}</p>
                      <p className="text-xs text-gray-400">Gửi yêu cầu tham gia</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReject(request.id)}
                        disabled={isSubmitting || submittingId !== null}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
                        title="Từ chối"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(request.id)}
                        disabled={isSubmitting || submittingId !== null}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        title="Phê duyệt"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
