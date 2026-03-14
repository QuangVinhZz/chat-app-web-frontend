import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Send,
  Paperclip,
  Smile,
  Image,
  FileText,
  Video,
  MoreVertical,
  Phone,
  VideoIcon,
  Info,
  Bot,
  Hash,
  Check,
  CheckCheck,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/Avatar'
import { ScrollArea } from '../components/ui/ScrollArea'
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/Popover'
import { Spinner } from '../components/ui/Spinner'
import { chatService } from '../services/chatService'
import { botService } from '../services/botService'
import { userService } from '../services/userService'

const EMOJI_LIST = ['😀', '😂', '😍', '🥳', '😎', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '👏', '😢']

export default function ChatPage() {
  const { conversationId } = useParams()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const user = await userService.getCurrentUser()
        setCurrentUser(user)

        if (conversationId) {
          const [conv, msgs] = await Promise.all([
            chatService.getConversation(conversationId),
            chatService.getMessages(conversationId),
          ])
          setConversation(conv)
          setMessages(msgs)
          await chatService.markAsRead(conversationId)
        }
      } catch (error) {
        console.error('Failed to load chat:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      const sentMessage = await chatService.sendMessage(conversationId, {
        type: 'text',
        content: messageContent,
      })
      setMessages((prev) => [...prev, sentMessage])

      // If it's a bot conversation, get bot response
      if (conversation?.type === 'bot') {
        const botResponse = await botService.getBotResponse(messageContent)
        setMessages((prev) => [...prev, botResponse])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  const handleFileUpload = (type) => {
    // Simulate file upload
    const mockFiles = {
      image: {
        type: 'image',
        content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
        caption: 'Shared image',
      },
      video: {
        type: 'video',
        content: '/sample-video.mp4',
        caption: 'Shared video',
      },
      document: {
        type: 'document',
        content: '/document.pdf',
        fileName: 'Document.pdf',
        fileSize: '1.2 MB',
      },
    }

    const file = mockFiles[type]
    if (file) {
      chatService.sendMessage(conversationId, file).then((msg) => {
        setMessages((prev) => [...prev, msg])
      })
    }
    setShowAttachMenu(false)
  }

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to ChatApp</h2>
          <p className="text-muted-foreground">Select a conversation to start chatting</p>
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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <header className="h-16 px-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          {conversation?.type === 'bot' ? (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
          ) : conversation?.type === 'group' ? (
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Hash className="w-6 h-6 text-primary" />
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation?.avatar} alt={conversation?.name} />
              <AvatarFallback>{getInitials(conversation?.name)}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <h2 className="font-semibold">
              {conversation?.type === 'bot' ? 'AI Assistant' : conversation?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {conversation?.type === 'bot'
                ? 'Always here to help'
                : conversation?.type === 'group'
                ? `${conversation?.participants?.length || 0} members`
                : 'Online'}
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
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUser?.id || message.senderId === 'user-1'
            const showAvatar =
              !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId)

            return (
              <div
                key={message.id}
                className={cn('flex gap-3', isOwn ? 'justify-end' : 'justify-start')}
              >
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {message.senderId === 'bot' ? (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={conversation?.avatar} alt={conversation?.name} />
                        <AvatarFallback>{getInitials(conversation?.name)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}

                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <MessageContent message={message} isOwn={isOwn} />
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-1',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px]',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(message.timestamp), 'HH:mm')}
                    </span>
                    {isOwn && (
                      <span className="text-primary-foreground/70">
                        {message.status === 'read' ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground flex-shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleFileUpload('image')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                >
                  <Image className="w-4 h-4 text-primary" />
                  <span>Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileUpload('video')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                >
                  <Video className="w-4 h-4 text-primary" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileUpload('document')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Document</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0"
          >
            {sending ? <Spinner size="sm" className="text-primary-foreground" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageContent({ message, isOwn }) {
  switch (message.type) {
    case 'image':
      return (
        <div className="space-y-2">
          <img
            src={message.content}
            alt={message.caption || 'Shared image'}
            className="rounded-lg max-w-full"
            crossOrigin="anonymous"
          />
          {message.caption && <p className="text-sm">{message.caption}</p>}
        </div>
      )
    case 'video':
      return (
        <div className="space-y-2">
          <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Video className={cn('w-10 h-10', isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground')} />
          </div>
          {message.caption && <p className="text-sm">{message.caption}</p>}
        </div>
      )
    case 'document':
      return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-background/10">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.fileName}</p>
            <p className={cn('text-xs', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
              {message.fileSize}
            </p>
          </div>
        </div>
      )
    default:
      return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
  }
}
