/**
 * ConversationInfoPanel — panel "Thông tin hội thoại" trượt từ phải vào.
 * Hiển thị: avatar, tên, actions, ảnh/video, file, link, bảo mật, báo xấu, xóa lịch sử.
 */
import { useState, useMemo } from 'react'
import {
  X, Bell, BellOff, Pin, Users, Clock, EyeOff, AlertTriangle,
  Trash2, ChevronRight, ChevronDown, FileText,
  Link as LinkIcon, Edit2, AlarmClock, UsersRound, UserPlus, Settings,
} from 'lucide-react'
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
}) {
  const [muteNotif, setMuteNotif] = useState(false)
  const [hideConv, setHideConv] = useState(false)
  const [showMedia, setShowMedia] = useState(true)
  const [showFiles, setShowFiles] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [showSecurity, setShowSecurity] = useState(true)
  const [showAutoDelete, setShowAutoDelete] = useState(false)
  const [autoDeleteValue, setAutoDeleteValue] = useState('never')
  const [showReport, setShowReport] = useState(false)

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
            <Avatar className={cn('h-20 w-20 mb-3', isGroup && 'rounded-xl')}>
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className={cn('text-xl', isGroup && 'rounded-xl bg-primary/20 text-primary')}>
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base">{displayName}</h3>
              {isGroup && (
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
              onClick={() => setMuteNotif((v) => !v)}
              active={muteNotif}
            />
            <ActionBtn 
              icon={Pin} 
              label="Ghim hội thoại" 
              onClick={() => {}} 
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
                onClick={() => {}} 
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
