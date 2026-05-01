import { Reply, Forward, PhoneCall, Pin, Star } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../../utils/cn'
import { getInitials, groupReactions } from '../../utils/format'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { useCall } from '../../contexts/CallContext'
import MessageBody from './MessageBody'
import MessageHoverActions from './MessageHoverActions'

/**
 * One chat bubble + everything around it (sender avatar, nested reply
 * preview, reactions, read receipts, hover actions). Stateless — all
 * action handlers come from props.
 */
export default function MessageRow({
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
  onViewDetail,
  onSelectMultiple,
  onMessageUpdated,
  isSelected,
  isMultiSelectMode,
}) {
  const isOwn = message.senderId === currentUserId
  const showAvatar =
    !isOwn && (!previous || previous.senderId !== message.senderId)
  const showName =
    !isOwn && (!previous || previous.senderId !== message.senderId)

  const groupedReactions = groupReactions(message.reactions ?? [])
  
  // Custom Call Context
  const { joinGroupCall } = useCall();
  const isGroupCallNotice = message.content === '[GROUP_CALL:STARTED]';

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group flex gap-2',
        isOwn ? 'justify-end' : 'justify-start',
        isMultiSelectMode && 'cursor-pointer select-none'
      )}
      onClick={isMultiSelectMode ? () => onSelectMultiple?.(message) : undefined}
    >
      {/* Checkbox khi multi-select mode */}
      {isMultiSelectMode && (
        <div className={cn(
          'shrink-0 flex items-center',
          isOwn ? 'order-first' : ''
        )}>
          <div className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 bg-background'
          )}>
            {isSelected && (
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={message.sender?.avatarUrl}
                alt={message.sender?.name}
              />
              <AvatarFallback>{getInitials(message.sender?.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          'max-w-[70%] flex flex-col',
          isOwn ? 'items-end' : 'items-start',
          isSelected && 'opacity-80'
        )}
      >
        {showName && (
          <p className="text-[10px] text-muted-foreground mb-0.5 ml-2">
            {message.sender?.name || 'Unknown'}
          </p>
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
              onViewDetail={onViewDetail}
              onSelectMultiple={onSelectMultiple}
              onMessageUpdated={onMessageUpdated}
            />
          )}

          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 relative',
              message.isRecalled
                ? 'bg-muted/50 italic text-muted-foreground'
                : isOwn
                  ? 'bg-primary/80 text-primary-foreground'
                  : 'bg-muted'
            )}
          >
            {/* Forwarded indicator — small italic label above the
                content when this message was forwarded from another. */}
            {!message.isRecalled && message.forwardedFromId && (
              <div
                className={cn(
                  'flex items-center gap-1 text-[11px] italic mb-1',
                  isOwn
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                )}
              >
                <Forward className="w-3 h-3 shrink-0" />
                Forwarded
              </div>
            )}

            {/* Nested reply preview at the top of the bubble */}
            {!message.isRecalled && message.replyToMessageId && (
              <div
                className={cn(
                  '-mx-1.5 -mt-0.5 mb-1.5 rounded-xl pl-3 pr-3 py-1.5 text-xs border-l-[3px]',
                  isOwn
                    ? 'bg-primary-foreground/15 border-primary-foreground/60'
                    : 'bg-background/70 border-primary'
                )}
              >
                <p
                  className={cn(
                    'font-semibold text-[11px] mb-0.5 truncate flex items-center gap-1',
                    isOwn ? 'text-primary-foreground' : 'text-primary'
                  )}
                >
                  <Reply className="w-3 h-3 shrink-0" />
                  {replyTarget?.sender?.name || 'Unknown'}
                </p>
                <p
                  className={cn(
                    'truncate leading-snug',
                    isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {replyTarget?.isRecalled
                    ? '[Message recalled]'
                    : replyTarget?.content ||
                      ((replyTarget?.attachments?.length ?? 0) > 0
                        ? '📎 Attachment'
                        : '')}
                </p>
              </div>
            )}

            {message.isRecalled ? (
              <p className="text-sm">[Message recalled]</p>
            ) : isGroupCallNotice ? (
              <div className="flex flex-col items-center px-4 py-2 gap-3 min-w-[200px]">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                  <PhoneCall className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-[15px] mb-1">Cuộc gọi nhóm đã diễn ra</p>
                  <p className="text-[12px] opacity-80 mb-2">Nhấn để tham gia cùng mọi người</p>
                </div>
                <Button 
                   className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg border border-green-500" 
                   onClick={() => joinGroupCall(message.conversationId)}
                >
                   Tham gia cuộc gọi
                </Button>
              </div>
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
                isOwn
                  ? 'text-primary-foreground/70 text-right'
                  : 'text-muted-foreground'
              )}
            >
              {message.createdAt && format(new Date(message.createdAt), 'HH:mm')}
            </div>
            {/* Pin / Star badges */}
            {(message.isPinned || message.isStarred) && (
              <div className={cn('flex gap-1 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
                {message.isPinned && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                    <Pin className="w-2.5 h-2.5" /> Đã ghim
                  </span>
                )}
                {message.isStarred && (
                  <span className="flex items-center gap-0.5 text-[10px] text-yellow-500">
                    <Star className="w-2.5 h-2.5" /> Đã đánh dấu
                  </span>
                )}
              </div>
            )}
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
              onViewDetail={onViewDetail}
              onSelectMultiple={onSelectMultiple}
              onMessageUpdated={onMessageUpdated}
            />
          )}
        </div>

        {/* Reaction chips — hidden on recalled messages */}
        {!message.isRecalled && groupedReactions.length > 0 && (
          <div className={cn('flex gap-1 mt-1 flex-wrap', isOwn ? 'mr-1 justify-end' : 'ml-1 justify-start')}>
            {groupedReactions.map(({ emoji, count, mine }) => (
              <div
                key={emoji}
                className={cn(
                  'group flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border relative',
                  mine ? 'bg-primary/10 border-primary/40' : 'bg-card border-border'
                )}
              >
                <button
                  type="button"
                  onClick={() => onReact(message, emoji, 'add')}
                  title="Add more"
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] text-muted-foreground mr-0.5">{count}</span>
                </button>
                {mine && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onReact(message, emoji, 'remove'); }}
                    title="Remove my reactions"
                    className="w-3 h-3 flex items-center justify-center rounded-full bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-[-2px] hover:bg-red-500/40"
                  >
                    <span className="text-[8px] font-bold leading-none select-none flex items-center justify-center">×</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Read receipts — stacked mini avatars of everyone whose last
            read-at reaches at least this own message. */}
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
