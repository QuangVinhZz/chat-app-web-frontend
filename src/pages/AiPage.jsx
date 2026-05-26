/**
 * AiPage — AI Assistant chat page.
 *
 * Layout: full-width single-column chat (no conversation list needed
 * since each user has exactly one AI conversation).
 *
 * Features:
 *  - Chat with Gemini AI
 *  - Markdown rendering for AI replies
 *  - Loading / error states
 *  - Auto-scroll to latest message
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, Sparkles, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAiStore } from '../stores/aiStore'
import { useUserStore } from '../stores/userStore'
import AiMessageBubble from '../components/chat/AiMessageBubble'

const SUGGESTED_PROMPTS = [
  'Tóm tắt các tính năng chính của ứng dụng này',
  'Giải thích cách tạo nhóm chat cộng đồng',
  'Gợi ý cách quản lý thành viên hiệu quả',
  'Hướng dẫn chia sẻ tài liệu trong nhóm',
]

export default function AiPage() {
  const currentUser = useUserStore((s) => s.user)
  const {
    conversation,
    messages,
    loading,
    error,
    ensureConversation,
    loadMessages,
    sendMessage,
    clearError,
    clearMessages,
    deleteAllMessages,
  } = useAiStore()

  const [input, setInput] = useState('')
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = messagesContainerRef.current
    if (el) {
      if (behavior === 'auto') {
        el.scrollTop = el.scrollHeight
        return
      }
      el.scrollTo({ top: el.scrollHeight, behavior })
    }
  }, [])

  // Initialize: ensure conversation exists, then load messages
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setInitializing(true)
      try {
        await ensureConversation()
        if (!cancelled) await loadMessages()
      } catch {
        // error already set in store
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [ensureConversation, loadMessages])

  // Auto-scroll when messages change
  useEffect(() => {
    if (autoScroll) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth'))
      })
    }
  }, [messages, autoScroll, scrollToBottom])

  const handleScroll = (e) => {
    const el = e.currentTarget
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setAutoScroll(near)
  }

  const handleSend = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setAutoScroll(true)
    try {
      await sendMessage(content)
    } catch {
      // error shown via store.error
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    if (window.confirm('Bạn có chắc muốn bắt đầu đoạn chat mới? Lịch sử chat hiện tại sẽ bị xóa.')) {
      clearMessages()
      setAutoScroll(true)
      scrollToBottom('auto')
    }
  }

  const handleClearConversation = async () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử đối thoại? Hành động này không thể hoàn tác.')) {
      try {
        // Delete all messages from database
        await deleteAllMessages()
        setAutoScroll(true)
        scrollToBottom('auto')
      } catch (err) {
        console.error('Failed to clear conversation:', err)
      }
    }
  }

  // Determine which messages are from the AI bot
  const botUserId = conversation?.members?.find(
    (m) => m.user?.email === 'ai-bot@system.local'
  )?.user?.id

  const isEmpty = !initializing && messages.length === 0

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="h-16 px-6 pl-16 md:pl-6 border-b flex items-center gap-3 bg-card shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">Powered by Google Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Spinner size="sm" />
              AI đang trả lời...
            </span>
          )}
          {!loading && messages.length > 0 && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNewChat}
                className="gap-1.5"
                title="Tạo đoạn chat mới"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Chat mới</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearConversation}
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Xóa đoạn đối thoại"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Xóa lịch sử</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* 24h message deletion warning */}
      <div className="bg-muted/30 py-2 px-4 text-center border-b border-border shrink-0">
        <p className="text-xs text-muted-foreground/80 font-medium">
          🕒 Tin nhắn trong cuộc trò chuyện này sẽ tự động được xóa sau 24 giờ.
        </p>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Initializing */}
        {initializing && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Spinner size="lg" />
              <span className="text-sm">Đang khởi động AI...</span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && !initializing && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Empty state with suggested prompts */}
        {isEmpty && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Xin chào! Tôi là AI Assistant</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tôi có thể giúp bạn với các câu hỏi về cộng đồng, quản lý nhóm, chia sẻ tài liệu và nhiều hơn nữa.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-foreground/80 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {!initializing && messages.map((msg) => {
          const isAi = msg.senderId === botUserId || msg.role === 'assistant'
          return (
            <div
              key={msg.id}
              className={cn('flex', isAi ? 'justify-start' : 'justify-end')}
            >
              <AiMessageBubble
                message={msg}
                isAi={isAi}
                currentUserId={currentUser?.id}
              />
            </div>
          )
        })}

        {/* AI typing indicator */}
        {loading && messages.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="absolute bottom-24 right-6">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg"
            onClick={() => { setAutoScroll(true); scrollToBottom() }}
            aria-label="Scroll to bottom"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t bg-card px-4 py-3">
        {/* AI disabled notice */}
        {error?.includes('disabled') && (
          <p className="text-xs text-destructive mb-2 text-center">
            AI hiện không khả dụng. Vui lòng cấu hình GEMINI_API_KEY.
          </p>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
            rows={1}
            disabled={loading || initializing || Boolean(error?.includes('disabled'))}
            className={cn(
              'flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-32 overflow-y-auto leading-relaxed'
            )}
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || loading || initializing}
            className="shrink-0 rounded-xl h-[42px] w-[42px]"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
        </p>
      </div>
    </div>
  )
}
