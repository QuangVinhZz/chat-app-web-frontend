import AttachmentPreview from './AttachmentPreview'

/**
 * Inner body of a non-recalled message: the list of attachments
 * followed by the text content. Kept separate from `MessageRow` so
 * the bubble wrapper (background, rounded corners, timestamp, etc.)
 * lives in one place.
 */
export default function MessageBody({ message, isOwn, onOpenLightbox }) {
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
        <p className="text-sm whitespace-pre-wrap wrap-break-word">
          {message.content}
        </p>
      )}
    </div>
  )
}
