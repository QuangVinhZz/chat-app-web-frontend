import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageCircle,
  Users,
  BarChart3,
  User,
  LogOut,
  Settings,
  Search,
  Bot,
  Hash,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { userService } from '../services/userService'
import { chatService } from '../services/chatService'
import { formatDistanceToNow } from 'date-fns'

const navItems = [
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: Users, label: 'Groups', path: '/groups' },
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSection, setExpandedSection] = useState('direct')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, convData] = await Promise.all([
          userService.getCurrentUser(),
          chatService.getConversations(),
        ])
        setUser(userData)
        setConversations(convData)
      } catch (error) {
        console.error('Failed to load sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleLogout = async () => {
    await userService.logout()
    navigate('/login')
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const directMessages = filteredConversations.filter((c) => c.type === 'direct')
  const groupChats = filteredConversations.filter((c) => c.type === 'group')
  const botChat = filteredConversations.find((c) => c.type === 'bot')

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
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

      {/* Conversations List */}
      {isOnChatPage && (
        <div className="flex-1 overflow-y-auto">
          {/* Bot Chat */}
          {botChat && (
            <div className="px-2 py-2">
              <NavLink
                to={`/chat/${botChat.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-accent'
                      : 'hover:bg-sidebar-accent/50'
                  )
                }
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    AI Assistant
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {botChat.lastMessage}
                  </p>
                </div>
              </NavLink>
            </div>
          )}

          {/* Direct Messages */}
          <div className="px-2 py-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'direct' ? '' : 'direct')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground"
            >
              <span>Direct Messages</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedSection === 'direct' && 'rotate-180'
                )}
              />
            </button>
            {expandedSection === 'direct' && (
              <div className="mt-1 space-y-0.5">
                {directMessages.map((conv) => (
                  <ConversationItem key={conv.id} conversation={conv} getInitials={getInitials} />
                ))}
              </div>
            )}
          </div>

          {/* Group Chats */}
          <div className="px-2 py-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'groups' ? '' : 'groups')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground"
            >
              <span>Group Chats</span>
              <div className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform',
                    expandedSection === 'groups' && 'rotate-180'
                  )}
                />
              </div>
            </button>
            {expandedSection === 'groups' && (
              <div className="mt-1 space-y-0.5">
                {groupChats.map((conv) => (
                  <GroupConversationItem key={conv.id} conversation={conv} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-chat page placeholder */}
      {!isOnChatPage && <div className="flex-1" />}

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar-bg',
                user?.status === 'online' && 'bg-online',
                user?.status === 'away' && 'bg-away',
                user?.status === 'busy' && 'bg-busy',
                user?.status === 'offline' && 'bg-muted-foreground'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.status}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ConversationItem({ conversation, getInitials }) {
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
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={conversation.avatar} alt={conversation.name} />
          <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {conversation.name}
          </p>
          <span className="text-[10px] text-sidebar-foreground/50">
            {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: false })}
          </span>
        </div>
        <p className="text-xs text-sidebar-foreground/60 truncate">{conversation.lastMessage}</p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {conversation.unreadCount}
        </span>
      )}
    </NavLink>
  )
}

function GroupConversationItem({ conversation }) {
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
      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
        <Hash className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {conversation.name}
          </p>
          <span className="text-[10px] text-sidebar-foreground/50">
            {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: false })}
          </span>
        </div>
        <p className="text-xs text-sidebar-foreground/60 truncate">{conversation.lastMessage}</p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {conversation.unreadCount}
        </span>
      )}
    </NavLink>
  )
}
