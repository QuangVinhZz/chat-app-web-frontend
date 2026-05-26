/**
 * ConversationInfoPanel — panel "Thông tin hội thoại" trượt từ phải vào.
 * Hiển thị: avatar, tên, actions, ảnh/video, file, link, bảo mật, báo xấu, xóa lịch sử.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  X, Bell, BellOff, Pin, Users, Clock, EyeOff, AlertTriangle,
  Trash2, ChevronRight, ChevronDown, FileText,
  Link as LinkIcon, Edit2, AlarmClock, UsersRound, UserPlus, Settings,
  Camera,
} from 'lucide-react'
import { conversationService } from '../services/conversationService'
import { cn } from '../utils/cn'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { getInitials } from '../utils/format'
import { getConversationDisplayName, getConversationAvatarUrl } from '../utils/conversation'
import { messageService } from '../services/messageService'
import { useConversationsStore } from '../stores/conversationsStore'
import AutoDeleteDialog from './AutoDeleteDialog'
import ReportDialog from './ReportDialog'
import ReminderPanel from './ReminderPanel'
import AddMembersDialog from './AddMembersDialog'
import GroupSettingsDialog from './GroupSettingsDialog'
import NewConversationDialog from './NewConversationDialog'

export default function ConversationInfoPanel({
  open,
  onClose,
  conversation,
  messages = [],
  currentUserId,
  onDeleteHistory,
  onReport,
  onOpenGroupInfo, // Add this prop to open GroupInfoDialog
  meRole, // Add role prop
  onConversationRemoved, // Propagated callback
  onConversationUpdated,
}) {
  const [muteNotif, setMuteNotif] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)
  const [hideConv, setHideConv] = useState(false)
  const [showMedia, setShowMedia] = useState(true)
  const [showFiles, setShowFiles] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [showSecurity, setShowSecurity] = useState(true)
  const [showAutoDelete, setShowAutoDelete] = useState(false)
  const [autoDeleteValue, setAutoDeleteValue] = useState('never')
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    if (!conversation || !currentUserId) return
    const myMember = conversation.members?.find((m) => (m.user?.id ?? m.userId ?? m.id) === currentUserId)
    setMuteNotif(myMember?.isMuted ?? false)
    setIsPinned(myMember?.isPinned ?? false)
  }, [conversation, currentUserId])

  const handleToggleMute = async () => {
    try {
      const res = await conversationService.toggleMute(conversation.id)
      setMuteNotif(res.isMuted)
      if (conversation.members) {
        const updatedMembers = conversation.members.map((m) => {
          if ((m.user?.id ?? m.userId ?? m.id) === currentUserId) {
            return { ...m, isMuted: res.isMuted }
          }
          return m
        })
        onConversationUpdated?.({ ...conversation, members: updatedMembers })
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err)
    }
  }

  const handleTogglePin = async () => {
    try {
      const res = await conversationService.togglePin(conversation.id)
      setIsPinned(res.isPinned)
      if (conversation.members) {
        const updatedMembers = conversation.members.map((m) => {
          if ((m.user?.id ?? m.userId ?? m.id) === currentUserId) {
            return { ...m, isPinned: res.isPinned }
          }
          return m
        })
        onConversationUpdated?.({ ...conversation, members: updatedMembers })
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    }
  }

  const handleKickMember = async (userId, userName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${userName} khỏi nhóm không?`)) return
    try {
      await conversationService.removeMember(conversation.id, userId)
      if (conversation.members) {
        const updatedMembers = conversation.members.filter((m) => (m.user?.id ?? m.userId ?? m.id) !== userId)
        onConversationUpdated?.({ ...conversation, members: updatedMembers })
      }
    } catch (err) {
      console.error('Failed to remove member:', err)
      alert(err?.message || 'Không thể xóa thành viên khỏi nhóm')
    }
  }

  const avatarInputRef = useRef(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  const handleStartEditName = () => {
    setEditingNameValue(conversation?.name || '')
    setIsEditingName(true)
  }

  const handleSaveName = async () => {
    if (!editingNameValue.trim() || savingName) return
    setSavingName(true)
    try {
      const updated = await conversationService.updateSettings(conversation.id, {
        name: editingNameValue.trim(),
      })
      if (updated) {
        onConversationUpdated?.(updated)
      }
      setIsEditingName(false)
    } catch (err) {
      console.error('Failed to rename group:', err)
      alert(err?.message || 'Không thể đổi tên nhóm')
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('Chỉ chấp nhận định dạng ảnh JPG hoặc PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh đại diện phải nhỏ hơn 2MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const updated = await conversationService.updateGroupAvatar(
        conversation.id,
        file
      )
      if (updated) {
        onConversationUpdated?.(updated)
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      alert(err?.message || 'Không thể tải lên ảnh đại diện.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const displayName = getConversationDisplayName(conversation, currentUserId)
  const avatarUrl = getConversationAvatarUrl(conversation, currentUserId)
  const isGroup = conversation?.type === 'group'

  // Tính số nhóm chung với người dùng kia (chỉ cho direct chat)
  const allConversations = useConversationsStore((s) => s.conversations)
  const otherUserId = useMemo(() => {
    if (isGroup) return null
    return conversation?.members?.find((m) => m.user?.id !== currentUserId)?.user?.id ?? null
  }, [conversation, currentUserId, isGroup])

  const commonGroups = useMemo(() => {
    if (!otherUserId) return []
    return allConversations.filter(
      (c) =>
        c.type === 'group' &&
        c.members?.some((m) => m.user?.id === currentUserId) &&
        c.members?.some((m) => m.user?.id === otherUserId)
    )
  }, [allConversations, currentUserId, otherUserId])

  const [showReminders, setShowReminders] = useState(false)
  const [showCommonGroups, setShowCommonGroups] = useState(false)
  const [showGroupMembers, setShowGroupMembers] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  // Lọc media, file, link từ messages
  const mediaAttachments = useMemo(() =>
    messages.flatMap((m) => (m.attachments ?? []).filter((a) => a.type === 'image' || a.type === 'video'))
  , [messages])

  const fileAttachments = useMemo(() =>
    messages.flatMap((m) => (m.attachments ?? []).filter((a) => a.type === 'document' || a.type === 'audio'))
  , [messages])

  const links = useMemo(() => {
    const urlRegex = /https?:\/\/[^\s]+/g
    return messages
      .filter((m) => m.content)
      .flatMap((m) => (m.content.match(urlRegex) || []).map((url) => ({ url, message: m })))
      .slice(0, 10)
  }, [messages])

  if (!open) return null

  return (
    <>
      {/* Panel — cột bên phải, không fixed, không backdrop */}
      <div className="w-72 shrink-0 bg-card border-l border-border flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-base">Thông tin hội thoại</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Avatar + tên */}
          <div className="flex flex-col items-center py-6 px-4 border-b border-border">
            <div className="relative group/avatar mb-3">
              <Avatar className={cn('h-20 w-20', isGroup && 'rounded-xl')}>
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className={cn('text-xl', isGroup && 'rounded-xl bg-primary/20 text-primary')}>
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {isGroup && (meRole === 'owner' || meRole === 'admin') && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 bg-black/40 text-white rounded-xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity disabled:opacity-50 cursor-pointer"
                    title="Đổi ảnh đại diện nhóm"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1 w-full max-w-[200px]">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full text-center"
                  maxLength={100}
                  autoFocus
                  disabled={savingName}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !editingNameValue.trim()}
                  className="text-primary hover:opacity-80 p-1 shrink-0 text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  disabled={savingName}
                  className="text-muted-foreground hover:opacity-80 p-1 shrink-0 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 justify-center">
                <h3 className="font-semibold text-base truncate max-w-[200px]" title={displayName}>
                  {displayName}
                </h3>
                {isGroup && (meRole === 'owner' || meRole === 'admin') && (
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {isGroup && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {conversation?.members?.length ?? 0} thành viên
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 py-4 border-b border-border px-4">
            <ActionBtn
              icon={muteNotif ? BellOff : Bell}
              label={muteNotif ? 'Bật thông báo' : 'Tắt thông báo'}
              onClick={handleToggleMute}
              active={muteNotif}
            />
            <ActionBtn 
              icon={Pin} 
              label={isPinned ? 'Bỏ ghim' : 'Ghim hội thoại'} 
              onClick={handleTogglePin}
              active={isPinned}
            />
            {isGroup ? (
              <>
                <ActionBtn
                  icon={UserPlus}
                  label="Thêm thành viên"
                  onClick={() => setShowAddMembers(true)}
                />
                <ActionBtn
                  icon={Settings}
                  label="Quản lý nhóm"
                  onClick={() => setShowGroupSettings(true)}
                />
              </>
            ) : (
              <ActionBtn 
                icon={Users} 
                label="Tạo nhóm trò chuyện" 
                onClick={() => setShowNewConv(true)} 
                className="col-span-2"
              />
            )}
          </div>

          {/* Danh sách nhắc hẹn */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowReminders(true)}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <AlarmClock className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 text-left">Danh sách nhắc hẹn</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Thành viên nhóm — chỉ hiện với group chat */}
          {isGroup && (
            <div className="border-b border-border">
              <button
                type="button"
                onClick={() => setShowGroupMembers((v) => !v)}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 text-left">Thành viên nhóm</span>
                <ChevronRight className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  showGroupMembers && 'rotate-90'
                )} />
              </button>
              {showGroupMembers && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {conversation?.members?.length ?? 0} thành viên
                    </span>
                  </div>
                  {conversation?.members && conversation.members.length > 0 ? (
                    <div className="space-y-2">
                      {conversation.members.map((member) => {
                        const user = member.user || member
                        const userName = user.fullName || user.full_name || user.name || 'Unknown'
                        const userAvatar = user.avatarUrl || user.avatar_url || null
                        
                        return (
                          <div key={member.id || user.id} className="flex items-center gap-2.5 py-1.5">
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
                              <p className="text-sm font-medium truncate">
                                {userName}
                              </p>
                              {member.role && member.role !== 'member' && (
                                <p className="text-xs text-muted-foreground">
                                  {member.role === 'owner' ? 'Trưởng nhóm' : 'Phó nhóm'}
                                </p>
                              )}
                            </div>
                            {/* Kick button */}
                            {isGroup && (meRole === 'owner' || (meRole === 'admin' && member.role === 'member')) && (user.id || user.uuid) !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => handleKickMember(user.id || user.uuid || member.userId, userName)}
                                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors shrink-0"
                                title="Xóa khỏi nhóm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Không có thành viên nào.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nhóm chung — chỉ hiện với direct chat */}
          {!isGroup && (
            <div className="border-b border-border">
              <button
                type="button"
                onClick={() => setShowCommonGroups((v) => !v)}
                className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <UsersRound className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 text-left">
                  {commonGroups.length > 0 ? `${commonGroups.length} nhóm chung` : 'Nhóm chung'}
                </span>
                <ChevronRight className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  showCommonGroups && 'rotate-90'
                )} />
              </button>
              {showCommonGroups && (
                <div className="px-4 pb-3">
                  {commonGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Không có nhóm chung nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {commonGroups.map((g) => (
                        <div key={g.id} className="flex items-center gap-2.5 py-1">
                          <Avatar className="h-8 w-8 rounded-lg shrink-0">
                            <AvatarImage src={g.avatarUrl} alt={g.name} />
                            <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-xs">
                              {getInitials(g.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.members?.length ?? 0} thành viên
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}          {/* Ảnh / Video */}
          <Section
            title="Ảnh/Video"
            open={showMedia}
            onToggle={() => setShowMedia((v) => !v)}
            count={mediaAttachments.length}
          >
            {mediaAttachments.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 pb-3">Chưa có ảnh/video nào.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1 px-4 pb-3">
                {mediaAttachments.slice(0, 6).map((att) => (
                  <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-muted block"
                  >
                    {att.type === 'image'
                      ? <img src={att.url} alt="" className="w-full h-full object-cover" />
                      : <video src={att.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    }
                  </a>
                ))}
              </div>
            )}
            {mediaAttachments.length > 6 && (
              <button type="button" className="w-full text-xs text-primary py-2 hover:bg-muted transition-colors">
                Xem tất cả
              </button>
            )}
          </Section>

          {/* File */}
          <Section
            title="File"
            open={showFiles}
            onToggle={() => setShowFiles((v) => !v)}
            count={fileAttachments.length}
          >
            {fileAttachments.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 pb-3 text-center">
                Chưa có File được chia sẻ trong hội thoại này
              </p>
            ) : (
              <div className="space-y-1 px-4 pb-3">
                {fileAttachments.slice(0, 5).map((att) => (
                  <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs truncate flex-1">{att.fileName || 'File'}</span>
                  </a>
                ))}
              </div>
            )}
          </Section>

          {/* Link */}
          <Section
            title="Link"
            open={showLinks}
            onToggle={() => setShowLinks((v) => !v)}
            count={links.length}
          >
            {links.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 pb-3 text-center">
                Chưa có link nào được chia sẻ
              </p>
            ) : (
              <div className="space-y-1 px-4 pb-3">
                {links.map(({ url }, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs truncate flex-1 text-primary">{url}</span>
                  </a>
                ))}
              </div>
            )}
          </Section>

          {/* Thiết lập bảo mật */}
          <Section
            title="Thiết lập bảo mật"
            open={showSecurity}
            onToggle={() => setShowSecurity((v) => !v)}
          >
            <div className="px-4 pb-3 space-y-3">
              {/* Tin nhắn tự xóa */}
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-1 -mx-1 transition-colors"
                onClick={() => setShowAutoDelete(true)}
              >
                <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">Tin nhắn tự xóa</p>
                  <p className="text-xs text-muted-foreground">
                    {autoDeleteValue === 'never' ? 'Không bao giờ'
                      : autoDeleteValue === '1d' ? '1 ngày'
                      : autoDeleteValue === '7d' ? '7 ngày'
                      : '14 ngày'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              {/* Ẩn trò chuyện */}
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm flex-1">Ẩn trò chuyện</p>
                <Toggle value={hideConv} onChange={setHideConv} />
              </div>
            </div>
          </Section>

          {/* Báo xấu */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-muted transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm">Báo xấu</span>
            </button>
          </div>

          {/* Xóa lịch sử */}
          <div className="border-t border-border mb-4">
            <button
              type="button"
              onClick={onDeleteHistory}
              className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Xóa lịch sử trò chuyện</span>
            </button>
          </div>
        </div>

        {/* Reminder sub-panel — trượt vào từ phải */}
        <ReminderPanel
          open={showReminders}
          onBack={() => setShowReminders(false)}
        />
      </div>

      {/* Auto-delete dialog */}
      <AutoDeleteDialog
        open={showAutoDelete}
        onClose={() => setShowAutoDelete(false)}
        currentValue={autoDeleteValue}
        onConfirm={(val) => setAutoDeleteValue(val)}
      />

      {/* Report dialog */}
      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        targetType="user"
        targetId={
          conversation?.type === 'direct'
            ? conversation?.members?.find((m) => m.user?.id !== currentUserId)?.user?.id
            : conversation?.id
        }
        targetName={displayName}
      />

      {/* Add Members dialog */}
      <AddMembersDialog
        open={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        conversation={conversation}
        onSuccess={() => {
          // Reload conversation to get updated member list
          window.location.reload()
        }}
      />

      {/* Group Settings dialog */}
      <GroupSettingsDialog
        open={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        conversation={conversation}
        meRole={meRole}
        onConversationRemoved={onConversationRemoved}
        onConversationUpdated={onConversationUpdated}
      />

      {/* New Conversation/Group dialog */}
      <NewConversationDialog
        open={showNewConv}
        onOpenChange={setShowNewConv}
        onCreated={(newConv) => {
          setShowNewConv(false)
          window.location.reload()
        }}
      />
    </>
  )
}

function ActionBtn({ icon: Icon, label, onClick, active, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex flex-col items-center gap-1.5 group", className)}
    >
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
        active ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[60px]">
        {label}
      </span>
    </button>
  )
}

function Section({ title, open, onToggle, count, children }) {
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold text-sm">
          {title}{count > 0 ? ` (${count})` : ''}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      {open && children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        value ? 'bg-primary' : 'bg-muted-foreground/30'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}
