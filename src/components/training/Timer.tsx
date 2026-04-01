'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface TimerProps {
  durationSec: number
  onComplete: () => void
  label?: string
  autoStart?: boolean
}

export default function Timer({
  durationSec,
  onComplete,
  label,
  autoStart = true,
}: TimerProps) {
  const [remaining, setRemaining] = useState(durationSec)
  const [isRunning, setIsRunning] = useState(autoStart)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const progress = durationSec > 0 ? ((durationSec - remaining) / durationSec) * 100 : 100

  const handleComplete = useCallback(() => {
    setIsRunning(false)
    onCompleteRef.current()
  }, [])

  useEffect(() => {
    if (!isRunning || remaining <= 0) {
      if (remaining <= 0 && isRunning) {
        handleComplete()
      }
      return
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, remaining, handleComplete])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="min-w-[4rem] text-right font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {timeDisplay}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {!isRunning && remaining > 0 && (
          <button
            type="button"
            onClick={() => setIsRunning(true)}
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
          >
            再開
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={() => setIsRunning(false)}
            className="rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700"
          >
            一時停止
          </button>
        )}
      </div>
    </div>
  )
}
