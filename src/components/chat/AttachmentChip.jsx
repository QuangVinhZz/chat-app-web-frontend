import { FileText, X } from 'lucide-react'

/**
 * Compact chip shown in the composer area for each attachment the user
 * has uploaded but not yet sent. Click X to remove it from the queue.
 */
export default function AttachmentChip({ attachment, onRemove }) {
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
      <span className="truncate max-w-30">
        {attachment.fileName || attachment.type}
      </span>
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
