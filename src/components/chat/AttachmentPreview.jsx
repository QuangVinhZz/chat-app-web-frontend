import { FileText, Download, Play } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatFileSize } from '../../utils/format'

/**
 * Renders one message attachment inside a bubble. Image/video clicks
 * open the parent's lightbox; audio plays inline; documents link out.
 * Styling branches on `isOwn` so contrast stays readable on primary
 * bubbles.
 */
export default function AttachmentPreview({ attachment, isOwn, onOpenLightbox }) {
  if (attachment.type === 'image') {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox?.(attachment)}
        className="block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName || 'image'}
          className="max-w-full max-h-80 object-cover"
        />
      </button>
    )
  }

  if (attachment.type === 'video') {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox?.(attachment)}
        className="relative block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary group"
      >
        <video
          src={attachment.url}
          className="max-w-full max-h-80 pointer-events-none"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
      </button>
    )
  }

  if (attachment.type === 'audio') {
    return <audio src={attachment.url} controls className="max-w-full" />
  }

  // Document fallback.
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex items-center gap-3 p-2 pr-3 rounded-lg transition-colors min-w-[240px]',
        isOwn
          ? 'bg-primary-foreground/15 hover:bg-primary-foreground/20'
          : 'bg-background hover:bg-background/70 border border-border'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isOwn ? 'bg-primary-foreground/25' : 'bg-primary/15'
        )}
      >
        <FileText
          className={cn(
            'w-5 h-5',
            isOwn ? 'text-primary-foreground' : 'text-primary'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            isOwn ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {attachment.fileName || 'Attachment'}
        </p>
        {attachment.fileSize != null && (
          <p
            className={cn(
              'text-xs',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {formatFileSize(attachment.fileSize)}
          </p>
        )}
      </div>
      <Download
        className={cn(
          'w-4 h-4 shrink-0',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}
      />
    </a>
  )
}
