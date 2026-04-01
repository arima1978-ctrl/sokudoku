'use client'

import { useState } from 'react'

interface QuizCardProps {
  question: string
  choices: readonly [string, string, string, string]
  correctIndex: number
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void
}

export default function QuizCard({
  question,
  choices,
  correctIndex,
  onAnswer,
}: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  function handleSelect(index: number) {
    if (answered) return
    setSelected(index)
    setAnswered(true)
    const isCorrect = index === correctIndex
    // Show result briefly before calling back
    setTimeout(() => {
      onAnswer(index, isCorrect)
    }, 1200)
  }

  function choiceStyle(index: number): string {
    const base =
      'w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors'

    if (!answered) {
      return `${base} border-zinc-300 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-500 dark:hover:bg-zinc-700 cursor-pointer`
    }

    if (index === correctIndex) {
      return `${base} border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-900 dark:text-green-200`
    }

    if (index === selected && index !== correctIndex) {
      return `${base} border-red-500 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-900 dark:text-red-200`
    }

    return `${base} border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600`
  }

  const labels = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 rounded-lg bg-zinc-100 p-4 text-center dark:bg-zinc-800">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
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
          {selected === correctIndex ? (
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              正解!
            </p>
          ) : (
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              不正解... 正解は {labels[correctIndex]} です
            </p>
          )}
        </div>
      )}
    </div>
  )
}
