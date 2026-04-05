'use client'

import { useState, useRef, useCallback } from 'react'
import QuizCard from './QuizCard'

interface SpeedContent {
  id: string
  title: string
  body: string
  char_count: number
}

interface QuizData {
  question: string
  choices: [string, string, string, string]
  correctIndex: number
}

interface SpeedMeasurementProps {
  content: SpeedContent
  quiz: QuizData | null
  type: 'pre' | 'post'
  onComplete: (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => void
}

type Phase = 'ready' | 'reading' | 'quiz' | 'done'

export default function SpeedMeasurement({
  content,
  quiz,
  type,
  onComplete,
}: SpeedMeasurementProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [readingTimeSec, setReadingTimeSec] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startReading = useCallback(() => {
    startTimeRef.current = Date.now()
    setPhase('reading')
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const finishReading = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const timeSec = Math.round((Date.now() - startTimeRef.current) / 1000 * 100) / 100
    setReadingTimeSec(timeSec)
    if (quiz) {
      setPhase('quiz')
    } else {
      setPhase('done')
      onComplete({ charCount: content.char_count, readingTimeSec: timeSec })
    }
  }, [quiz, content.char_count, onComplete])

  const handleQuizAnswer = useCallback((_selected: number, isCorrect: boolean) => {
    setPhase('done')
    onComplete({
      charCount: content.char_count,
      readingTimeSec,
      quizCorrect: isCorrect ? 1 : 0,
      quizTotal: 1,
    })
  }, [content.char_count, readingTimeSec, onComplete])

  const wpm = readingTimeSec > 0
    ? Math.round((content.char_count / readingTimeSec) * 60)
    : 0

  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60
  const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`

  const label = type === 'pre' ? 'トレーニング前' : 'トレーニング後'

  // 準備画面
  if (phase === 'ready') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <div className="mb-2 text-sm font-medium text-blue-600">{label}</div>
          <h2 className="mb-4 text-xl font-bold text-zinc-900">速度計測</h2>
          <p className="mb-2 text-sm text-zinc-500">
            文章を読み終わったら「読み終わった」ボタンを押してください
          </p>
          <p className="mb-6 text-sm text-zinc-500">
            {content.char_count}文字の文章です
          </p>
          <button
            type="button"
            onClick={startReading}
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            スタート
          </button>
        </div>
      </div>
    )
  }

  // 読書中
  if (phase === 'reading') {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        {/* タイマーバー */}
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#666' }}>{label} - 速度計測</span>
          <span style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: '#333' }}>
            {elapsedStr}
          </span>
        </div>

        {/* 本文 */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 20,
            minHeight: 'calc(100vh - 160px)', overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' }}>
              {content.title}
            </h3>
            <div style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 18, lineHeight: 2.2, color: '#333',
              whiteSpace: 'pre-wrap',
            }}>
              {content.body}
            </div>
          </div>

          {/* 読み終わりボタン */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={finishReading}
              style={{
                padding: '14px 48px', borderRadius: 28,
                border: '2px solid #E6C200',
                background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
                color: '#333', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
              }}
            >
              読み終わった
            </button>
          </div>
        </div>
      </div>
    )
  }

  // クイズ
  if (phase === 'quiz' && quiz) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-4 text-center">
            <span className="text-sm font-medium text-blue-600">{label} - 理解度チェック</span>
          </div>
          <div className="mb-4 rounded-lg bg-white p-4 text-center">
            <span className="text-2xl font-bold text-blue-600">{wpm}</span>
            <span className="ml-1 text-sm text-zinc-500">文字/分</span>
          </div>
          <QuizCard
            question={quiz.question}
            choices={quiz.choices}
            correctIndex={quiz.correctIndex}
            onAnswer={handleQuizAnswer}
          />
        </div>
      </div>
    )
  }

  // 完了（通常は onComplete 経由で親が遷移するので一瞬だけ表示）
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-zinc-500">結果を保存中...</p>
      </div>
    </div>
  )
}
