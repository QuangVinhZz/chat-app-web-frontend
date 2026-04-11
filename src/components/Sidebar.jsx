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
  ChevronDown,
  Plus,
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
} from '../utils/conversation'
import NewConversationDialog from './NewConversationDialog'
import { formatDistanceToNow } from 'date-fns'

const navItems = [
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: UserPlus, label: 'Friends', path: '/friends', badgeKey: 'friends' },
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
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
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState('direct')
  const [loading, setLoading] = useState(true)
  const [showNewConvDialog, setShowNewConvDialog] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadUser(), refreshConversations()])
        refreshFriends()
        startRealtime()
      } catch (error) {
        console.error('Failed to load sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [loadUser, refreshFriends, startRealtime, refreshConversations])

  const handleLogout = async () => {
    await logout()
    useFriendsStore.getState().reset()
    navigate('/login')
  }

  const meId = user?.id
  const q = searchQuery.trim().toLowerCase()
  const filteredConversations = conversations.filter((conv) => {
    if (!q) return true
    const name = getConversationDisplayName(conv, meId).toLowerCase()
    return name.includes(q)
  })

  const directMessages = filteredConversations.filter((c) => c.type === 'direct')
  const groupChats = filteredConversations.filter((c) => c.type === 'group')

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
    <aside className="w-72 bg-sidebar-bg border-r border-sidebar-border flex flex-col h-full">
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
            const badge = item.badgeKey === 'friends' ? receivedCount : 0
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
        </div>
      </nav>

      {/* Search */}
      {isOnChatPage && (
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
            <Input
              placeholder="Search conversations..."
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
            className="w-full justify-start gap-2 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setShowNewConvDialog(true)}
          >
            <Plus className="w-4 h-4" />
            New conversation
          </Button>
        </div>
      )}

      {/* Conversations List */}
      {isOnChatPage && (
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 && (
            <p className="text-center text-xs text-sidebar-foreground/50 py-6">
              Loading conversations...
            </p>
          )}

          {/* Direct Messages */}
          <div className="px-2 py-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'direct' ? '' : 'direct')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground"
            >
              <span>Direct Messages ({directMessages.length})</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedSection === 'direct' && 'rotate-180'
                )}
              />
            </button>
            {expandedSection === 'direct' && (
              <div className="mt-1 space-y-0.5">
                {directMessages.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-sidebar-foreground/40">
                    No direct messages yet.
                  </p>
                ) : (
                  directMessages.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      meId={meId}
                      getInitials={getInitials}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Group Chats */}
          <div className="px-2 py-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'groups' ? '' : 'groups')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground"
            >
              <span>Group Chats ({groupChats.length})</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedSection === 'groups' && 'rotate-180'
                )}
              />
            </button>
            {expandedSection === 'groups' && (
              <div className="mt-1 space-y-0.5">
                {groupChats.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-sidebar-foreground/40">
                    No groups yet.
                  </p>
                ) : (
                  groupChats.map((conv) => (
                    <GroupConversationItem key={conv.id} conversation={conv} />
                  ))
                )}
              </div>
            )}
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
            aria-label="Open profile"
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
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent"
              aria-label="Log out"
              title="Log out"
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
  const name = getConversationDisplayName(conversation, meId)
  const avatarUrl = getConversationAvatarUrl(conversation, meId)
  const online = getConversationIsOnline(conversation, meId)
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
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar-bg',
            online ? 'bg-online' : 'bg-muted-foreground'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{name}</p>
          {conversation.lastMessageAt && (
            <span className="text-[10px] text-sidebar-foreground/50 shrink-0">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-xs text-sidebar-foreground/60 truncate">
          {conversation.lastMessagePreview || 'No messages yet'}
        </p>
      </div>
    </NavLink>
  )
}

function GroupConversationItem({ conversation }) {
  const memberCount = conversation.members?.length ?? 0
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
      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <Hash className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {conversation.name || 'Group'}
          </p>
          {conversation.lastMessageAt && (
            <span className="text-[10px] text-sidebar-foreground/50 shrink-0">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <p className="text-xs text-sidebar-foreground/60 truncate">
          {conversation.lastMessagePreview || `${memberCount} members`}
        </p>
      </div>
    </NavLink>
  )
}
