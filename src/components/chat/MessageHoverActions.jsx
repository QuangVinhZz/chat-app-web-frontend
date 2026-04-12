import {
  Smile,
  Reply,
  MoreVertical,
  Forward,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/**
 * Small row of action icons that appears on hover next to a message:
 * react picker, reply, and a "more" menu with forward / recall /
 * delete-for-me. Hidden entirely on recalled messages.
 */
export default function MessageHoverActions({
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
