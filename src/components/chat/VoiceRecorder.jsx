/**
 * VoiceRecorder — nút ghi âm trong composer.
 * - Click để bắt đầu ghi
 * - Hiển thị timer + nút dừng/huỷ khi đang ghi
 * - Khi dừng: upload file và gọi onSend(attachmentId)
 */
import { useState, useRef, useEffect } from 'react'
import { Mic, Square, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { messageService } from '../../services/messageService'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function VoiceRecorder({ onSend, disabled }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: getSupportedMimeType() })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      mediaRecorderRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      setError('Không thể truy cập microphone.')
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.onstop = async () => {
      clearInterval(timerRef.current)
      setRecording(false)
      const mimeType = getSupportedMimeType()
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType })
      const durationMs = seconds * 1000
      setUploading(true)
      try {
        const att = await messageService.uploadAttachment(file, {
          durationMs,
          type: 'audio',
        })
        if (att) onSend?.(att)
      } catch (e) {
        setError('Gửi thất bại, thử lại.')
      } finally {
        setUploading(false)
        setSeconds(0)
      }
      mr.stream.getTracks().forEach((t) => t.stop())
    }
    mr.stop()
  }

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.onstop = null
    mr.stop()
    mr.stream.getTracks().forEach((t) => t.stop())
    clearInterval(timerRef.current)
    setRecording(false)
    setSeconds(0)
    chunksRef.current = []
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30">
        {/* Pulse dot */}
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
        {/* Timer */}
        <span className="text-sm font-mono text-destructive min-w-[40px]">
          {formatTime(seconds)}
        </span>
        {/* Cancel */}
        <button
          type="button"
          onClick={cancelRecording}
          className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          title="Huỷ"
        >
          <X className="w-4 h-4" />
        </button>
        {/* Stop & send */}
        <button
          type="button"
          onClick={stopRecording}
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
          title="Dừng và gửi"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled || uploading}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
          uploading
            ? 'bg-muted text-muted-foreground'
            : 'hover:bg-muted text-muted-foreground hover:text-primary'
        )}
        title="Ghi âm"
      >
        {uploading
          ? <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          : <Mic className="w-4 h-4" />
        }
      </button>
      {error && <p className="text-[10px] text-destructive mt-0.5">{error}</p>}
    </div>
  )
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return 'audio/webm'
}
