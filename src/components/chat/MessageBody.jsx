import AttachmentPreview from './AttachmentPreview'
import PollBubble from './PollBubble'

/**
 * Inner body of a non-recalled message: the list of attachments
 * followed by the text content. Kept separate from `MessageRow` so
 * the bubble wrapper (background, rounded corners, timestamp, etc.)
 * lives in one place.
 */
export default function MessageBody({ message, isOwn, onOpenLightbox, currentUserId, onPollUpdated }) {
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
      {message.poll && (
        <PollBubble
          poll={message.poll}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onUpdated={onPollUpdated}
        />
      )}
      {/* When a poll is attached, the message content is the question — don't
          render it twice. */}
      {message.content && !message.poll && (
        <p className="text-sm whitespace-pre-wrap wrap-break-word">
          {message.content}
        </p>
      )}
    </div>
  )
}
