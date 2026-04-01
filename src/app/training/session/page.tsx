'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Timer from '@/components/training/Timer'
import QuizCard from '@/components/training/QuizCard'
import SessionSummary from '@/components/training/SessionSummary'
import {
  getMenuSegments,
  startTrainingSession,
  submitSegmentTest,
  completeTrainingSession,
  getShunkanContent,
  getReadingContent,
  getQuizForContent,
  type MenuSegment,
  type SegmentTestResult,
  type StepEvaluation,
  type TrainingSession,
} from '@/app/actions/training'
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'

// ========== Segment type labels ==========

const SEGMENT_LABELS: Record<string, string> = {
  barabara: 'ばらばら読み',
  shunkan_tate_1line: 'たて1行 瞬間よみ',
  shunkan_tate_2line: 'たて2行 瞬間よみ',
  shunkan_yoko_1line: 'よこ1行 瞬間よみ',
  shunkan_yoko_2line: 'よこ2行 瞬間よみ',
  koe_e: '声になる/絵になる',
  block_tate: 'たてブロック読み',
  block_yoko: 'よこブロック読み',
  output_tate: 'たてアウトプット',
  output_yoko: 'よこアウトプット',
  reading_speed: '読書速度計測',
}

function isShunkanType(type: string) {
  return ['barabara', 'shunkan_tate_1line', 'shunkan_tate_2line', 'shunkan_yoko_1line', 'shunkan_yoko_2line', 'koe_e'].includes(type)
}

function isBlockType(type: string) {
  return ['block_tate', 'block_yoko'].includes(type)
}

function isOutputType(type: string) {
  return ['output_tate', 'output_yoko'].includes(type)
}

// ========== State machine ==========

type SessionState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'segment_active'; segmentIndex: number }
  | { phase: 'segment_test'; segmentIndex: number }
  | { phase: 'summary' }

interface ShunkanWord {
  id: string
  body: string
}

