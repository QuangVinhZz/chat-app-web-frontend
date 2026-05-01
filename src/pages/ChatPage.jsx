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
  X,
  ChevronDown,
  Ban,
  ShieldOff,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Image as ImageIcon,
  Film,
  Link as LinkIcon,
  Pin,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { getInitials } from '../utils/format'
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
import { useCall } from '../contexts/CallContext'
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getConversationIsOnline,
  getMemberRole,
} from '../utils/conversation'
import { ApiError } from '../services/apiClient'
import GroupInfoDialog from '../components/GroupInfoDialog'
import ForwardMessageDialog from '../components/ForwardMessageDialog'
import MessageRow from '../components/chat/MessageRow'
import MediaLightbox from '../components/chat/MediaLightbox'
import BlockNotice from '../components/chat/BlockNotice'
import TypingDots from '../components/chat/TypingDots'
import AttachmentChip from '../components/chat/AttachmentChip'
import MessageDetailDialog from '../components/chat/MessageDetailDialog'
import PinnedBanner from '../components/chat/PinnedBanner'
import VoiceRecorder from '../components/chat/VoiceRecorder'
import ConversationInfoPanel from '../components/ConversationInfoPanel'

const EMOJI_LIST = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '👏', '😢']

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
  const { startCall, startGroupCall } = useCall()

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
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Forward dialog
  const [forwardingMessage, setForwardingMessage] = useState(null)

  // Message detail dialog
  const [detailMessage, setDetailMessage] = useState(null)

  // Multi-select
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState(new Set())

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
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
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

  // Patch a message in state (used by pin/star optimistic updates)
  const handleMessageUpdated = (updatedMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m))
    )
  }

  // Multi-select
  const handleSelectMultiple = (message) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true)
      setSelectedMessages(new Set([message.id]))
    } else {
      setSelectedMessages((prev) => {
        const next = new Set(prev)
        if (next.has(message.id)) next.delete(message.id)
        else next.add(message.id)
        return next
      })
    }
  }

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false)
    setSelectedMessages(new Set())
  }

  const handleDeleteSelectedForMe = async () => {
    if (!confirm(`Xóa ${selectedMessages.size} tin nhắn ở phía bạn?`)) return
    for (const id of selectedMessages) {
      try { await messageService.deleteForMe(id) } catch {}
    }
    setMessages((prev) => prev.filter((m) => !selectedMessages.has(m.id)))
    handleCancelMultiSelect()
  }

  const handleDeleteHistory = async () => {
    if (!confirm('Xóa toàn bộ lịch sử trò chuyện ở phía bạn?')) return
    try {
      for (const msg of messages) {
        await messageService.deleteForMe(msg.id).catch(() => {})
      }
      setMessages([])
      setShowInfoPanel(false)
    } catch (err) {
      console.error('Delete history failed', err)
    }
  }

  // Gửi voice message sau khi upload xong
  const handleVoiceSend = async (attachment) => {
    if (!attachment) return
    let targetConvId = conversationId
    if (isDraft) {
      const created = await conversationService.createDirect(draftUserId)
      if (!created) return
      targetConvId = created.id
      upsertConversation(created)
      setConversation(created)
      navigate(`/chat/${created.id}`, { replace: true })
    }
    try {
      const message = await messageService.send(targetConvId, {
        attachmentIds: [attachment.id],
      })
      if (message) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        )
        setAutoScroll(true)
      }
    } catch (err) {
      console.error('Voice send failed', err)
    }
  }

  const handleToggleReaction = async (message, emoji, action) => {
    const myUserId = currentUser?.id
    
    // Default action to toggle for backward compatibility if action is not provided
    if (!action) {
       const mine = (message.reactions ?? []).some((r) => r.userId === myUserId && r.emoji === emoji);
       action = mine ? 'remove' : 'add';
    }

    if (action === 'add') {
      const newReaction = { id: Date.now().toString() + Math.random(), userId: myUserId, emoji };
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m
          const base = m.reactions ?? []
          return { ...m, reactions: [...base, newReaction] }
        })
      )
      try {
        await messageService.react(message.id, emoji)
      } catch (err) {
        console.error('Reaction Add failed', err)
        setMessages((prev) => prev.map((m) => {
          if (m.id !== message.id) return m
          return { ...m, reactions: (m.reactions ?? []).filter(r => r.id !== newReaction.id) }
        }))
      }
    } else if (action === 'remove') {
      const myReactions = (message.reactions ?? []).filter(r => r.userId === myUserId && r.emoji === emoji);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m
          const base = m.reactions ?? []
          return {
            ...m,
            reactions: base.filter((r) => !(r.userId === myUserId && r.emoji === emoji)),
          }
        })
      )
      try {
        await messageService.unreact(message.id, emoji)
      } catch (err) {
        console.error('Reaction Remove failed', err)
        setMessages((prev) => prev.map((m) => {
          if (m.id !== message.id) return m
          return { ...m, reactions: [...(m.reactions ?? []), ...myReactions] }
        }))
      }
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
    <div className="flex-1 flex flex-row h-full overflow-hidden">
    {/* ── Chat column ── */}
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Chat Header */}
      <header className="h-16 px-4 pl-16 md:pl-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0">
          {conversation?.type === 'group' ? (
            displayAvatar ? (
              <Avatar className="h-10 w-10 rounded-lg shrink-0">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Hash className="w-6 h-6 text-primary" />
              </div>
            )
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
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            disabled={conversation?.type === 'direct' && !isOnlineDirect}
            onClick={() => {
               if (conversation?.type === 'group') {
                 startGroupCall(conversationId, 'audio', displayName);
                 messageService.send(conversationId, { content: '[GROUP_CALL:STARTED]' }).catch(console.error);
               } else if (otherUser?.id) {
                 startCall(otherUser.id, 'audio', conversationId, {
                   name: otherUser.name,
                   avatar: otherUser.avatarUrl
                 });
               }
            }}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            disabled={conversation?.type === 'direct' && !isOnlineDirect}
            onClick={() => {
               if (conversation?.type === 'group') {
                 startGroupCall(conversationId, 'video', displayName);
                 messageService.send(conversationId, { content: '[GROUP_CALL:STARTED]' }).catch(console.error);
               } else if (otherUser?.id) {
                 startCall(otherUser.id, 'video', conversationId, {
                   name: otherUser.name,
                   avatar: otherUser.avatarUrl
                 });
               }
            }}
          >
            <VideoIcon className="w-5 h-5" />
          </Button>
          {/* Nút ⋮ mở ConversationInfoPanel */}
          {conversation && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => setShowInfoPanel((v) => !v)}
              title="Thông tin hội thoại"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Pinned messages banner */}
      {(() => {
        const pinned = messages.filter((m) => m.isPinned)
        if (pinned.length === 0) return null
        const latest = pinned[pinned.length - 1]
        return (
          <PinnedBanner
            pinned={pinned}
            latest={latest}
            onScrollTo={(msg) => {
              const el = document.getElementById(`msg-${msg.id}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            onUnpin={(msg) => handleMessageUpdated({ ...msg, isPinned: false, pinnedBy: null, pinnedAt: null })}
          />
        )
      })()}

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
            onViewDetail={setDetailMessage}
            onSelectMultiple={handleSelectMultiple}
            onMessageUpdated={handleMessageUpdated}
            isSelected={selectedMessages.has(message.id)}
            isMultiSelectMode={isMultiSelectMode}
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
        {/* Reply preview above composer */}
        {replyingTo && (
          <div className="px-3 pt-2 pb-2 border-b">
            <div className="flex items-start gap-3 rounded-lg bg-muted/60 px-3 py-2 border-l-4 border-primary">
              <Reply className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">
                  Replying to {replyingTo.sender?.name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {replyingTo.isRecalled
                    ? '[Message recalled]'
                    : replyingTo.content ||
                      ((replyingTo.attachments?.length ?? 0) > 0
                        ? '📎 Attachment'
                        : '')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Cancel reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
          {/* Hidden Pickers */}
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFilePicked}
          />
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={handleFilePicked}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilePicked}
          />

          <div className="flex bg-muted/30 rounded-full px-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground w-8 h-8 rounded-full"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Attach Images"
            >
              <ImageIcon className="w-4 h-4 text-blue-500" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground w-8 h-8 rounded-full"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              title="Attach Videos"
            >
              <Film className="w-4 h-4 text-red-500" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground w-8 h-8 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Attach Files"
            >
              {uploading ? <Spinner size="sm" /> : <Paperclip className="w-4 h-4" />}
            </Button>
          </div>

          <div className="relative flex-1 group">
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

          {/* Voice recorder — chỉ hiện khi không có text */}
          {!newMessage.trim() && pendingAttachments.length === 0 && !isBlocked && (
            <VoiceRecorder
              onSend={handleVoiceSend}
              disabled={sending}
            />
          )}
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

      {/* Message detail dialog */}
      {detailMessage && (
        <MessageDetailDialog
          message={detailMessage}
          onClose={() => setDetailMessage(null)}
        />
      )}

    </div>{/* end chat column */}

    {/* Info panel column */}
    <ConversationInfoPanel
      open={showInfoPanel}
      onClose={() => setShowInfoPanel(false)}
      conversation={conversation}
      messages={messages}
      currentUserId={currentUser?.id}
      onDeleteHistory={handleDeleteHistory}
      onReport={() => { setShowInfoPanel(false) }}
      onOpenGroupInfo={() => {
        setShowInfoPanel(false)
        setShowGroupInfo(true)
      }}
      meRole={myRole}
    />

    {/* Multi-select toolbar */}
    {isMultiSelectMode && (
      <div className="fixed bottom-0 left-72 right-0 z-40 bg-card border-t border-border px-4 py-3 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium">Đã chọn {selectedMessages.size} tin nhắn</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancelMultiSelect}>Huỷ</Button>
          <Button variant="destructive" size="sm" disabled={selectedMessages.size === 0} onClick={handleDeleteSelectedForMe}>
            Xóa ở phía tôi
          </Button>
        </div>
      </div>
    )}
    </div>
  )
}
