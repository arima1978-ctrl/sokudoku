'use client'

import { useEffect, useState, useCallback } from 'react'

interface TrainingTimerProps {
  durationSec: number
  onComplete: () => void
  paused: boolean
  onPauseToggle: () => void
}

/**
 * 既存システム準拠のタイマー
 * 青プログレスバー + 「あと MM:SS」 + 一時停止ボタン
 */
export default function TrainingTimer({
  durationSec,
  onComplete,
  paused,
  onPauseToggle,
}: TrainingTimerProps) {
  const [remaining, setRemaining] = useState(durationSec)

  useEffect(() => {
    setRemaining(durationSec)
  }, [durationSec])

  useEffect(() => {
    if (paused || remaining <= 0) return

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paused, remaining])

  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  useEffect(() => {
    if (remaining === 0) {
      handleComplete()
    }
  }, [remaining, handleComplete])

  const progress = durationSec > 0 ? ((durationSec - remaining) / durationSec) * 100 : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 px-1">
      {/* プログレスバー */}
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 残り時間 */}
      <span className="text-sm text-gray-600 font-mono whitespace-nowrap">
        あと{timeStr}
      </span>

      {/* 一時停止ボタン */}
      <button
        type="button"
        onClick={onPauseToggle}
        className="shrink-0 border border-gray-300 rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        {paused ? '▶ 再開' : 'II 一時停止'}
      </button>
    </div>
  )
}