interface QuizData {
  question: string
  choices: [string, string, string, string]
  correctIndex: number
}

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

  // Content state
  const [shunkanWords, setShunkanWords] = useState<ShunkanWord[]>([])
  const [flashWord, setFlashWord] = useState<string | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  const [readingText, setReadingText] = useState<{ id: string; title: string; body: string } | null>(null)
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null)
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashIndexRef = useRef(0)

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

        // Load content
        const grade = loggedIn.grade_level_id || 'g4'
        const [shunkan, reading] = await Promise.all([
          getShunkanContent(grade),
          getReadingContent(grade),
        ])
        setShunkanWords(shunkan.map(c => ({ id: c.id, body: c.body })))
        if (reading.length > 0) {
          const r = reading[Math.floor(Math.random() * reading.length)]
          setReadingText({ id: r.id as string, title: r.title as string, body: r.body as string })
        }

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

  // Handle flash words for shunkan segments
  useEffect(() => {
    if (state.phase === 'segment_active' && isShunkanType(segments[state.segmentIndex]?.segment_type)) {
      if (shunkanWords.length === 0) return

      // Flash words periodically
      flashIndexRef.current = Math.floor(Math.random() * shunkanWords.length)
      const word = shunkanWords[flashIndexRef.current]
      setFlashWord(word.body)
      setShowFlash(true)

      flashIntervalRef.current = setInterval(() => {
        flashIndexRef.current = Math.floor(Math.random() * shunkanWords.length)
        const w = shunkanWords[flashIndexRef.current]
        setFlashWord(w.body)
        setShowFlash(true)
        setTimeout(() => setShowFlash(false), 600)
      }, 2000)

      const hideTimer = setTimeout(() => setShowFlash(false), 600)

      return () => {
        if (flashIntervalRef.current) clearInterval(flashIntervalRef.current)
        clearTimeout(hideTimer)
      }
    }
  }, [state, segments, shunkanWords])

  // Generate quiz for test phase
  useEffect(() => {
    if (state.phase !== 'segment_test') return
    const seg = segments[state.segmentIndex]

    if (isShunkanType(seg.segment_type)) {
      // 瞬間読み: 最後に表示された単語を当てる
      const correctWord = flashWord || (shunkanWords[0]?.body ?? '桜の花')
      const others = shunkanWords
        .filter(w => w.body !== correctWord)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.body)

      while (others.length < 3) others.push('---')

      const choices = [...others, correctWord].sort(() => Math.random() - 0.5) as [string, string, string, string]
      setCurrentQuiz({
        question: '今表示された言葉はどれですか？',
        choices,
        correctIndex: choices.indexOf(correctWord),
      })
    } else if (readingText) {
      // 長文: DBにテストがあれば使う、なければ簡易生成
      getQuizForContent(readingText.id).then(quiz => {
        if (quiz && quiz.questions.length > 0) {
          const q = quiz.questions[Math.floor(Math.random() * quiz.questions.length)]
          const choices = [q.choice_a, q.choice_b, q.choice_c, q.choice_d] as [string, string, string, string]
          const correctIdx = ['A', 'B', 'C', 'D'].indexOf(q.correct)
          setCurrentQuiz({
            question: q.question_text,
            choices,
            correctIndex: correctIdx >= 0 ? correctIdx : 0,
          })
        } else {
          // フォールバック: テキストの最初の文を使った簡易クイズ
          const firstSentence = readingText.body.slice(0, 50)
          setCurrentQuiz({
            question: 'この文章の最初に書かれていたことは？',
            choices: [
              firstSentence + '...',
              'それは違う内容です。',
              'まったく別の話でした。',
              '覚えていません。',
            ],
            correctIndex: 0,
          })
        }
      })
    }
  }, [state, segments, flashWord, shunkanWords, readingText])

  const handleTimerComplete = useCallback(() => {
    if (state.phase !== 'segment_active') return
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current)
    const seg = segments[state.segmentIndex]

    if (seg.has_test) {
      setState({ phase: 'segment_test', segmentIndex: state.segmentIndex })
    } else {
      moveToNextSegment(state.segmentIndex)
    }
  }, [state, segments])

  const handleSkipToTest = useCallback(() => {
    if (state.phase !== 'segment_active') return
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current)
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
      setCurrentQuiz(null)
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

    try {
      const result = await submitSegmentTest(
        session.id,
        student.id,
        seg.segment_type,
        1,
        isCorrect ? 1 : 0
      )
      setResults((prev) => [...prev, result])
    } catch {
      // Continue even if save fails
    }

    setTimeout(() => {
      moveToNextSegment(segmentIndex)
    }, 1000)
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
  const segmentLabel = SEGMENT_LABELS[currentSegment.segment_type] ?? currentSegment.segment_type

  // Test phase
  if (state.phase === 'segment_test' && currentQuiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SegmentHeader
          label={segmentLabel}
          current={state.segmentIndex + 1}
          total={segments.length}
          subtitle="テスト"
        />
        <QuizCard
          question={currentQuiz.question}
          choices={currentQuiz.choices}
          correctIndex={currentQuiz.correctIndex}
          onAnswer={(selected, isCorrect) =>
            handleQuizAnswer(state.segmentIndex, selected, isCorrect)
          }
        />
      </div>
    )
  }

  // Active segment phase
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
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
        {isShunkanType(currentSegment.segment_type) && (
          <div className="flex min-h-[200px] items-center justify-center">
            {showFlash ? (
              <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 transition-opacity">
                {flashWord}
              </p>
            ) : (
              <p className="text-lg text-zinc-300 dark:text-zinc-600">・・・</p>
            )}
          </div>
        )}

        {(isBlockType(currentSegment.segment_type) || isOutputType(currentSegment.segment_type)) && readingText && (
          <div className="min-h-[200px]">
            <h4 className="mb-3 text-sm font-medium text-blue-600">{readingText.title}</h4>
            <p className="text-base leading-8 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {readingText.body.slice(0, 2000)}
            </p>
          </div>
        )}

        {currentSegment.segment_type === 'reading_speed' && readingText && (
          <div className="min-h-[200px]">
            <h4 className="mb-3 text-sm font-medium text-green-600">読書速度計測</h4>
            <p className="text-base leading-8 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {readingText.body.slice(0, 2000)}
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              読み終わったら「次へ」を押してください（{readingText.body.length}文字）
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSkipToTest}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          次へ →
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
            <span className="ml-2 text-sm font-normal text-blue-500">
              {subtitle}
            </span>
          )}
        </h3>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {current} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  )
}
