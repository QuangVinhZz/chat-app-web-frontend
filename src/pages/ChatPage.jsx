import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  VideoIcon,
  Info,
  Bot,
  Hash,
  Reply,
  RotateCcw,
  Trash2,
  X,
  FileText,
  Download,
  ChevronDown,
  Forward,
  Play,
  Ban,
  ShieldOff,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/Popover'
import { Spinner } from '../components/ui/Spinner'
import { conversationService } from '../services/conversationService'
import { messageService } from '../services/messageService'
import { userService } from '../services/userService'
import { friendService } from '../services/friendService'
import { socketService } from '../services/socketService'
import { useUserStore } from '../stores/userStore'
import { useConversationsStore } from '../stores/conversationsStore'
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationIsOnline,
  getMemberRole,
} from '../utils/conversation'
import { ApiError } from '../services/apiClient'
import GroupInfoDialog from '../components/GroupInfoDialog'
import ForwardMessageDialog from '../components/ForwardMessageDialog'

const EMOJI_LIST = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '👏', '😢']
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

const getInitials = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export default function ChatPage() {
  // Two route patterns share this component:
  //   /chat/:conversationId  → existing conversation
  //   /chat/new/:userId      → draft chat with a friend (no server conv yet)
  const { conversationId, userId: draftUserId } = useParams()
  const isDraft = Boolean(draftUserId)

  const navigate = useNavigate()
  const currentUser = useUserStore((s) => s.user)
  const upsertConversation = useConversationsStore((s) => s.upsert)
  const removeConversation = useConversationsStore((s) => s.remove)
  const setActiveConversation = useConversationsStore((s) => s.setActive)

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([]) // chronological asc
  const [loading, setLoading] = useState(Boolean(conversationId) || isDraft)
  const [loadError, setLoadError] = useState('')

  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [uploading, setUploading] = useState(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Forward dialog
  const [forwardingMessage, setForwardingMessage] = useState(null)

  // Media lightbox (click on image / video in a bubble to view large)
  const [lightboxAttachment, setLightboxAttachment] = useState(null)

  // Infinite scroll
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Read receipts — mirror of conversation.members[].lastReadAt, kept in
  // a dedicated map for fast lookups during render. Key is user UUID.
  const [readByUser, setReadByUser] = useState({})

  // Typing indicators — set of user UUIDs currently typing in this
  // conversation. Each entry has an auto-expire timer.
  const [typingUsers, setTypingUsers] = useState({}) // { [userUuid]: name }
  const typingTimersRef = useRef({})
  const typingEmitStateRef = useRef({ lastEmitAt: 0, stopTimer: null })

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    // Prefer setting scrollTop directly on the container so it still
    // works even if `messagesEndRef` hasn't been mounted yet (e.g. the
    // first render after navigating in). Fall back to scrollIntoView
    // for the animated case.
    const el = messagesContainerRef.current
    if (el) {
      if (behavior === 'auto') {
        el.scrollTop = el.scrollHeight
        return
      }
      el.scrollTo({ top: el.scrollHeight, behavior })
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // ------------------------------------------------------------------
  // Load conversation + messages (or draft user profile)
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setLoadError('')

    if (!conversationId && !isDraft) {
      setConversation(null)
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setMessages([])
    setReplyingTo(null)
    setPendingAttachments([])
    setHasMore(false)
    setReadByUser({})
    setTypingUsers({})

    const loadReal = async () => {
      try {
        const conv = await conversationService.get(conversationId)
        if (cancelled) return
        setConversation(conv)
        upsertConversation(conv)

        // Seed read receipts from member.lastReadAt.
        const seed = {}
        for (const m of conv.members ?? []) {
          if (m.user?.id && m.lastReadAt) seed[m.user.id] = m.lastReadAt
        }
        setReadByUser(seed)

        const PAGE = 30
        const msgs = await messageService.list(conversationId, { limit: PAGE })
        if (cancelled) return
        // Backend returns newest-first; render oldest-first.
        setMessages(msgs.slice().reverse())
        setHasMore(msgs.length >= PAGE)
        setAutoScroll(true)
        // Jump to bottom after the browser has laid out the new DOM.
        // Double rAF is the cheap-and-cheerful way to wait for React's
        // next commit + paint so we always measure the final height.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToBottom('auto'))
        })

        // Fire-and-forget: tell the server we've seen the latest.
        const lastUuid = msgs[0]?.id
        conversationService
          .markRead(conversationId, lastUuid)
          .catch(() => {})
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError ? err.message : 'Failed to load conversation.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const loadDraft = async () => {
      try {
        const other = await userService.getPublicProfile(draftUserId)
        if (cancelled) return
        if (!other) {
          setLoadError('User not found.')
          return
        }
        setConversation({
          id: null,
          type: 'direct',
          name: null,
          avatarUrl: null,
          lastMessageAt: null,
          lastMessagePreview: null,
          members: [
            { role: 'member', user: currentUser },
            { role: 'member', user: other },
          ],
          __draft: true,
          __draftUserId: draftUserId,
        })
        setMessages([])
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError ? err.message : 'Failed to load user.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (isDraft) loadDraft()
    else loadReal()

    return () => {
      cancelled = true
    }
  }, [conversationId, isDraft, draftUserId, upsertConversation, currentUser, scrollToBottom])

  // ------------------------------------------------------------------
  // Realtime — append / patch messages from socket events
  // ------------------------------------------------------------------
  useEffect(() => {
    const convId = conversation?.id
    if (!convId) return

    const offs = [
      socketService.on('message:new', (msg) => {
        if (!msg || msg.conversationId !== convId) return
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        // Incoming message while the tab is visible → auto mark as read.
        if (
          msg.senderId !== currentUser?.id &&
          typeof document !== 'undefined' &&
          !document.hidden
        ) {
          conversationService.markRead(convId, msg.id).catch(() => {})
        }
      }),
      socketService.on('message:recalled', ({ id }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  isRecalled: true,
                  content: null,
                  reactions: [],
                  attachments: [],
                }
              : m
          )
        )
      }),
      socketService.on('message:reaction:added', ({ messageId, userId, emoji }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const existing = m.reactions ?? []
            if (existing.some((r) => r.userId === userId && r.emoji === emoji)) {
              return m
            }
            return { ...m, reactions: [...existing, { userId, emoji }] }
          })
        )
      }),
      socketService.on('message:reaction:removed', ({ messageId, userId, emoji }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            return {
              ...m,
              reactions: (m.reactions ?? []).filter(
                (r) => !(r.userId === userId && r.emoji === emoji)
              ),
            }
          })
        )
      }),
      socketService.on('conversation:read', (payload) => {
        if (!payload || payload.conversationId !== convId) return
        if (!payload.userId || !payload.lastReadAt) return
        setReadByUser((prev) => ({
          ...prev,
          [payload.userId]: payload.lastReadAt,
        }))
      }),
      socketService.on('typing:start', (payload) => {
        if (!payload || payload.conversationId !== convId) return
        if (!payload.userId || payload.userId === currentUser?.id) return
        const name =
          conversation?.members?.find((m) => m.user?.id === payload.userId)?.user
            ?.name || 'Someone'
        setTypingUsers((prev) => ({ ...prev, [payload.userId]: name }))
        // Auto-expire after 6s if no explicit stop is received.
        const timers = typingTimersRef.current
        if (timers[payload.userId]) clearTimeout(timers[payload.userId])
        timers[payload.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev }
            delete next[payload.userId]
            return next
          })
          delete timers[payload.userId]
        }, 6000)
      }),
      socketService.on('typing:stop', (payload) => {
        if (!payload || payload.conversationId !== convId) return
        if (!payload.userId) return
        const timers = typingTimersRef.current
        if (timers[payload.userId]) {
          clearTimeout(timers[payload.userId])
          delete timers[payload.userId]
        }
        setTypingUsers((prev) => {
          const next = { ...prev }
          delete next[payload.userId]
          return next
        })
      }),
    ]
    return () => {
      offs.forEach((off) => off?.())
      // Clean up any pending typing timers when switching conversations.
      for (const key of Object.keys(typingTimersRef.current)) {
        clearTimeout(typingTimersRef.current[key])
        delete typingTimersRef.current[key]
      }
    }
  }, [conversation?.id, conversation?.members, currentUser?.id])

  // Auto-scroll to bottom on new messages (unless user scrolled up).
  useEffect(() => {
    if (autoScroll) scrollToBottom('smooth')
  }, [messages, autoScroll, scrollToBottom])

  // Re-pin to the bottom as media inside the bubbles finishes loading.
  // Without this the initial scroll jumps to the current `scrollHeight`
  // BEFORE images/videos have reported their real height, so the final
  // viewport ends up a few hundred pixels above the real bottom.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const pin = () => {
      if (!autoScroll) return
      el.scrollTop = el.scrollHeight
    }
    const imgs = el.querySelectorAll('img')
    const vids = el.querySelectorAll('video')
    const cleanups = []
    for (const img of imgs) {
      if (img.complete) continue
      img.addEventListener('load', pin)
      img.addEventListener('error', pin)
      cleanups.push(() => {
        img.removeEventListener('load', pin)
        img.removeEventListener('error', pin)
      })
    }
    for (const v of vids) {
      v.addEventListener('loadedmetadata', pin)
      cleanups.push(() => v.removeEventListener('loadedmetadata', pin))
    }
    return () => cleanups.forEach((fn) => fn())
  }, [messages, autoScroll])

  // Tell the conversations store which conversation is currently open.
  // The store uses this to skip unread-count increments for incoming
  // messages that belong to the conversation the user is already looking
  // at, and to instantly clear the sidebar badge for this row.
  useEffect(() => {
    if (!conversationId) {
      setActiveConversation(null)
      return
    }
    setActiveConversation(conversationId)
    return () => setActiveConversation(null)
  }, [conversationId, setActiveConversation])

  // If the conversation we're currently viewing gets disbanded or we
  // get kicked out of it, fall back to the chat landing page. The store
  // also removes it from the sidebar list via its own subscriber.
  useEffect(() => {
    if (!conversationId) return
    const off = socketService.on('conversation:removed', (payload) => {
      if (payload?.conversationId === conversationId) {
        navigate('/chat', { replace: true })
      }
    })
    return () => off?.()
  }, [conversationId, navigate])

  // Any relationship change with the other participant → refetch the
  // current conversation so its block + friendship flags update
  // immediately in the header menu and composer banner.
  useEffect(() => {
    if (!conversationId) return
    const refetchConv = async () => {
      try {
        const fresh = await conversationService.get(conversationId)
        if (fresh) setConversation(fresh)
      } catch {
        // ignore — the sidebar store will still refresh
      }
    }
    const offs = [
      socketService.on('friend:blocked', refetchConv),
      socketService.on('friend:blocked-by', refetchConv),
      socketService.on('friend:unblocked', refetchConv),
      socketService.on('friend:unblocked-by', refetchConv),
      socketService.on('friend:request:sent', refetchConv),
      socketService.on('friend:request:received', refetchConv),
      socketService.on('friend:request:accepted', refetchConv),
      socketService.on('friend:request:rejected', refetchConv),
      socketService.on('friend:request:cancelled', refetchConv),
      socketService.on('friend:added', refetchConv),
      socketService.on('friend:unfriended', refetchConv),
    ]
    return () => offs.forEach((off) => off?.())
  }, [conversationId])

  // Re-send a markRead whenever the tab becomes visible while a real
  // conversation is open. Covers the case where a message arrived while
  // the user was on another tab.
  useEffect(() => {
    if (!conversationId || isDraft) return
    const onVisibility = () => {
      if (document.hidden) return
      const latest = messages[messages.length - 1]
      conversationService.markRead(conversationId, latest?.id).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [conversationId, isDraft, messages])

  // Load older messages when the user scrolls near the top.
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !conversationId) return
    const oldest = messages[0]
    if (!oldest?.id) return
    const scrollEl = messagesContainerRef.current
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0
    const prevScrollTop = scrollEl?.scrollTop ?? 0

    setLoadingOlder(true)
    try {
      const PAGE = 30
      const older = await messageService.list(conversationId, {
        before: oldest.id,
        limit: PAGE,
      })
      // Backend returns newest-first; prepend in chronological order.
      setMessages((prev) => [...older.slice().reverse(), ...prev])
      setHasMore(older.length >= PAGE)

      // Restore the scroll offset so the viewport doesn't jump.
      setTimeout(() => {
        const el = messagesContainerRef.current
        if (!el) return
        const diff = el.scrollHeight - prevScrollHeight
        el.scrollTop = prevScrollTop + diff
      }, 0)
    } catch (err) {
      console.error('Load older failed', err)
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, messages, hasMore, loadingOlder])

  // Track whether the user is near the bottom; also trigger older loads.
  const handleScroll = (e) => {
    const el = e.currentTarget
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setAutoScroll(near)
    if (el.scrollTop < 120 && hasMore && !loadingOlder) {
      loadOlder()
    }
  }

  // ------------------------------------------------------------------
  // Send
  // ------------------------------------------------------------------
  const handleSendMessage = async (e) => {
    e?.preventDefault?.()
    if (isBlocked) return
    const content = newMessage.trim()
    const hasText = Boolean(content)
    const hasAttachments = pendingAttachments.length > 0
    if (!hasText && !hasAttachments) return
    if (sending) return

    setSending(true)
    try {
      let targetConvId = conversationId

      // Draft → materialise conversation lazily on first send.
      if (isDraft) {
        const created = await conversationService.createDirect(draftUserId)
        if (!created) throw new Error('Failed to create conversation.')
        targetConvId = created.id
        upsertConversation(created)
        setConversation(created)
        navigate(`/chat/${created.id}`, { replace: true })
      }

      const message = await messageService.send(targetConvId, {
        content: hasText ? content : undefined,
        replyToMessageId: replyingTo?.id,
        attachmentIds: hasAttachments
          ? pendingAttachments.map((a) => a.id)
          : undefined,
      })

      // Append locally if the socket event hasn't beaten us to it.
      if (message) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        )
      }

      setNewMessage('')
      setReplyingTo(null)
      setPendingAttachments([])
      setAutoScroll(true)
      emitTypingStop()
    } catch (err) {
      console.error('Send failed', err)
      // Restore the text so the user can retry.
      if (hasText) setNewMessage(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ------------------------------------------------------------------
  // Message actions
  // ------------------------------------------------------------------
  const handleRecall = async (message) => {
    if (!confirm('Recall this message for everyone?')) return
    try {
      await messageService.recall(message.id)
      // Optimistic patch — socket event will confirm.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                isRecalled: true,
                content: null,
                reactions: [],
                attachments: [],
              }
            : m
        )
      )
    } catch (err) {
      console.error('Recall failed', err)
    }
  }

  const handleDeleteForMe = async (message) => {
    if (!confirm('Delete this message from your view?')) return
    try {
      await messageService.deleteForMe(message.id)
      setMessages((prev) => prev.filter((m) => m.id !== message.id))
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleToggleReaction = async (message, emoji) => {
    const myUserId = currentUser?.id
    const mine = (message.reactions ?? []).some(
      (r) => r.userId === myUserId && r.emoji === emoji
    )
    // Optimistic patch
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== message.id) return m
        const base = m.reactions ?? []
        if (mine) {
          return {
            ...m,
            reactions: base.filter(
              (r) => !(r.userId === myUserId && r.emoji === emoji)
            ),
          }
        }
        return {
          ...m,
          reactions: [...base, { userId: myUserId, emoji }],
        }
      })
    )
    try {
      if (mine) await messageService.unreact(message.id, emoji)
      else await messageService.react(message.id, emoji)
    } catch (err) {
      console.error('Reaction failed', err)
      // Revert on error
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m
          const base = m.reactions ?? []
          if (mine) {
            if (base.some((r) => r.userId === myUserId && r.emoji === emoji)) {
              return m
            }
            return { ...m, reactions: [...base, { userId: myUserId, emoji }] }
          }
          return {
            ...m,
            reactions: base.filter(
              (r) => !(r.userId === myUserId && r.emoji === emoji)
            ),
          }
        })
      )
    }
  }

  // ------------------------------------------------------------------
  // Attachments
  // ------------------------------------------------------------------
  const handleFilePicked = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const att = await messageService.uploadAttachment(file)
        if (att) setPendingAttachments((prev) => [...prev, att])
      }
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const removePendingAttachment = (attachmentId) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------
  const myRole = getMemberRole(conversation, currentUser?.id)
  const displayName = getConversationDisplayName(conversation, currentUser?.id)
  const displayAvatar = getConversationAvatarUrl(conversation, currentUser?.id)
  const isOnlineDirect = getConversationIsOnline(conversation, currentUser?.id)
  const blockedByMe = Boolean(conversation?.blockedByMe)
  const blockedByOther = Boolean(conversation?.blockedByOther)
  const isBlocked = blockedByMe || blockedByOther

  // Other participant in a direct conversation (null for groups / drafts).
  const otherMember =
    conversation?.type === 'direct'
      ? conversation?.members?.find((m) => m.user?.id !== currentUser?.id)
      : null
  const otherUser = otherMember?.user ?? null

  // Friendship flags come from the backend on direct conversations.
  const isFriend = Boolean(conversation?.isFriend)
  const friendRequestSent = Boolean(conversation?.friendRequestSent)
  const friendRequestReceived = Boolean(conversation?.friendRequestReceived)
  const friendshipId = conversation?.friendshipId ?? null

  // Lookup sender info & reply parent within the current message list.
  const messageById = new Map(messages.map((m) => [m.id, m]))

  // For each OTHER member, pre-compute which is the latest OWN message
  // they've read. That's where we'll render their avatar ("seen" dot).
  // Key: messageId → array of readers (other members).
  const readersByMessage = useMemo(() => {
    const map = new Map()
    if (!conversation?.members) return map
    const others = conversation.members.filter(
      (m) => m.user?.id && m.user.id !== currentUser?.id
    )
    for (const memberRow of others) {
      const readerId = memberRow.user.id
      const readAtIso = readByUser[readerId]
      if (!readAtIso) continue
      const readAt = new Date(readAtIso).getTime()
      // Find the latest own message with createdAt <= readAt.
      let targetId = null
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]
        if (m.senderId !== currentUser?.id) continue
        if (m.createdAt && new Date(m.createdAt).getTime() <= readAt) {
          targetId = m.id
          break
        }
      }
      if (targetId) {
        const list = map.get(targetId) ?? []
        list.push(memberRow.user)
        map.set(targetId, list)
      }
    }
    return map
  }, [conversation?.members, readByUser, messages, currentUser?.id])

  const typingUserNames = Object.values(typingUsers)

  const handleConversationUpdated = (updated) => {
    if (!updated) return
    setConversation(updated)
    upsertConversation(updated)
  }
  const handleConversationRemoved = (id) => {
    removeConversation(id)
    navigate('/chat')
  }

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  // ------------------------------------------------------------------
  // Direct-chat header actions (block, unblock, add / accept / cancel
  // friend request). Optimistically patch the local conversation so
  // the menu + composer respond instantly; realtime events will
  // confirm via the refetch-on-friend effect below.
  // ------------------------------------------------------------------
  const [headerActionBusy, setHeaderActionBusy] = useState(false)
  const [headerActionError, setHeaderActionError] = useState('')

  const runHeaderAction = async (fn, patch) => {
    setHeaderActionBusy(true)
    setHeaderActionError('')
    try {
      await fn()
      if (patch) {
        setConversation((prev) => (prev ? { ...prev, ...patch } : prev))
      }
    } catch (err) {
      setHeaderActionError(err?.message || 'Action failed.')
    } finally {
      setHeaderActionBusy(false)
    }
  }

  const handleAddFriend = () => {
    if (!otherUser?.id) return
    return runHeaderAction(
      () => friendService.sendRequest(otherUser.id),
      { friendRequestSent: true }
    )
  }

  const handleAcceptFriendRequest = () => {
    if (!friendshipId) return
    return runHeaderAction(
      () => friendService.accept(friendshipId),
      { friendRequestReceived: false, isFriend: true }
    )
  }

  const handleCancelFriendRequest = () => {
    if (!friendshipId) return
    return runHeaderAction(
      () => friendService.cancel(friendshipId),
      {
        friendRequestSent: false,
        friendshipId: null,
      }
    )
  }

  const handleBlockOther = () => {
    if (!otherUser?.id) return
    if (!confirm(`Block ${otherUser.name || 'this user'}?`)) return
    return runHeaderAction(
      () => friendService.block(otherUser.id),
      {
        blockedByMe: true,
        // Blocking wipes the friendship on the backend too.
        isFriend: false,
        friendRequestSent: false,
        friendRequestReceived: false,
        friendshipId: null,
      }
    )
  }

  const handleUnblockOther = () => {
    if (!otherUser?.id) return
    return runHeaderAction(
      () => friendService.unblock(otherUser.id),
      { blockedByMe: false }
    )
  }

  // ------------------------------------------------------------------
  // Typing indicator — emit with built-in throttle + stop timeout.
  // ------------------------------------------------------------------
  const emitTypingStart = useCallback(() => {
    const convId = conversation?.id
    if (!convId || isDraft) return
    const state = typingEmitStateRef.current
    const now = Date.now()
    // Throttle to at most one `start` every 3s.
    if (now - state.lastEmitAt > 3000) {
      socketService.emitTyping(convId, true)
      state.lastEmitAt = now
    }
    // Reset the 5s "stopped" timer.
    if (state.stopTimer) clearTimeout(state.stopTimer)
    state.stopTimer = setTimeout(() => {
      socketService.emitTyping(convId, false)
      state.lastEmitAt = 0
      state.stopTimer = null
    }, 5000)
  }, [conversation?.id, isDraft])

  const emitTypingStop = useCallback(() => {
    const convId = conversation?.id
    if (!convId || isDraft) return
    const state = typingEmitStateRef.current
    if (state.stopTimer) {
      clearTimeout(state.stopTimer)
      state.stopTimer = null
    }
    if (state.lastEmitAt > 0) {
      socketService.emitTyping(convId, false)
      state.lastEmitAt = 0
    }
  }, [conversation?.id, isDraft])

  // Ensure we always stop typing when unmounting or switching conversation.
  useEffect(() => emitTypingStop, [emitTypingStop])

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (e.target.value) emitTypingStart()
    else emitTypingStop()
  }

  // ------------------------------------------------------------------
  // Early returns
  // ------------------------------------------------------------------
  if (!conversationId && !isDraft) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to ChatApp</h2>
          <p className="text-muted-foreground">
            Select a conversation or click "New conversation" to get started.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Info className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Unable to load conversation</h2>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" onClick={() => navigate('/chat')}>
            Back to chat
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <header className="h-16 px-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {conversation?.type === 'group' ? (
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Hash className="w-6 h-6 text-primary" />
            </div>
          ) : (
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              {isOnlineDirect !== undefined && (
                <span
                  className={cn(
                    'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
                    isOnlineDirect ? 'bg-online' : 'bg-muted-foreground'
                  )}
                />
              )}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{displayName}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {conversation?.type === 'group'
                ? `${conversation?.members?.length ?? 0} members`
                : isOnlineDirect
                  ? 'Online'
                  : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <VideoIcon className="w-5 h-5" />
          </Button>
          {conversation?.type === 'group' && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => setShowGroupInfo(true)}
              title="Group info"
            >
              <Info className="w-5 h-5" />
            </Button>
          )}
          {conversation?.type === 'direct' && otherUser ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  title="More"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="end">
                {headerActionError && (
                  <p className="px-3 py-2 text-xs text-destructive">
                    {headerActionError}
                  </p>
                )}

                {/* Friendship actions */}
                {isFriend && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Friends
                  </div>
                )}
                {!isFriend &&
                  !friendRequestSent &&
                  !friendRequestReceived &&
                  !blockedByMe && (
                    <button
                      type="button"
                      onClick={handleAddFriend}
                      disabled={headerActionBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-60"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add friend
                    </button>
                  )}
                {friendRequestSent && (
                  <button
                    type="button"
                    onClick={handleCancelFriendRequest}
                    disabled={headerActionBusy}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-60"
                  >
                    <Clock className="w-4 h-4" />
                    Cancel friend request
                  </button>
                )}
                {friendRequestReceived && (
                  <>
                    <button
                      type="button"
                      onClick={handleAcceptFriendRequest}
                      disabled={headerActionBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-60"
                    >
                      <UserCheck className="w-4 h-4" />
                      Accept friend request
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelFriendRequest}
                      disabled={headerActionBusy}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-60"
                    >
                      <UserX className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}

                <div className="my-1 h-px bg-border" />

                {/* Block / unblock */}
                {blockedByMe ? (
                  <button
                    type="button"
                    onClick={handleUnblockOther}
                    disabled={headerActionBusy}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-60"
                  >
                    <ShieldOff className="w-4 h-4" />
                    Unblock
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBlockOther}
                    disabled={headerActionBusy}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted text-destructive disabled:opacity-60"
                  >
                    <Ban className="w-4 h-4" />
                    Block
                  </button>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages — single scrollable container so scrollIntoView,
          onScroll and infinite-scroll detection all agree on the same
          element. */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative p-4 space-y-3"
      >
        {isDraft && messages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Send a message to start chatting with {displayName}.
          </div>
        )}
        {!isDraft && messages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages yet — say hi 👋
          </div>
        )}
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}
        {messages.map((message, index) => (
          <MessageRow
            key={message.id}
            message={message}
            previous={messages[index - 1]}
            currentUserId={currentUser?.id}
            replyTarget={
              message.replyToMessageId
                ? messageById.get(message.replyToMessageId)
                : null
            }
            readers={readersByMessage.get(message.id)}
            onReply={setReplyingTo}
            onRecall={handleRecall}
            onDeleteForMe={handleDeleteForMe}
            onReact={handleToggleReaction}
            onForward={setForwardingMessage}
            onOpenLightbox={setLightboxAttachment}
          />
        ))}
        <div ref={messagesEndRef} />

      </div>

      {/* Typing indicator */}
      {typingUserNames.length > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground italic border-t bg-card">
          <span className="inline-flex items-center gap-1">
            <TypingDots />
            {typingUserNames.length === 1
              ? `${typingUserNames[0]} is typing…`
              : `${typingUserNames.slice(0, 2).join(', ')}${typingUserNames.length > 2 ? ` and ${typingUserNames.length - 2} others` : ''} are typing…`}
          </span>
        </div>
      )}

      {/* Composer — replaced by a notice when this conversation is blocked. */}
      {isBlocked ? (
        <BlockNotice
          blockedByMe={blockedByMe}
          displayName={displayName}
          otherUserId={
            conversation?.members?.find((m) => m.user?.id !== currentUser?.id)
              ?.user?.id
          }
          onUnblocked={async () => {
            // Optimistically clear the block flags — realtime will
            // confirm via `friend:unblocked` and refetch the conv.
            setConversation((prev) =>
              prev ? { ...prev, blockedByMe: false } : prev
            )
          }}
        />
      ) : (
      <div className="border-t bg-card">
        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 pt-3 pb-1 flex items-start gap-3 border-b">
            <div className="w-1 self-stretch bg-primary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">
                Replying to {replyingTo.sender?.name || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyingTo.isRecalled
                  ? '[Message recalled]'
                  : replyingTo.content || '[attachment]'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 border-b">
            {pendingAttachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachment={att}
                onRemove={() => removePendingAttachment(att.id)}
              />
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="p-3 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilePicked}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file"
          >
            {uploading ? <Spinner size="sm" /> : <Paperclip className="w-5 h-5" />}
          </Button>

          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onBlur={emitTypingStop}
              placeholder="Type a message..."
              className="pr-10"
              disabled={sending}
            />
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={
              sending ||
              (!newMessage.trim() && pendingAttachments.length === 0)
            }
            className="shrink-0"
          >
            {sending ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
      )}

      {conversation?.type === 'group' && (
        <GroupInfoDialog
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          conversation={conversation}
          meRole={myRole}
          meId={currentUser?.id}
          onConversationUpdated={handleConversationUpdated}
          onConversationRemoved={handleConversationRemoved}
        />
      )}

      <ForwardMessageDialog
        open={Boolean(forwardingMessage)}
        onOpenChange={(open) => !open && setForwardingMessage(null)}
        message={forwardingMessage}
        currentConversationId={conversation?.id}
      />

      <MediaLightbox
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />
    </div>
  )
}

/* ------------------------- sub-components ------------------------- */

function MessageRow({
  message,
  previous,
  currentUserId,
  replyTarget,
  readers,
  onReply,
  onRecall,
  onDeleteForMe,
  onReact,
  onForward,
  onOpenLightbox,
}) {
  const isOwn = message.senderId === currentUserId
  const showAvatar =
    !isOwn && (!previous || previous.senderId !== message.senderId)
  const showName =
    !isOwn && (!previous || previous.senderId !== message.senderId)

  const groupedReactions = groupReactions(message.reactions ?? [])

  return (
    <div className={cn('group flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatarUrl} alt={message.sender?.name} />
              <AvatarFallback>{getInitials(message.sender?.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {showName && (
          <p className="text-[10px] text-muted-foreground mb-0.5 ml-2">
            {message.sender?.name || 'Unknown'}
          </p>
        )}

        {/* Reply preview inside the bubble */}
        {message.replyToMessageId && (
          <div
            className={cn(
              'mb-1 px-3 py-1.5 rounded-lg border-l-2 max-w-full',
              isOwn
                ? 'bg-primary/20 border-primary-foreground/40'
                : 'bg-muted border-primary'
            )}
          >
            <p className="text-[10px] font-medium opacity-70">
              {replyTarget?.sender?.name || 'Unknown'}
            </p>
            <p className="text-xs truncate opacity-80">
              {replyTarget?.isRecalled
                ? '[Message recalled]'
                : replyTarget?.content || '[attachment]'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1">
          {isOwn && (
            <MessageHoverActions
              message={message}
              isOwn={isOwn}
              onReply={onReply}
              onRecall={onRecall}
              onDeleteForMe={onDeleteForMe}
              onReact={onReact}
              onForward={onForward}
            />
          )}

          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 relative',
              message.isRecalled
                ? 'bg-muted/50 italic text-muted-foreground'
                : isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
            )}
          >
            {message.isRecalled ? (
              <p className="text-sm">[Message recalled]</p>
            ) : (
              <MessageBody
                message={message}
                isOwn={isOwn}
                onOpenLightbox={onOpenLightbox}
              />
            )}
            <div
              className={cn(
                'text-[10px] mt-1',
                isOwn ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'
              )}
            >
              {message.createdAt && format(new Date(message.createdAt), 'HH:mm')}
            </div>
          </div>

          {!isOwn && (
            <MessageHoverActions
              message={message}
              isOwn={isOwn}
              onReply={onReply}
              onRecall={onRecall}
              onDeleteForMe={onDeleteForMe}
              onReact={onReact}
              onForward={onForward}
            />
          )}
        </div>

        {/* Reaction chips — hidden on recalled messages since the
            content is gone and reacting to "[Message recalled]" is
            meaningless. */}
        {!message.isRecalled && groupedReactions.length > 0 && (
          <div className={cn('flex gap-1 mt-1', isOwn ? 'mr-1' : 'ml-1')}>
            {groupedReactions.map(({ emoji, count, mine }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border',
                  mine ? 'bg-primary/10 border-primary/40' : 'bg-card border-border'
                )}
                title={mine ? 'Remove reaction' : 'Add reaction'}
              >
                <span>{emoji}</span>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Read receipts — stacked mini avatars of everyone whose last
            read-at reaches at least this own message. Only rendered on
            own messages, only on the latest one each reader has seen. */}
        {isOwn && readers && readers.length > 0 && (
          <div className="flex -space-x-1.5 mt-1 mr-1">
            {readers.slice(0, 4).map((u) => (
              <Avatar
                key={u.id}
                className="h-4 w-4 border border-card"
                title={`${u.name || 'Unknown'} has seen this`}
              >
                <AvatarImage src={u.avatarUrl} alt={u.name} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(u.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {readers.length > 4 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{readers.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageHoverActions({
  message,
  isOwn,
  onReply,
  onRecall,
  onDeleteForMe,
  onReact,
  onForward,
}) {
  if (message.isRecalled) return null
  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="React"
          >
            <Smile className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align={isOwn ? 'end' : 'start'}>
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className="w-8 h-8 rounded-full hover:bg-muted text-lg flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onReply(message)}
        className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        title="Reply"
      >
        <Reply className="w-4 h-4" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align={isOwn ? 'end' : 'start'}>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onForward?.(message)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted"
            >
              <Forward className="w-4 h-4" />
              Forward
            </button>
            {isOwn && (
              <button
                type="button"
                onClick={() => onRecall(message)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
                Recall
              </button>
            )}
            <button
              type="button"
              onClick={() => onDeleteForMe(message)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete for me
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MessageBody({ message, isOwn, onOpenLightbox }) {
  const attachments = message.attachments ?? []
  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <AttachmentPreview
              key={att.id}
              attachment={att}
              isOwn={isOwn}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
        </div>
      )}
      {message.content && (
        <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.content}</p>
      )}
    </div>
  )
}

function AttachmentPreview({ attachment, isOwn, onOpenLightbox }) {
  if (attachment.type === 'image') {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox?.(attachment)}
        className="block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName || 'image'}
          className="max-w-full max-h-80 object-cover"
        />
      </button>
    )
  }
  if (attachment.type === 'video') {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox?.(attachment)}
        className="relative block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary group"
      >
        <video
          src={attachment.url}
          className="max-w-full max-h-80 pointer-events-none"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
      </button>
    )
  }
  if (attachment.type === 'audio') {
    return <audio src={attachment.url} controls className="max-w-full" />
  }
  // Document fallback — styling depends on whether the bubble is
  // primary-coloured (own) or muted (incoming). On own bubbles the
  // base `bg-primary` already carries the colour, so the icon + its
  // container have to use `primary-foreground` shades instead of
  // another `bg-primary`, otherwise everything blends together.
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex items-center gap-3 p-2 pr-3 rounded-lg transition-colors min-w-[240px]',
        isOwn
          ? 'bg-primary-foreground/15 hover:bg-primary-foreground/20'
          : 'bg-background hover:bg-background/70 border border-border'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isOwn ? 'bg-primary-foreground/25' : 'bg-primary/15'
        )}
      >
        <FileText
          className={cn('w-5 h-5', isOwn ? 'text-primary-foreground' : 'text-primary')}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isOwn ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {attachment.fileName || 'Attachment'}
        </p>
        {attachment.fileSize != null && (
          <p
            className={cn(
              'text-xs',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {formatFileSize(attachment.fileSize)}
          </p>
        )}
      </div>
      <Download
        className={cn(
          'w-4 h-4 shrink-0',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}
      />
    </a>
  )
}

function AttachmentChip({ attachment, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg px-2 py-1 text-xs">
      {attachment.type === 'image' ? (
        <img
          src={attachment.url}
          alt={attachment.fileName || 'image'}
          className="w-8 h-8 rounded object-cover"
        />
      ) : (
        <FileText className="w-4 h-4 text-primary" />
      )}
      <span className="truncate max-w-30">{attachment.fileName || attachment.type}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function groupReactions(reactions) {
  const byEmoji = new Map()
  for (const r of reactions) {
    const current = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false }
    current.count += 1
    byEmoji.set(r.emoji, current)
  }
  return Array.from(byEmoji.values())
}

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" />
    </span>
  )
}

/**
 * Banner that replaces the composer when a direct conversation is
 * blocked in either direction. If *I* am the blocker, offer an
 * "Unblock" action; if I'm the blocked party, just show a notice.
 */
function BlockNotice({ blockedByMe, displayName, otherUserId, onUnblocked }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleUnblock = async () => {
    if (!otherUserId || busy) return
    setError('')
    setBusy(true)
    try {
      await friendService.unblock(otherUserId)
      await onUnblocked?.()
    } catch (err) {
      setError(err?.message || 'Failed to unblock.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t bg-card">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
          <Ban className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          {blockedByMe ? (
            <>
              <p className="text-sm font-medium">
                You have blocked {displayName || 'this user'}
              </p>
              <p className="text-xs text-muted-foreground">
                Unblock to send or receive messages again.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">You can't message this user</p>
              <p className="text-xs text-muted-foreground">
                Messages you send won't be delivered.
              </p>
            </>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        {blockedByMe && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnblock}
            disabled={busy || !otherUserId}
          >
            {busy ? (
              <Spinner size="sm" />
            ) : (
              <>
                <ShieldOff className="w-4 h-4 mr-2" />
                Unblock
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Fullscreen lightbox for image / video attachments. Renders a dark
 * overlay that dismisses on Escape, click-outside, or the X button.
 * The body scroll is locked while open.
 */
function MediaLightbox({ attachment, onClose }) {
  useEffect(() => {
    if (!attachment) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [attachment, onClose])

  if (!attachment) return null

  const isImage = attachment.type === 'image'
  const isVideo = attachment.type === 'video'
  if (!isImage && !isVideo) return null

  return (
    <div
      className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName || 'Media preview'}
    >
      {/* Top bar: filename + download + close */}
      {attachment.fileName && (
        <div
          className="absolute top-4 left-4 right-32 text-white/90 text-sm truncate pointer-events-none"
          aria-hidden="true"
        >
          {attachment.fileName}
        </div>
      )}
      <a
        href={attachment.url}
        download={attachment.fileName || true}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        aria-label="Download"
        title="Download"
      >
        <Download className="w-5 h-5" />
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        aria-label="Close"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Media container — stopPropagation so clicking the image itself
          doesn't dismiss the overlay. */}
      <div
        className="max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={attachment.url}
            alt={attachment.fileName || 'image'}
            className="max-w-[95vw] max-h-[90vh] object-contain select-none"
            draggable={false}
          />
        )}
        {isVideo && (
          <video
            src={attachment.url}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[90vh]"
          />
        )}
      </div>
    </div>
  )
}
