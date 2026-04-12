import { Reply, Forward } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../../utils/cn'
import { getInitials, groupReactions } from '../../utils/format'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/Avatar'
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
          isOwn ? 'items-end' : 'items-start'
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

        {/* Reaction chips — hidden on recalled messages */}
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
