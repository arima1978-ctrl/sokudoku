'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Timer from '@/components/training/Timer'
import QuizCard from '@/components/training/QuizCard'
import SessionSummary from '@/components/training/SessionSummary'
import {
  getMenuSegments,
  startTrainingSession,
  submitSegmentTest,
  completeTrainingSession,
  type MenuSegment,
  type SegmentTestResult,
  type StepEvaluation,
  type TrainingSession,
} from '@/app/actions/training'
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'

// ========== Placeholder content generators ==========

const FLASH_WORDS = [
  '桜の花', '青い空', '夏休み', '秋の風', '冬の朝',
  '元気な子', '大きな木', '美しい海', '新しい本', '楽しい日',
  '走る馬', '飛ぶ鳥', '光る星', '流れる川', '揺れる花',
]

const PLACEHOLDER_TEXT =
  'むかしむかし、あるところに、おじいさんとおばあさんが住んでいました。おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。おばあさんが川で洗濯をしていると、大きな桃がどんぶらこ、どんぶらこと流れてきました。'

function generateQuiz(segmentType: string): {
  question: string
  choices: [string, string, string, string]
  correctIndex: number
} {
  if (segmentType === 'shunkan') {
    const word = FLASH_WORDS[Math.floor(Math.random() * FLASH_WORDS.length)]
    const wrong = FLASH_WORDS.filter((w) => w !== word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const choices = [...wrong, word].sort(() => Math.random() - 0.5) as [
      string,
      string,
      string,
      string,
    ]
    return {
      question: '今表示された言葉は?',
      choices,
      correctIndex: choices.indexOf(word),
    }
  }

  // Default comprehension quiz
  const quizzes = [
    {
      question: 'おじいさんはどこへ行きましたか?',
      choices: ['川', '山', '海', '森'] as [string, string, string, string],
      correctIndex: 1,
    },
    {
      question: '川から流れてきたものは?',
      choices: ['りんご', 'すいか', '桃', 'みかん'] as [string, string, string, string],
      correctIndex: 2,
    },
    {
      question: 'おばあさんは川で何をしていましたか?',
      choices: ['釣り', '洗濯', '水泳', '散歩'] as [string, string, string, string],
      correctIndex: 1,
    },
  ]
  return quizzes[Math.floor(Math.random() * quizzes.length)]
}

// ========== Segment type labels ==========

const SEGMENT_LABELS: Record<string, string> = {
  shunkan: '瞬間認識トレーニング',
  block: 'ブロック読みトレーニング',
  output: 'アウトプットトレーニング',
  reading_speed: '読書速度測定',
}

// ========== State machine ==========

type SessionState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'segment_active'; segmentIndex: number }
  | { phase: 'segment_test'; segmentIndex: number }
  | { phase: 'summary' }

