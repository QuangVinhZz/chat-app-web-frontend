import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageCircle,
  UserPlus,
  BarChart3,
  LogOut,
  Settings,
  Search,
  Hash,
  Plus,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useUserStore } from '../stores/userStore'
import { useFriendsStore } from '../stores/friendsStore'
import { useConversationsStore } from '../stores/conversationsStore'
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationIsOnline,
  getOtherMember,
} from '../utils/conversation'
import NewConversationDialog from './NewConversationDialog'
import { formatDistanceToNow } from 'date-fns'

const navItems = [
  { icon: MessageCircle, label: 'Trò chuyện', path: '/chat', badgeKey: 'chat' },
  { icon: UserPlus, label: 'Bạn bè', path: '/friends', badgeKey: 'friends' },
  { icon: BarChart3, label: 'Thống kê', path: '/dashboard' },
  { icon: Sparkles, label: 'AI Trợ lý', path: '/ai' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useUserStore((s) => s.user)
  const isOnline = useUserStore((s) => s.isOnline)
  const loadUser = useUserStore((s) => s.loadUser)
  const logout = useUserStore((s) => s.logout)
  const receivedCount = useFriendsStore((s) => s.receivedCount)
  const refreshFriends = useFriendsStore((s) => s.refresh)
  const startRealtime = useFriendsStore((s) => s.startRealtime)
  const conversations = useConversationsStore((s) => s.conversations)
  const refreshConversations = useConversationsStore((s) => s.refresh)
  const upsertConversation = useConversationsStore((s) => s.upsert)
  const startConversationsRealtime = useConversationsStore((s) => s.startRealtime)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewConvDialog, setShowNewConvDialog] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadUser(), refreshConversations()])
        refreshFriends()
        startRealtime()
        startConversationsRealtime()
      } catch (error) {
        console.error('Failed to load sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [
    loadUser,
    refreshFriends,
    startRealtime,
    refreshConversations,
    startConversationsRealtime,
  ])

  const handleLogout = async () => {
    await logout()
    useFriendsStore.getState().reset()
    useConversationsStore.getState().reset()
    navigate('/login')
  }

  const meId = user?.id
  const q = searchQuery.trim().toLowerCase()
  const filteredConversations = conversations.filter((conv) => {
    if (!q) return true
    const name = getConversationDisplayName(conv, meId).toLowerCase()
    return name.includes(q)
  })

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0
  )
  const isAdmin = Boolean(user?.isAdmin)

  const getInitials = (name) => {
    return (name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleConversationCreated = (conversation) => {
    if (!conversation) return
    upsertConversation(conversation)
    navigate(`/chat/${conversation.id}`)
  }

  const isOnChatPage = location.pathname.startsWith('/chat')

  return (
    <aside className="w-full h-full bg-sidebar-bg border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">ChatApp</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 border-b border-sidebar-border">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const badge =
              item.badgeKey === 'friends'
                ? receivedCount
                : item.badgeKey === 'chat'
                  ? totalUnread
                  : 0
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'relative flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'relative flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              <div className="relative">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>Admin</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* Search */}
      {isOnChatPage && (
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
            <Input
              placeholder="Tìm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            />
          </div>
        </div>
      )}

      {/* New conversation button */}
      {isOnChatPage && (
        <div className="px-3 pb-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            onClick={() => setShowNewConvDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Tin nhắn mới
          </Button>
        </div>
      )}

      {/* Conversations List — flat, sorted by last message (Messenger-style) */}
      {isOnChatPage && (
        <div className="flex-1 overflow-y-auto">
          {loading && filteredConversations.length === 0 && (
            <p className="text-center text-xs text-sidebar-foreground/50 py-6">
              Đang tải cuộc trò chuyện...
            </p>
          )}

          {!loading && filteredConversations.length === 0 && (
            <div className="text-center px-4 py-10">
              <p className="text-sm text-sidebar-foreground/60 mb-1">
                {searchQuery
                  ? 'Không tìm thấy cuộc trò chuyện nào phù hợp.'
                  : 'Chưa có cuộc trò chuyện nào.'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-sidebar-foreground/40">
                  Nhấp "Tin nhắn mới" để bắt đầu trò chuyện.
                </p>
              )}
            </div>
          )}

          <div className="px-2 py-2 space-y-0.5">
            {filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                meId={meId}
                getInitials={getInitials}
              />
            ))}
          </div>
        </div>
      )}

      <NewConversationDialog
        open={showNewConvDialog}
        onOpenChange={setShowNewConvDialog}
        onCreated={handleConversationCreated}
      />

      {/* Non-chat page placeholder */}
      {!isOnChatPage && <div className="flex-1" />}

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg p-1 -m-1 hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Xem hồ sơ"
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.avatarUrl || user?.avatar}
                  alt={user?.name}
                />
                <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar-bg',
                  isOnline ? 'bg-online' : 'bg-muted-foreground'
                )}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60">
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </p>
            </div>
          </button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Cài đặt"
              title="Cài đặt"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ConversationItem({ conversation, meId, getInitials }) {
  const isGroup = conversation.type === 'group'
  const name = getConversationDisplayName(conversation, meId)
  const avatarUrl = getConversationAvatarUrl(conversation, meId)
  const online = isGroup ? undefined : getConversationIsOnline(conversation, meId)
  const other = isGroup ? null : getOtherMember(conversation, meId)
  const isAiBot = other?.user?.email === 'ai-bot@system.local'
  const memberCount = conversation.members?.length ?? 0
  const unread = conversation.unreadCount || 0
  const hasUnread = unread > 0
  const subtitle =
    conversation.lastMessagePreview ||
    (isGroup ? `${memberCount} thành viên` : 'Chưa có tin nhắn nào')

  return (
    <NavLink
      to={`/chat/${conversation.id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 p-2 rounded-lg transition-colors',
          isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
        )
      }
    >
      <div className="relative shrink-0">
        {isGroup ? (
          avatarUrl ? (
            <Avatar className="h-9 w-9 rounded-lg">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
          )
        ) : (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            {!isAiBot && (
              <span
                className={cn(
                  'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar-bg',
                  online ? 'bg-online' : 'bg-muted-foreground'
                )}
              />
            )}
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-sm truncate',
              hasUnread
                ? 'font-semibold text-sidebar-foreground'
                : 'font-medium text-sidebar-foreground'
            )}
          >
            {name}
          </p>
          {conversation.lastMessageAt && (
            <span
              className={cn(
                'text-[10px] shrink-0',
                hasUnread ? 'text-primary font-semibold' : 'text-sidebar-foreground/50'
              )}
            >
              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-xs truncate',
              hasUnread
                ? 'text-sidebar-foreground font-medium'
                : 'text-sidebar-foreground/60'
            )}
          >
            {subtitle}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </NavLink>
  )
}
