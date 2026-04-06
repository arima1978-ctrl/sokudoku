'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface QuizCardProps {
  question: string
  choices: readonly [string, string, string, string]
  correctIndex: number
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void
  /** 制限時間（秒）。0で無制限 */
  timeLimitSec?: number
}

export default function QuizCard({
  question,
  choices,
  correctIndex,
  onAnswer,
  timeLimitSec = 10,
}: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [remaining, setRemaining] = useState(timeLimitSec)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answeredRef = useRef(false)

  const doAnswer = useCallback((index: number | null) => {
    if (answeredRef.current) return
    answeredRef.current = true
    setAnswered(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const selectedIdx = index ?? -1
    const isCorrect = selectedIdx === correctIndex
    setSelected(index)

    setTimeout(() => {
      onAnswer(selectedIdx, isCorrect)
    }, 1200)
  }, [correctIndex, onAnswer])

  // カウントダウンタイマー
  useEffect(() => {
    if (timeLimitSec <= 0) return

    setRemaining(timeLimitSec)
    answeredRef.current = false

    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          doAnswer(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timeLimitSec, question, doAnswer])

  function handleSelect(index: number) {
    if (answered) return
    doAnswer(index)
  }

  function choiceStyle(index: number): string {
    const base =
      'w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors'

    if (!answered) {
      return `${base} border-zinc-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer`
    }

    if (index === correctIndex) {
      return `${base} border-green-500 bg-green-50 text-green-800`
    }

    if (index === selected && index !== correctIndex) {
      return `${base} border-red-500 bg-red-50 text-red-800`
    }

    return `${base} border-zinc-200 bg-zinc-50 text-zinc-400`
  }

  const labels = ['A', 'B', 'C', 'D'] as const
  const timerColor = remaining <= 3 ? 'text-red-600' : remaining <= 5 ? 'text-orange-500' : 'text-zinc-600'
  const timerBarPercent = timeLimitSec > 0 ? (remaining / timeLimitSec) * 100 : 100
  const timerBarColor = remaining <= 3 ? 'bg-red-500' : remaining <= 5 ? 'bg-orange-400' : 'bg-blue-500'

  return (
    <div className="mx-auto max-w-lg">
      {/* タイマーバー */}
      {timeLimitSec > 0 && !answered && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">残り時間</span>
            <span className={`text-sm font-bold font-mono ${timerColor}`}>
              {remaining}秒
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timerBarColor}`}
              style={{ width: `${timerBarPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg bg-zinc-100 p-4 text-center">
        <p className="text-lg font-medium text-zinc-900">
          {question}
        </p>
      </div>

      <div className="space-y-3">
        {choices.map((choice, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSelect(index)}
            disabled={answered}
            className={choiceStyle(index)}
          >
            <span className="mr-2 font-bold">{labels[index]}.</span>
            {choice}
          </button>
        ))}
      </div>

      {answered && (
        <div className="mt-4 text-center">
          {selected === null ? (
            <p className="text-lg font-bold text-orange-600">
              時間切れ! 正解は {labels[correctIndex]} です
            </p>
          ) : selected === correctIndex ? (
            <p className="text-lg font-bold text-green-600">
              正解!
            </p>
          ) : (
            <p className="text-lg font-bold text-red-600">
              不正解... 正解は {labels[correctIndex]} です
            </p>
          )}
        </div>
      )}
    </div>
  )
}
