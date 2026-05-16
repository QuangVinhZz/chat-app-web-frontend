import { useState, useEffect } from 'react'
import { ArrowLeft, X, HelpCircle, Users, Copy, Share2, RotateCcw, Key } from 'lucide-react'
import { cn } from '../utils/cn'
import {
  Dialog,
  DialogContent,
} from './ui/Dialog'
import BlockMembersDialog from './BlockMembersDialog'
import GroupAdminsDialog from './GroupAdminsDialog'
import DissolveGroupDialog from './DissolveGroupDialog'

export default function GroupSettingsDialog({ open, onClose, conversation, meRole }) {
  const isOwner = meRole === 'owner'
  const isAdmin = meRole === 'admin' || isOwner

  // Sub-dialogs
  const [showBlockMembers, setShowBlockMembers] = useState(false)
  const [showGroupAdmins, setShowGroupAdmins] = useState(false)
  const [showDissolveGroup, setShowDissolveGroup] = useState(false)

  // Member permissions
  const [changeNameAvatar, setChangeNameAvatar] = useState(true)
  const [pinMessages, setPinMessages] = useState(true)
  const [createNotes, setCreateNotes] = useState(true)
  const [createPolls, setCreatePolls] = useState(false)
  const [sendMessages, setSendMessages] = useState(true)

  // Admin settings
  const [approveNewMembers, setApproveNewMembers] = useState(false)
  const [markMessagesFromGroup, setMarkMessagesFromGroup] = useState(true)
  const [allowNewMembersReadRecent, setAllowNewMembersReadRecent] = useState(true)
  const [allowJoinByLink, setAllowJoinByLink] = useState(true)

  const groupLink = `zalo.me/g/zizhph802`

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return
    // Load settings from conversation if available
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] h-[85vh] p-0 gap-0 bg-[#1a1f2e] flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-medium text-base flex-1 text-center -mr-9">Quản lý nhóm</h2>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          {/* Member permissions section */}
          <div className="px-4 py-4 space-y-4 border-b border-gray-800">
            <PermissionItem
              label="Thay đổi tên & ảnh đại diện của nhóm"
              checked={changeNameAvatar}
              onChange={setChangeNameAvatar}
            />
            <PermissionItem
              label="Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại"
              checked={pinMessages}
              onChange={setPinMessages}
            />
            <PermissionItem
              label="Tạo mới ghi chú, nhắc hẹn"
              checked={createNotes}
              onChange={setCreateNotes}
            />
            <PermissionItem
              label="Tạo mới bình chọn"
              checked={createPolls}
              onChange={setCreatePolls}
            />
            <PermissionItem
              label="Gửi tin nhắn"
              checked={sendMessages}
              onChange={setSendMessages}
            />
          </div>

          {/* Admin settings section */}
          <div className="px-4 py-4 space-y-5 border-b border-gray-800">
            <SettingItem
              label="Chế độ phê duyệt thành viên mới"
              checked={approveNewMembers}
              onChange={setApproveNewMembers}
              showHelp
            />
            <SettingItem
              label="Đánh dấu tin nhắn từ trưởng/phó nhóm"
              checked={markMessagesFromGroup}
              onChange={setMarkMessagesFromGroup}
              showHelp
            />
            <SettingItem
              label="Cho phép thành viên mới đọc tin nhắn gần nhất"
              checked={allowNewMembersReadRecent}
              onChange={setAllowNewMembersReadRecent}
              showHelp
            />
            <SettingItem
              label="Cho phép dùng link tham gia nhóm"
              checked={allowJoinByLink}
              onChange={setAllowJoinByLink}
              showHelp
            />
          </div>

          {/* Group link section */}
          {allowJoinByLink && (
            <div className="px-4 py-4 border-b border-gray-800">
              <div className="border border-blue-900 bg-[#0a1929] rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm text-blue-400 flex-1 break-all">
                  {groupLink}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(groupLink)}
                  className="p-1.5 hover:bg-blue-900/30 rounded transition-colors shrink-0"
                  title="Sao chép"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                </button>
                <button
                  type="button"
                  className="p-1.5 hover:bg-blue-900/30 rounded transition-colors shrink-0"
                  title="Chia sẻ"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                </button>
                <button
                  type="button"
                  className="p-1.5 hover:bg-blue-900/30 rounded transition-colors shrink-0"
                  title="Tạo link mới"
                >
                  <RotateCcw className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>
          )}

          {/* Management buttons */}
          <div className="px-4 py-4 space-y-4 border-b border-gray-800">
            <button
              type="button"
              onClick={() => setShowBlockMembers(true)}
              className="flex items-center gap-3 w-full text-left hover:opacity-70 transition-opacity"
            >
              <Users className="w-5 h-5 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-200">Chặn khỏi nhóm</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGroupAdmins(true)}
              className="flex items-center gap-3 w-full text-left hover:opacity-70 transition-opacity"
            >
              <Key className="w-5 h-5 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-200">Trưởng & phó nhóm</span>
            </button>
          </div>

          {/* Dissolve group button */}
          <div className="px-4 py-4">
            <button
              type="button"
              onClick={() => setShowDissolveGroup(true)}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              Giải tán nhóm
            </button>
          </div>
        </div>
      </DialogContent>

      {/* Sub-dialogs */}
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
        onConfirm={() => {
          // Handle dissolve group
          console.log('Dissolve group confirmed')
        }}
      />
    </Dialog>
  )
}

function PermissionItem({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        className="text-sm text-gray-200 flex-1 cursor-pointer select-none leading-snug"
        onClick={() => onChange(!checked)}
      >
        {label}
      </label>
      <Checkbox checked={checked} onChange={onChange} />
    </div>
  )
}

function SettingItem({ label, checked, onChange, showHelp }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-200 leading-snug">{label}</p>
          {showHelp && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-300"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors',
        checked
          ? 'bg-blue-600 text-white'
          : 'border-2 border-gray-600 bg-transparent'
      )}
    >
      {checked && (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        checked ? 'bg-blue-600' : 'bg-gray-600'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
