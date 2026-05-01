/**
 * AiMessageBubble — renders a single message in the AI chat view.
 * User messages: right-aligned, primary colour.
 * AI messages: left-aligned, muted with Bot icon + "AI Assistant" label.
 * Supports basic Markdown rendering (bold, italic, inline code, code blocks).
 */
import { Bot } from 'lucide-react'
import { cn } from '../../utils/cn'
import { format } from 'date-fns'

/** Very lightweight Markdown → JSX renderer (no external dep needed). */
function renderMarkdown(text) {
  if (!text) return null

  // Split on code blocks first so we don't process their content
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const inner = part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return (
        <pre
          key={i}
          className="bg-black/20 rounded-md p-3 my-2 text-xs overflow-x-auto whitespace-pre-wrap font-mono"
        >
          <code>{inner}</code>
        </pre>
      )
    }

    // Process inline: bold, italic, inline code, line breaks
    const lines = part.split('\n')
    return lines.map((line, li) => {
      const segments = line.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      const rendered = segments.map((seg, si) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={si}>{seg.slice(2, -2)}</strong>
        }
        if (seg.startsWith('*') && seg.endsWith('*')) {
          return <em key={si}>{seg.slice(1, -1)}</em>
        }
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return (
            <code key={si} className="bg-black/20 rounded px-1 py-0.5 text-xs font-mono">
              {seg.slice(1, -1)}
            </code>
          )
        }
        return seg
      })
      return (
        <span key={`${i}-${li}`}>
          {rendered}
          {li < lines.length - 1 && <br />}
        </span>
      )
    })
  })
}

export default function AiMessageBubble({ message, isAi, currentUserId }) {
  const isMe = !isAi && (message.senderId === currentUserId || message._optimistic)
  const time = message.createdAt
    ? format(new Date(message.createdAt), 'HH:mm')
    : ''

  if (isAi) {
    return (
      <div className="flex items-start gap-2 max-w-[85%]">
        {/* Bot avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-medium px-1">AI Assistant</span>
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-foreground leading-relaxed">
            {renderMarkdown(message.content)}
          </div>
          {time && (
            <span className="text-[10px] text-muted-foreground px-1">{time}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isMe
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        {time && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground px-1',
              isMe ? 'text-right' : 'text-left'
            )}
          >
            {time}
          </span>
        )}
      </div>
    </div>
  )
}
