import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

/**
 * Fullscreen lightbox for image / video attachments. Renders a dark
 * overlay that dismisses on Escape, click-outside, or the X button.
 * Body scroll is locked while open.
 */
export default function MediaLightbox({ attachment, onClose }) {
  useEffect(() => {
    if (!attachment) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [attachment, onClose])

  if (!attachment) return null

  const isImage = attachment.type === 'image'
  const isVideo = attachment.type === 'video'
  if (!isImage && !isVideo) return null

  return (
    <div
      className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName || 'Media preview'}
    >
      {attachment.fileName && (
        <div
          className="absolute top-4 left-4 right-32 text-white/90 text-sm truncate pointer-events-none"
          aria-hidden="true"
        >
          {attachment.fileName}
        </div>
      )}
      <a
        href={attachment.url}
        download={attachment.fileName || true}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        aria-label="Download"
        title="Download"
      >
        <Download className="w-5 h-5" />
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose?.()
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        aria-label="Close"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={attachment.url}
            alt={attachment.fileName || 'image'}
            className="max-w-[95vw] max-h-[90vh] object-contain select-none"
            draggable={false}
          />
        )}
        {isVideo && (
          <video
            src={attachment.url}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[90vh]"
          />
        )}
      </div>
    </div>
  )
}
