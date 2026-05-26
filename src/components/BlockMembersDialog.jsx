import { useState } from 'react'
import { ArrowLeft, X, Search } from 'lucide-react'
import { Dialog, DialogContent } from './ui/Dialog'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { getInitials } from '../utils/format'
import { conversationService } from '../services/conversationService'

export default function BlockMembersDialog({ open, onClose, conversation }) {
  const [showSelectMembers, setShowSelectMembers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])

  // Get members that can be blocked (not owner/admin)
  const blockableMembers = conversation?.members?.filter(m => 
    m.role !== 'owner' && m.role !== 'admin'
  ) || []

  const filteredMembers = blockableMembers.filter(member => {
    const user = member.user || member
    const name = user.fullName || user.full_name || user.name || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleBlock = async () => {
    if (selectedMembers.length === 0) return
    const confirmBlock = confirm(`Bạn có chắc chắn muốn xóa ${selectedMembers.length} thành viên đã chọn ra khỏi nhóm không?`)
    if (!confirmBlock) return
    try {
      for (const userId of selectedMembers) {
        await conversationService.removeMember(conversation.id, userId)
      }
      setShowSelectMembers(false)
      setSelectedMembers([])
      onClose()
      window.location.reload()
    } catch (err) {
      console.error('Failed to remove members:', err)
      alert(err?.message || 'Không thể xóa thành viên khỏi nhóm')
    }
  }

  if (showSelectMembers) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md h-[85vh] p-0 gap-0 bg-[#1a1f2e] flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <h2 className="font-medium text-base">Thêm vào danh sách chặn</h2>
            <button
              type="button"
              onClick={() => {
                setShowSelectMembers(false)
                setSelectedMembers([])
              }}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm thành viên"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-sm text-gray-200 placeholder-gray-500 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredMembers.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Không tìm thấy thành viên</p>
              </div>
            ) : (
              <div className="px-4 py-2">
                {filteredMembers.map((member) => {
                  const user = member.user || member
                  const userName = user.fullName || user.full_name || user.name || 'Unknown'
                  const userAvatar = user.avatarUrl || user.avatar_url || null
                  const userId = user.id || user.uuid || member.userId || member.id
                  const isSelected = selectedMembers.includes(userId)

                  return (
                    <div
                      key={userId}
                      onClick={() => toggleMember(userId)}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-800/50 rounded-lg px-2 transition-colors"
                    >
                      <div className="relative">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <Avatar className="h-10 w-10 rounded-full shrink-0">
                        <AvatarImage 
                          src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`}
                          alt={userName} 
                        />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{userName}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-800 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowSelectMembers(false)
                setSelectedMembers([])
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleBlock}
              disabled={selectedMembers.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Chặn thành viên
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[85vh] p-0 gap-0 bg-[#1a1f2e] flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-medium text-base flex-1 text-center -mr-9">Chặn khỏi nhóm</h2>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Icon */}
          <div className="relative mb-6">
            <svg className="w-24 h-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="absolute -bottom-1 -right-1 bg-gray-700 rounded-full p-1.5">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 text-center leading-relaxed mb-6 max-w-sm">
            Những người đã bị chặn không thể tham gia lại nhóm, trừ khi được trưởng, phó nhóm bỏ chặn hoặc thêm lại vào nhóm.
          </p>

          {/* Button */}
          <button
            type="button"
            onClick={() => setShowSelectMembers(true)}
            className="w-full max-w-sm bg-red-700 hover:bg-red-800 text-white font-medium py-3 rounded-lg transition-colors text-sm"
          >
            Thêm vào danh sách chặn
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
