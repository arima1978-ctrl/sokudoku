'use client'

import { useMemo, useState } from 'react'

export interface WordRecognitionTestProps {
  /** 本文に登場する単語（正解は○） */
  inWords: string[]
  /** 本文に登場しないダミー単語（正解は×） */
  decoyWords: string[]
  /** 完了時コールバック (correct, total) */
  onComplete: (correct: number, total: number) => void
}

type Question = {
  word: string
  /** true = 本文中に登場（正解は○） */
  isIn: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 単語認識テスト
 * 本文中の単語5個 + 本文外の単語5個 = 10問をランダム順で出題。
 * 各問「本文に出てきた？」に対して○×で回答。
 * 合格ラインは呼び出し側判定（通常 9/10 以上 = 90%）。
 */
export default function WordRecognitionTest({
  inWords,
  decoyWords,
  onComplete,
}: WordRecognitionTestProps) {
  const questions = useMemo<Question[]>(() => {
    const ins = shuffle(inWords).slice(0, 5).map(w => ({ word: w, isIn: true }))
    const outs = shuffle(decoyWords).slice(0, 5).map(w => ({ word: w, isIn: false }))
    return shuffle([...ins, ...outs])
  }, [inWords, decoyWords])

  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [lastResult, setLastResult] = useState<'right' | 'wrong' | null>(null)

  const current = questions[index]
  const total = questions.length

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">出題単語が登録されていません</p>
      </div>
    )
  }

  const answer = (userSaysYes: boolean) => {
    const isCorrect = userSaysYes === current.isIn
    const nextCorrect = correct + (isCorrect ? 1 : 0)
    setCorrect(nextCorrect)
    setLastResult(isCorrect ? 'right' : 'wrong')

    setTimeout(() => {
      setLastResult(null)
      if (index + 1 >= total) {
        onComplete(nextCorrect, total)
      } else {
        setIndex(index + 1)
      }
    }, 600)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="text-center px-6">
        <div className="mb-4 inline-block rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white">
          内容確認テスト
        </div>
        <h2 className="mb-2 text-base text-zinc-600">
          本文に出てきた言葉ですか？
        </h2>
        <p className="mb-6 text-sm text-zinc-500">
          {index + 1} / {total} 問
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 32px',
            marginBottom: 32,
            minWidth: 320,
            border: lastResult === 'right' ? '4px solid #27ae60' : lastResult === 'wrong' ? '4px solid #e74c3c' : '4px solid transparent',
            transition: 'border 0.15s',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#2A2A2A',
              fontFamily: '"Noto Sans JP", sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {current.word}
          </div>
          {lastResult && (
            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                fontWeight: 'bold',
                color: lastResult === 'right' ? '#27ae60' : '#e74c3c',
              }}
            >
              {lastResult === 'right' ? '正解' : '不正解'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => answer(true)}
            disabled={lastResult !== null}
            style={{
              padding: '16px 40px',
              borderRadius: 40,
              border: '3px solid #1478C3',
              background: '#fff',
              color: '#1478C3',
              fontSize: 36,
              fontWeight: 'bold',
              cursor: lastResult ? 'not-allowed' : 'pointer',
              minWidth: 120,
            }}
          >
            ○
          </button>
          <button
            type="button"
            onClick={() => answer(false)}
            disabled={lastResult !== null}
            style={{
              padding: '16px 40px',
              borderRadius: 40,
              border: '3px solid #dd4b39',
              background: '#fff',
              color: '#dd4b39',
              fontSize: 36,
              fontWeight: 'bold',
              cursor: lastResult ? 'not-allowed' : 'pointer',
              minWidth: 120,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
