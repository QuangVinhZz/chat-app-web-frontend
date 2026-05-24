import { FileText, Download, Play } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatFileSize } from '../../utils/format'
import AudioPlayer from './AudioPlayer'
import { useRef, useState, useEffect } from 'react'

function formatDuration(seconds) {
  if (!isFinite(seconds) || isNaN(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function VideoPreview({ attachment, onOpenLightbox }) {
  const videoRef = useRef(null)
  const [duration, setDuration] = useState('')

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onMeta = () => setDuration(formatDuration(v.duration))
    v.addEventListener('loadedmetadata', onMeta)
    return () => v.removeEventListener('loadedmetadata', onMeta)
  }, [])

  return (
    <button
      type="button"
      onClick={() => onOpenLightbox?.(attachment)}
      className="relative block rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary group max-w-[280px]"
      style={{ background: '#2563eb' }}
    >
      {/* Blue border effect */}
      <div className="p-1.5 rounded-2xl" style={{ background: '#3b82f6' }}>
        <div className="rounded-xl overflow-hidden relative" style={{ background: '#1e3a5f' }}>
          <video
            ref={videoRef}
            src={attachment.url}
            className="w-full max-h-52 object-cover block"
            muted
            playsInline
            preload="metadata"
          />
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center group-hover:bg-black/80 transition-colors">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
          {/* Duration badge */}
          {duration && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-1.5 py-0.5 rounded">
              {duration}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

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
    return <VideoPreview attachment={attachment} onOpenLightbox={onOpenLightbox} />
  }

  if (attachment.type === 'audio') {
    return (
      <AudioPlayer
        url={attachment.url}
        isOwn={isOwn}
        durationMs={attachment.durationMs}
      />
    )
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
