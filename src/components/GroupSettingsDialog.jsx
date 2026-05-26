import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  HelpCircle,
  Users,
  Copy,
  Share2,
  RotateCcw,
  Key,
  Check,
  QrCode,
  MessageSquare,
  Pin,
  StickyNote,
  BarChart3,
  ImageIcon,
  ShieldCheck,
  UserPlus,
  Eye,
  Link2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { Dialog, DialogContent } from './ui/Dialog'
import BlockMembersDialog from './BlockMembersDialog'
import GroupAdminsDialog from './GroupAdminsDialog'
import DissolveGroupDialog from './DissolveGroupDialog'
import { conversationService } from '../services/conversationService'

export default function GroupSettingsDialog({ open, onClose, conversation, meRole, onConversationRemoved }) {
  const isOwner = meRole === 'owner'
  const isAdmin = meRole === 'admin' || isOwner

  const [showBlockMembers, setShowBlockMembers] = useState(false)
  const [showGroupAdmins, setShowGroupAdmins] = useState(false)
  const [showDissolveGroup, setShowDissolveGroup] = useState(false)

  // UI-only placeholders (no API yet) — kept for visual completeness.
  const [changeNameAvatar, setChangeNameAvatar] = useState(true)
  const [pinMessages, setPinMessages] = useState(true)
  const [createNotes, setCreateNotes] = useState(true)
  const [createPolls, setCreatePolls] = useState(false)
  const [approveNewMembers, setApproveNewMembers] = useState(false)
  const [markMessagesFromGroup, setMarkMessagesFromGroup] = useState(true)
  const [allowNewMembersReadRecent, setAllowNewMembersReadRecent] = useState(true)
  const [allowJoinByLink, setAllowJoinByLink] = useState(true)

  // Backed by API.
  const [sendMessages, setSendMessages] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)

  const groupLink = inviteCode
    ? `${window.location.origin}/join/${inviteCode}`
    : ''
  const qrSrc = useMemo(
    () =>
      groupLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(groupLink)}`
        : '',
    [groupLink]
  )

  useEffect(() => {
    if (!open || !conversation) return
    setSendMessages(!conversation.commentsRestricted)
    setInviteCode(conversation.inviteCode || '')
    setCopied(false)
  }, [open, conversation])

  const persistCommentsRestricted = async (allowSend) => {
    if (!isAdmin) return
    try {
      await conversationService.updateSettings(conversation.id, {
        commentsRestricted: !allowSend,
      })
    } catch {
      setSendMessages(!allowSend)
    }
  }

  const handleToggleSendMessages = (next) => {
    setSendMessages(next)
    persistCommentsRestricted(next)
  }

  const handleRegenerate = async () => {
    if (!isAdmin || rotating) return
    setRotating(true)
    try {
      const code = await conversationService.regenerateInviteCode(conversation.id)
      if (code) setInviteCode(code)
    } finally {
      setRotating(false)
    }
  }

  const handleCopy = async () => {
    if (!groupLink) return
    try {
      await navigator.clipboard.writeText(groupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const handleShare = () => {
    if (!groupLink) return
    if (navigator.share) {
      navigator.share({ title: 'Tham gia nhóm', url: groupLink }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  const handleDisband = async () => {
    try {
      await conversationService.disband(conversation.id)
      onClose()
      onConversationRemoved?.(conversation.id)
    } catch (error) {
      console.error('Failed to disband group:', error)
      alert(error?.message || 'Không thể giải tán nhóm')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-130 h-[88vh] p-0 gap-0 bg-background flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Đóng"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-base">Quản lý nhóm</h2>
            <p className="text-xs text-muted-foreground truncate">
              {conversation?.name || 'Nhóm chat'}
            </p>
          </div>
        </div>

        {/* Content — light theme, grouped into cards */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 bg-muted/40 p-4 space-y-4">
          {/* Member permissions */}
          <Section title="Quyền thành viên" subtitle="Áp dụng cho mọi thành viên thường.">
            <PermissionItem
              icon={ImageIcon}
              tint="blue"
              label="Thay đổi tên & ảnh đại diện"
              checked={changeNameAvatar}
              onChange={setChangeNameAvatar}
            />
            <PermissionItem
              icon={Pin}
              tint="amber"
              label="Ghim tin nhắn, ghi chú, bình chọn"
              checked={pinMessages}
              onChange={setPinMessages}
            />
            <PermissionItem
              icon={StickyNote}
              tint="emerald"
              label="Tạo ghi chú, nhắc hẹn"
              checked={createNotes}
              onChange={setCreateNotes}
            />
            <PermissionItem
              icon={BarChart3}
              tint="purple"
              label="Tạo bình chọn"
              checked={createPolls}
              onChange={setCreatePolls}
            />
            <PermissionItem
              icon={MessageSquare}
              tint="sky"
              label="Gửi tin nhắn"
              description={
                !sendMessages
                  ? 'Chỉ trưởng/phó nhóm có thể gửi tin trong nhóm này.'
                  : null
              }
              checked={sendMessages}
              onChange={handleToggleSendMessages}
              disabled={!isAdmin}
            />
          </Section>

          {/* Admin settings */}
          <Section title="Tuỳ chọn quản trị" subtitle="Dành cho trưởng / phó nhóm.">
            <SettingItem
              icon={ShieldCheck}
              tint="emerald"
              label="Phê duyệt thành viên mới"
              hint="Yêu cầu admin duyệt trước khi vào nhóm."
              checked={approveNewMembers}
              onChange={setApproveNewMembers}
            />
            <SettingItem
              icon={Key}
              tint="amber"
              label="Đánh dấu tin nhắn từ trưởng/phó"
              hint="Hiển thị badge cho tin từ admin."
              checked={markMessagesFromGroup}
              onChange={setMarkMessagesFromGroup}
            />
            <SettingItem
              icon={Eye}
              tint="sky"
              label="Thành viên mới đọc tin gần nhất"
              hint="Cho phép xem lịch sử trước khi join."
              checked={allowNewMembersReadRecent}
              onChange={setAllowNewMembersReadRecent}
            />
            <SettingItem
              icon={Link2}
              tint="purple"
              label="Tham gia qua link / QR"
              hint="Người lạ có thể join bằng mã."
              checked={allowJoinByLink}
              onChange={setAllowJoinByLink}
            />
          </Section>

          {/* Invite link + QR */}
          {allowJoinByLink && groupLink && (
            <Section title="Liên kết tham gia" subtitle="Chia sẻ để mời người ngoài.">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <img
                    alt="QR tham gia nhóm"
                    src={qrSrc}
                    className="w-32 h-32 rounded-xl bg-white p-2 border"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Mã tham gia
                    </p>
                    <p className="font-mono text-2xl font-semibold tracking-widest text-primary select-all">
                      {inviteCode || '—'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {groupLink}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <ActionPill
                      icon={copied ? Check : Copy}
                      label={copied ? 'Đã sao chép' : 'Sao chép'}
                      onClick={handleCopy}
                      tone={copied ? 'success' : 'default'}
                    />
                    <ActionPill icon={Share2} label="Chia sẻ" onClick={handleShare} />
                    {isAdmin && (
                      <ActionPill
                        icon={RotateCcw}
                        label={rotating ? 'Đang tạo...' : 'Tạo mã mới'}
                        onClick={handleRegenerate}
                        disabled={rotating}
                        spinning={rotating}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5">
                <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Bất kỳ ai có mã đều có thể vào nhóm. Tạo mã mới để vô hiệu link cũ.
                </p>
              </div>
            </Section>
          )}

          {/* Quick actions */}
          <Section>
            <NavRow
              icon={UserPlus}
              tint="rose"
              label="Chặn khỏi nhóm"
              onClick={() => setShowBlockMembers(true)}
            />
            <NavRow
              icon={Users}
              tint="sky"
              label="Trưởng & phó nhóm"
              onClick={() => setShowGroupAdmins(true)}
            />
          </Section>

          {/* Danger zone */}
          {isOwner && (
            <Section title="Vùng nguy hiểm" tone="danger">
              <button
                type="button"
                onClick={() => setShowDissolveGroup(true)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive">Giải tán nhóm</p>
                  <p className="text-xs text-destructive/80">
                    Hành động này không thể hoàn tác.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-destructive/60 shrink-0" />
              </button>
            </Section>
          )}
        </div>
      </DialogContent>

      <BlockMembersDialog
        open={showBlockMembers}
        onClose={() => setShowBlockMembers(false)}
        conversation={conversation}
      />
      <GroupAdminsDialog
        open={showGroupAdmins}
        onClose={() => setShowGroupAdmins(false)}
        conversation={conversation}
      />
      <DissolveGroupDialog
        open={showDissolveGroup}
        onClose={() => setShowDissolveGroup(false)}
        onConfirm={handleDisband}
      />
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

function Section({ title, subtitle, tone, children }) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-card border shadow-sm overflow-hidden',
        tone === 'danger' && 'border-destructive/20'
      )}
    >
      {(title || subtitle) && (
        <header className="px-4 pt-3 pb-2">
          {title && (
            <h3
              className={cn(
                'text-[13px] font-semibold uppercase tracking-wide',
                tone === 'danger' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground/80 mt-0.5">{subtitle}</p>
          )}
        </header>
      )}
      <div className="px-3 py-2 space-y-1">{children}</div>
    </section>
  )
}

const TINTS = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
}

function IconBadge({ icon: Icon, tint = 'blue' }) {
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', TINTS[tint])}>
      <Icon className="w-4 h-4" />
    </div>
  )
}

function PermissionItem({ icon, tint, label, description, checked, onChange, disabled }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-2 rounded-lg',
        disabled && 'opacity-60'
      )}
    >
      <IconBadge icon={icon} tint={tint} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function SettingItem({ icon, tint, label, hint, checked, onChange, disabled }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-2 rounded-lg',
        disabled && 'opacity-60'
      )}
    >
      <IconBadge icon={icon} tint={tint} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium leading-snug">{label}</p>
          {hint && (
            <span title={hint} className="text-muted-foreground/70">
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function NavRow({ icon, tint, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-2 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
    >
      <IconBadge icon={icon} tint={tint} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  )
}

function ActionPill({ icon: Icon, label, onClick, disabled, spinning, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors',
        tone === 'success'
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900'
          : 'bg-background hover:bg-muted text-foreground border-border',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', spinning && 'animate-spin')} />
      {label}
    </button>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'inline-flex items-center w-11 h-6 rounded-full transition-colors shrink-0 px-0.5',
        checked ? 'justify-end bg-primary' : 'justify-start bg-muted-foreground/30',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow transition-transform" />
    </button>
  )
}
