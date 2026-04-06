'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SpeedReadingProps {
  title: string
  body: string
  charCount: number
  /** 最低読書時間（秒） */
  minReadingSec: number
  onComplete: (readingTimeSec: number, wpm: number) => void
}

/**
 * 高速読みコンポーネント
 * 最低時間が経過するまで「読み終わった」ボタンを押せない。
 * 経過時間とWPMをリアルタイム表示。
 */
export default function SpeedReading({
  title,
  body,
  charCount,
  minReadingSec,
  onComplete,
}: SpeedReadingProps) {
  const [phase, setPhase] = useState<'ready' | 'reading' | 'done'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canFinish = elapsed >= minReadingSec

  const startReading = useCallback(() => {
    startTimeRef.current = Date.now()
    setPhase('reading')
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
  }, [])

  const finishReading = useCallback(() => {
    if (!canFinish) return
    if (timerRef.current) clearInterval(timerRef.current)
    const timeSec = Math.round((Date.now() - startTimeRef.current) / 100) / 10
    const wpm = timeSec > 0 ? Math.round((charCount / timeSec) * 60) : 0
    setPhase('done')
    onComplete(timeSec, wpm)
  }, [canFinish, charCount, onComplete])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60
  const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`
  const remainToMin = Math.max(0, minReadingSec - elapsed)
  const currentWpm = elapsed > 0 ? Math.round((charCount / elapsed) * 60) : 0

  // 準備画面
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="text-center px-6">
          <div className="mb-4 inline-block rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white">
            高速読み
          </div>
          <h2 className="mb-3 text-xl font-bold text-zinc-900">{title}</h2>
          <p className="mb-2 text-sm text-zinc-600">{charCount}文字</p>
          <p className="mb-2 text-sm text-zinc-500">
            できるだけ速く、内容を理解しながら読んでください
          </p>
          <p className="mb-8 text-xs text-zinc-400">
            最低{Math.round(minReadingSec / 60)}分間は読書してください（脳の定着のため）
          </p>
          <button
            type="button"
            onClick={startReading}
            style={{
              padding: '14px 48px', borderRadius: 28,
              background: 'linear-gradient(180deg, #ff9f43 0%, #ee5a24 100%)',
              border: '2px solid #d35400',
              color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            読み始める
          </button>
        </div>
      </div>
    )
  }

  // 完了（onComplete呼び出し後の一瞬）
  if (phase === 'done') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-zinc-500">結果を処理中...</p>
        </div>
      </div>
    )
  }

  // 読書中
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
      {/* ヘッダーバー */}
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: '#ee5a24', color: '#fff', fontWeight: 'bold',
            padding: '4px 12px', borderRadius: 16, fontSize: 12,
          }}>
            高速読み
          </span>
          <span style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: '#333' }}>
            {elapsedStr}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!canFinish && (
            <span style={{ fontSize: 12, color: '#e74c3c', fontWeight: 'bold' }}>
              あと{remainToMin}秒
            </span>
          )}
          {canFinish && (
            <span style={{ fontSize: 12, color: '#27ae60', fontWeight: 'bold' }}>
              読了OK
            </span>
          )}
        </div>
      </div>

      {/* 最低時間プログレスバー */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: canFinish ? '#27ae60' : '#3b82f6',
            width: `${Math.min(100, (elapsed / minReadingSec) * 100)}%`,
            transition: 'width 0.5s',
          }} />
        </div>
      </div>

      {/* 本文 */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: '#fff', borderRadius: 8, padding: 20,
          minHeight: 'calc(100vh - 200px)', overflowY: 'auto',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' }}>
            {title}
          </h3>
          <div style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: 18, lineHeight: 2.2, color: '#333',
            whiteSpace: 'pre-wrap',
          }}>
            {body}
          </div>
        </div>

        {/* 読了ボタン */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={finishReading}
            disabled={!canFinish}
            style={{
              padding: '14px 48px', borderRadius: 28,
              border: canFinish ? '2px solid #E6C200' : '2px solid #ccc',
              background: canFinish
                ? 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)'
                : '#e5e7eb',
              color: canFinish ? '#333' : '#999',
              fontSize: 16, fontWeight: 'bold',
              cursor: canFinish ? 'pointer' : 'not-allowed',
              opacity: canFinish ? 1 : 0.6,
            }}
          >
            {canFinish ? '読み終わった' : `あと${remainToMin}秒お待ちください`}
          </button>
        </div>
      </div>
    </div>
  )
}
