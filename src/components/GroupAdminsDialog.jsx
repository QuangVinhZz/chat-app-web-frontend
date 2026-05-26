import { useState } from 'react'
import { ArrowLeft, X, Search } from 'lucide-react'
import { Dialog, DialogContent } from './ui/Dialog'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { getInitials } from '../utils/format'
import { conversationService } from '../services/conversationService'

export default function GroupAdminsDialog({ open, onClose, conversation, meRole, onConversationUpdated }) {
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [showTransferOwner, setShowTransferOwner] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)

  // Get owner and admins
  const owner = conversation?.members?.find(m => m.role === 'owner')
  const admins = conversation?.members?.filter(m => m.role === 'admin') || []
  
  // Get members that can be promoted to admin (regular members only)
  const regularMembers = conversation?.members?.filter(m => 
    m.role !== 'owner' && m.role !== 'admin'
  ) || []

  // Get members that can become owner (admins and regular members)
  const potentialOwners = conversation?.members?.filter(m => 
    m.role !== 'owner'
  ) || []

  const getFilteredMembers = () => {
    const members = showAddAdmin ? regularMembers : potentialOwners
    return members.filter(member => {
      const user = member.user || member
      const name = user.fullName || user.full_name || user.name || ''
      return name.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }

  const handleAddAdmin = async () => {
    if (selectedMember) {
      try {
        await conversationService.updateMemberRole(conversation.id, selectedMember, 'admin')
        window.location.reload()
      } catch (err) {
        console.error('Failed to add admin:', err)
        alert(err?.message || 'Không thể thêm phó nhóm')
      }
    }
  }

  const handleTransferOwner = async () => {
    if (selectedMember) {
      const confirmTransfer = confirm('Bạn có chắc chắn muốn chuyển quyền trưởng nhóm không? Bạn sẽ trở thành phó nhóm.')
      if (!confirmTransfer) return
      try {
        await conversationService.transferOwnership(conversation.id, selectedMember)
        window.location.reload()
      } catch (err) {
        console.error('Failed to transfer ownership:', err)
        alert(err?.message || 'Không thể chuyển quyền trưởng nhóm')
      }
    }
  }

  const handleRemoveAdmin = async (userId, userName) => {
    if (!confirm(`Bạn có chắc muốn gỡ chức danh phó nhóm của ${userName}?`)) return
    try {
      await conversationService.updateMemberRole(conversation.id, userId, 'member')
      window.location.reload()
    } catch (err) {
      console.error('Failed to demote admin:', err)
      alert(err?.message || 'Không thể gỡ chức danh phó nhóm')
    }
  }

  // Select member dialog
  if (showAddAdmin || showTransferOwner) {
    const filteredMembers = getFilteredMembers()
    const title = showAddAdmin ? 'Thêm phó nhóm' : 'Chuyển quyền trưởng nhóm'
    const buttonText = showAddAdmin ? 'Thêm phó nhóm' : 'Chuyển quyền'

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md h-[85vh] p-0 gap-0 bg-[#1a1f2e] flex flex-col [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <h2 className="font-medium text-base">{title}</h2>
            <button
              type="button"
              onClick={() => {
                setShowAddAdmin(false)
                setShowTransferOwner(false)
                setSelectedMember(null)
                setSearchQuery('')
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
                  const memberId = user.id || user.uuid || member.userId || member.id
                  const isSelected = selectedMember === memberId

                  return (
                    <div
                      key={memberId}
                      onClick={() => setSelectedMember(memberId)}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-800/50 rounded-lg px-2 transition-colors"
                    >
                      <div className="relative">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-600 bg-transparent'
                        }`}>
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
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
                        {member.role === 'admin' && (
                          <p className="text-xs text-gray-400">Phó nhóm</p>
                        )}
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
                setShowAddAdmin(false)
                setShowTransferOwner(false)
                setSelectedMember(null)
                setSearchQuery('')
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={showAddAdmin ? handleAddAdmin : handleTransferOwner}
              disabled={!selectedMember}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {buttonText}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Main view
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
          <h2 className="font-medium text-base flex-1 text-center -mr-9">Trưởng & phó nhóm</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Owner Section */}
          {owner && (() => {
            const ownerUser = owner.user || owner
            const ownerName = ownerUser.fullName || ownerUser.full_name || ownerUser.name || 'Unknown'
            const ownerAvatar = ownerUser.avatarUrl || ownerUser.avatar_url || null
            return (
              <div className="px-4 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-full">
                    <AvatarImage 
                      src={ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=random`}
                      alt={ownerName} 
                    />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(ownerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">
                      {ownerName}
                    </p>
                    <p className="text-xs text-gray-400">Trưởng nhóm</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Add Admin Button */}
          <div className="px-4 py-4 border-b border-gray-800">
            <button
              type="button"
              onClick={() => setShowAddAdmin(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              Thêm phó nhóm
            </button>
          </div>

          {/* Transfer Owner Button */}
          <div className="px-4 py-4 border-b border-gray-800">
            <button
              type="button"
              onClick={() => setShowTransferOwner(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              Chuyển quyền trưởng nhóm
            </button>
          </div>

          {/* Admins List */}
          {admins.length > 0 && (
            <div className="px-4 py-4">
              <h3 className="text-xs text-gray-400 mb-3">PHÓ NHÓM</h3>
              <div className="space-y-3">
                {admins.map((admin) => {
                  const adminUser = admin.user || admin
                  const adminName = adminUser.fullName || adminUser.full_name || adminUser.name || 'Unknown'
                  const adminAvatar = adminUser.avatarUrl || adminUser.avatar_url || null
                  const adminId = adminUser.id || adminUser.uuid || admin.id

                  return (
                    <div key={adminId} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-full">
                        <AvatarImage 
                          src={adminAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=random`}
                          alt={adminName} 
                        />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {getInitials(adminName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-center justify-between">
                        <p className="text-sm text-gray-200">
                          {adminName}
                        </p>
                        {meRole === 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(adminId, adminName)}
                            className="text-xs text-red-500 hover:text-red-400 hover:underline shrink-0 ml-2"
                          >
                            Gỡ phó nhóm
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