export default function TrainingSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const menuId = searchParams.get('menu')
  const stepId = searchParams.get('step')

  const [state, setState] = useState<SessionState>({ phase: 'loading' })
  const [student, setStudent] = useState<LoggedInStudent | null>(null)
  const [segments, setSegments] = useState<MenuSegment[]>([])
  const [session, setSession] = useState<TrainingSession | null>(null)
  const [results, setResults] = useState<SegmentTestResult[]>([])
  const [evaluation, setEvaluation] = useState<StepEvaluation | null>(null)

  // For shunkan flash
  const [flashWord, setFlashWord] = useState<string | null>(null)
  const [showFlash, setShowFlash] = useState(false)

  // Initialize session
  useEffect(() => {
    async function init() {
      if (!menuId || !stepId) {
        setState({ phase: 'error', message: 'メニューが指定されていません' })
        return
      }

      try {
        const loggedIn = await getLoggedInStudent()
        if (!loggedIn) {
          router.push('/login')
          return
        }
        setStudent(loggedIn)

        const menuSegments = await getMenuSegments(menuId, loggedIn.id)
        const activeSegments = menuSegments.filter((s) => !s.should_skip)

        if (activeSegments.length === 0) {
          setState({ phase: 'error', message: '実行するセグメントがありません' })
          return
        }

        setSegments(activeSegments)

        const newSession = await startTrainingSession(loggedIn.id, menuId, stepId)
        setSession(newSession)

        setState({ phase: 'segment_active', segmentIndex: 0 })
      } catch (err) {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'エラーが発生しました',
        })
      }
    }

    init()
  }, [menuId, stepId, router])

  // Handle flash word for shunkan segments
  useEffect(() => {
    if (
      state.phase === 'segment_active' &&
      segments[state.segmentIndex]?.segment_type === 'shunkan'
    ) {
      const word = FLASH_WORDS[Math.floor(Math.random() * FLASH_WORDS.length)]
      setFlashWord(word)
      setShowFlash(true)
      const timer = setTimeout(() => setShowFlash(false), 800)
      return () => clearTimeout(timer)
    }
  }, [state, segments])

  const handleTimerComplete = useCallback(() => {
    if (state.phase !== 'segment_active') return
    const seg = segments[state.segmentIndex]

    if (seg.has_test) {
      setState({ phase: 'segment_test', segmentIndex: state.segmentIndex })
    } else {
      moveToNextSegment(state.segmentIndex)
    }
  }, [state, segments])

  const handleSkipToTest = useCallback(() => {
    if (state.phase !== 'segment_active') return
    const seg = segments[state.segmentIndex]

    if (seg.has_test) {
      setState({ phase: 'segment_test', segmentIndex: state.segmentIndex })
    } else {
      moveToNextSegment(state.segmentIndex)
    }
  }, [state, segments])

  function moveToNextSegment(currentIndex: number) {
    const nextIndex = currentIndex + 1
    if (nextIndex >= segments.length) {
      finishSession()
    } else {
      setState({ phase: 'segment_active', segmentIndex: nextIndex })
    }
  }

  async function handleQuizAnswer(
    segmentIndex: number,
    _selectedIndex: number,
    isCorrect: boolean
  ) {
    if (!session || !student) return

    const seg = segments[segmentIndex]
    const totalQ = 1
    const correctCount = isCorrect ? 1 : 0

    try {
      const result = await submitSegmentTest(
        session.id,
        student.id,
        seg.segment_type,
        totalQ,
        correctCount
      )
      setResults((prev) => [...prev, result])
    } catch {
      // Continue even if save fails
    }

    // Wait a moment for the answer reveal, then move on
    setTimeout(() => {
      moveToNextSegment(segmentIndex)
    }, 300)
  }

  async function finishSession() {
    if (!session || !student) {
      setState({ phase: 'summary' })
      return
    }

    const totalCorrect = results.reduce((s, r) => s + r.correct_count, 0)
    const totalQ = results.reduce((s, r) => s + r.total_questions, 0)
    const avgAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 100

    try {
      const evalResult = await completeTrainingSession(
        session.id,
        student.id,
        avgAccuracy
      )
      setEvaluation(evalResult)
    } catch {
      // Show summary even if eval fails
    }

    setState({ phase: 'summary' })
  }

  // ========== Render ==========

  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-500">準備中...</p>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600 dark:text-red-400">{state.message}</p>
          <button
            type="button"
            onClick={() => router.push('/training')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            メニューに戻る
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'summary') {
    return (
      <SessionSummary
        results={results}
        evaluation={evaluation}
        onFinish={() => router.push('/training')}
      />
    )
  }

  const currentSegment = segments[state.segmentIndex]
  const segmentLabel =
    SEGMENT_LABELS[currentSegment.segment_type] ?? currentSegment.segment_type

  // Test phase
  if (state.phase === 'segment_test') {
    const quiz = generateQuiz(currentSegment.segment_type)

    return (
      <div>
        <SegmentHeader
          label={segmentLabel}
          current={state.segmentIndex + 1}
          total={segments.length}
          subtitle="テスト"
        />
        <QuizCard
          question={quiz.question}
          choices={quiz.choices}
          correctIndex={quiz.correctIndex}
          onAnswer={(selected, isCorrect) =>
            handleQuizAnswer(state.segmentIndex, selected, isCorrect)
          }
        />
      </div>
    )
  }

  // Active segment phase
  return (
    <div>
      <SegmentHeader
        label={segmentLabel}
        current={state.segmentIndex + 1}
        total={segments.length}
      />

      <div className="mb-6">
        <Timer
          key={`seg-${state.segmentIndex}`}
          durationSec={currentSegment.duration_sec}
          onComplete={handleTimerComplete}
          label="残り時間"
        />
      </div>

      {/* Segment content */}
      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        {currentSegment.segment_type === 'shunkan' && (
          <div className="flex min-h-[200px] items-center justify-center">
            {showFlash ? (
              <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                {flashWord}
              </p>
            ) : (
              <p className="text-zinc-400">
                {flashWord ? '表示された言葉を覚えてください' : '準備中...'}
              </p>
            )}
          </div>
        )}

        {currentSegment.segment_type === 'block' && (
          <div className="min-h-[200px]">
            <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
              {PLACEHOLDER_TEXT}
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              ブロック単位で素早く読み取ってください
            </p>
          </div>
        )}

        {currentSegment.segment_type === 'output' && (
          <div className="min-h-[200px]">
            <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
              {PLACEHOLDER_TEXT}
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              内容を理解しながら読み進めてください
            </p>
          </div>
        )}

        {currentSegment.segment_type === 'reading_speed' && (
          <div className="min-h-[200px]">
            <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
              {PLACEHOLDER_TEXT}
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              普段のスピードで読んでください。読み終わったら「次へ」を押してください。
            </p>
          </div>
        )}

        {!['shunkan', 'block', 'output', 'reading_speed'].includes(
          currentSegment.segment_type
        ) && (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-zinc-400">
              {segmentLabel} - コンテンツ準備中
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSkipToTest}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
        >
          次へ
        </button>
      </div>
    </div>
  )
}

function SegmentHeader({
  label,
  current,
  total,
  subtitle,
}: {
  label: string
  current: number
  total: number
  subtitle?: string
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {label}
          {subtitle && (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              - {subtitle}
            </span>
          )}
        </h3>
        <span className="text-sm text-zinc-500">
          {current} / {total}
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  )
}
