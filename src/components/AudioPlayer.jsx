import { useEffect, useRef, useState } from 'react'

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Простой кастомный плеер для аудирования (Hörverstehen) — play/pause,
// перемотка кликом по полоске, текущее время / общая длительность.
// Обёрнут вокруг обычного <audio>, чтобы не зависеть от того, как
// разные браузеры рисуют нативные controls — они плохо вписываются в
// дизайн сайта и различаются между собой.
export default function AudioPlayer({ src, title, color }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoadError(false)
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => setLoadError(true))
    }
  }

  function handleSeek(e) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onError={() => setLoadError(true)}
      />

      {loadError ? (
        <p className="audio-player-error">Не удалось загрузить аудио. Попробуйте перезагрузить страницу.</p>
      ) : (
        <>
          {title && <div className="audio-player-title">{title}</div>}
          <div className="audio-player-controls">
            <button
              type="button"
              className="audio-player-toggle"
              style={{ background: color }}
              onClick={togglePlay}
              aria-label={playing ? 'Пауза' : 'Слушать'}
            >
              {playing ? '❚❚' : '▶'}
            </button>

            <span className="audio-player-time">{formatTime(currentTime)}</span>

            <div className="audio-player-track" onClick={handleSeek}>
              <div className="audio-player-track-fill" style={{ width: `${progressPct}%`, background: color }} />
            </div>

            <span className="audio-player-time">{formatTime(duration)}</span>
          </div>
        </>
      )}
    </div>
  )
}
