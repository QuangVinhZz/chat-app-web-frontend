/**
 * AudioPlayer — giống hệt Messenger/Zalo:
 * - Nút play/pause tròn xanh
 * - 3 bars animation (nhảy khi đang phát)
 * - Thời gian bên phải
 */
import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '../../utils/cn'

function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function AudioPlayer({ url, isOwn }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => { setPlaying(false); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const displayTime = playing || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-2xl',
      isOwn ? 'bg-primary/80' : 'bg-[#2a2a2a]'
    )}
      style={{ minWidth: 160 }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause button — tròn xanh */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[#1877f2] hover:bg-[#1565d8] flex items-center justify-center shrink-0 transition-colors"
      >
        {playing
          ? <Pause className="w-4 h-4 text-white fill-white" />
          : <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        }
      </button>

      {/* 3 bars animation */}
      <div className="flex items-end gap-[3px] h-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'w-[4px] rounded-full bg-[#1877f2] transition-all',
              playing ? 'animate-bounce' : ''
            )}
            style={{
              height: playing ? undefined : `${[14, 20, 10][i]}px`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.6s',
              ...(playing ? { minHeight: '6px', maxHeight: '22px' } : {}),
            }}
          />
        ))}
      </div>

      {/* Time */}
      <span className="text-sm font-medium text-white tabular-nums">
        {displayTime}
      </span>
    </div>
  )
}
