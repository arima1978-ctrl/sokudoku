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
 * - カウントダウンON: 青プログレスバー + 「あと MM:SS」+ 一時停止
 * - カウントダウンOFF: タイマー非表示、時間制限なしで練習（手動で終了）
 */
export default function TrainingTimer({
  durationSec,
  onComplete,
  paused,
  onPauseToggle,
}: TrainingTimerProps) {
  const [remaining, setRemaining] = useState(durationSec)
  const [countdownEnabled, setCountdownEnabled] = useState(true)

  useEffect(() => {
    setRemaining(durationSec)
  }, [durationSec])

  useEffect(() => {
    if (paused || remaining <= 0 || !countdownEnabled) return

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
  }, [paused, remaining, countdownEnabled])

  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  useEffect(() => {
    if (remaining === 0 && countdownEnabled) {
      handleComplete()
    }
  }, [remaining, countdownEnabled, handleComplete])

  const progress = durationSec > 0 ? ((durationSec - remaining) / durationSec) * 100 : 0
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* カウントダウン ON/OFF トグル */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#888' }}>カウントダウン</span>
        <button
          type="button"
          onClick={() => setCountdownEnabled(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: countdownEnabled ? '#0084E8' : '#ccc',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 2,
            left: countdownEnabled ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* タイマーバー（カウントダウンON時のみ表示） */}
      {countdownEnabled ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* プログレスバー */}
          <div style={{
            flex: 1, height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: '#3b82f6', borderRadius: 6,
              width: `${progress}%`, transition: 'width 1s linear',
            }} />
          </div>

          {/* 残り時間 */}
          <span style={{ fontSize: 14, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {'あと'}{timeStr}
          </span>

          {/* 一時停止ボタン */}
          <button
            type="button"
            onClick={onPauseToggle}
            style={{
              border: '1px solid #ccc', borderRadius: 4,
              padding: '4px 12px', fontSize: 12, color: '#666',
              background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {paused ? '\u25B6 再開' : 'II 一時停止'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#999' }}>
            {'時間制限なし（自分のペースで練習）'}
          </span>
          <button
            type="button"
            onClick={handleComplete}
            style={{
              border: '2px solid #E6C200',
              background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
              borderRadius: 20, padding: '6px 20px',
              fontSize: 13, fontWeight: 'bold', color: '#333', cursor: 'pointer',
            }}
          >
            {'練習を終了 \u2192 テストへ'}
          </button>
        </div>
      )}
    </div>
  )
}
