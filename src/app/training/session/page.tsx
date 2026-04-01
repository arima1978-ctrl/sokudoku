'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ShunkanDisplay from '@/components/training/ShunkanDisplay'
import TrainingTimer from '@/components/training/TrainingTimer'
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

// ========== 種目ラベル ==========
const SEGMENT_LABELS: Record<string, string> = {
  barabara: 'ばらばら瞬間よみ',
  shunkan_tate_1line: 'たて1行瞬間よみ',
  shunkan_tate_2line: 'たて2行瞬間よみ',
  shunkan_yoko_1line: 'よこ1行瞬間よみ',
  shunkan_yoko_2line: 'よこ2行瞬間よみ',
  koe_e: '声になる文 / 絵になる文',
  block_tate: 'たてブロックよみ',
  block_yoko: 'よこブロックよみ',
  output_tate: 'たてアウトプット',
  output_yoko: 'よこアウトプット',
  reading_speed: '読書速度計測',
}

// segment_type → ShunkanDisplay の displayType
const DISPLAY_TYPE_MAP: Record<string, string> = {
  barabara: 'barabara',
  shunkan_tate_1line: 'tate_1line',
  shunkan_tate_2line: 'tate_2line',
  shunkan_yoko_1line: 'yoko_1line',
  shunkan_yoko_2line: 'yoko_2line',
  koe_e: 'tate_1line',
}

function isShunkanType(type: string) {
  return type in DISPLAY_TYPE_MAP
}

// ========== State machine ==========
type SessionState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'segment_active'; segmentIndex: number }
  | { phase: 'segment_test'; segmentIndex: number }
  | { phase: 'summary' }

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
  const [paused, setPaused] = useState(false)

  // コンテンツ
  const [shunkanWords, setShunkanWords] = useState<{ body: string; answer?: string }[]>([])
  const [readingText, setReadingText] = useState<{ id: string; title: string; body: string } | null>(null)
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null)
  const lastFlashedWord = useRef<string>('')
  const [questionCount, setQuestionCount] = useState(0)

  // 初期化
  useEffect(() => {
    async function init() {
      if (!menuId || !stepId) {
        setState({ phase: 'error', message: 'メニューが指定されていません' })
        return
      }
      try {
        const loggedIn = await getLoggedInStudent()
        if (!loggedIn) { router.push('/login'); return }
        setStudent(loggedIn)

        const grade = loggedIn.grade_level_id || 'g4'
        const [shunkan, reading] = await Promise.all([
          getShunkanContent(grade, 1), // レベル1のコンテンツ
          getReadingContent(grade),
        ])
        setShunkanWords(shunkan.map(c => ({ body: c.body, answer: c.body })))
        if (reading.length > 0) {
          const r = reading[Math.floor(Math.random() * reading.length)]
          setReadingText({ id: r.id as string, title: r.title as string, body: r.body as string })
        }

        const menuSegments = await getMenuSegments(menuId, loggedIn.id)
        const activeSegments = menuSegments.filter(s => !s.should_skip)
        if (activeSegments.length === 0) {
          setState({ phase: 'error', message: '実行するセグメントがありません' })
          return
        }
        setSegments(activeSegments)

        const newSession = await startTrainingSession(loggedIn.id, menuId, stepId)
        setSession(newSession)
        setState({ phase: 'segment_active', segmentIndex: 0 })
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' })
      }
    }
    init()
  }, [menuId, stepId, router])

  // テスト問題生成
  useEffect(() => {
    if (state.phase !== 'segment_test') return
    const seg = segments[state.segmentIndex]

    if (isShunkanType(seg.segment_type)) {
      // レベル1のコンテンツからテスト出題
      // 練習で表示した単語の中からランダムに正解を選び、他の単語を不正解にする
      const correctWord = lastFlashedWord.current || shunkanWords[0]?.body || '---'
      // 不正解の選択肢はレベル1の短い単語（shunkanWords）から選ぶ
      const others = shunkanWords
        .filter(w => w.body !== correctWord)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.body)
      while (others.length < 3) others.push('---')
      const choices = [...others, correctWord].sort(() => Math.random() - 0.5) as [string, string, string, string]
      setCurrentQuiz({
        question: '練習で表示された言葉はどれですか？',
        choices,
        correctIndex: choices.indexOf(correctWord),
      })
    } else if (readingText) {
      getQuizForContent(readingText.id).then(quiz => {
        if (quiz && quiz.questions.length > 0) {
          const q = quiz.questions[Math.floor(Math.random() * quiz.questions.length)]
          const choices = [q.choice_a, q.choice_b, q.choice_c, q.choice_d] as [string, string, string, string]
          setCurrentQuiz({
            question: q.question_text,
            choices,
            correctIndex: Math.max(0, ['A', 'B', 'C', 'D'].indexOf(q.correct)),
          })
        } else {
          const first = readingText.body.slice(0, 40) + '...'
          setCurrentQuiz({
            question: 'この文章の冒頭に書かれていた内容は？',
            choices: [first, 'それは別の内容です', 'まったく違う話でした', '思い出せません'],
            correctIndex: 0,
          })
        }
      })
    }
  }, [state, segments, shunkanWords, readingText])

  const handleTimerComplete = useCallback(() => {
    if (state.phase !== 'segment_active') return
    const seg = segments[state.segmentIndex]
    if (seg.has_test) {
      // 練習時間終了 → テストへ
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
      setQuestionCount(prev => prev + 1)
      setState({ phase: 'segment_active', segmentIndex: nextIndex })
    }
  }

  async function handleQuizAnswer(_selected: number, isCorrect: boolean) {
    if (!session || !student || state.phase !== 'segment_test') return
    const seg = segments[state.segmentIndex]
    try {
      const result = await submitSegmentTest(session.id, student.id, seg.segment_type, 1, isCorrect ? 1 : 0)
      setResults(prev => [...prev, result])
    } catch { /* continue */ }
    setTimeout(() => moveToNextSegment(state.segmentIndex), 1000)
  }

  async function finishSession() {
    if (!session || !student) { setState({ phase: 'summary' }); return }
    const totalCorrect = results.reduce((s, r) => s + r.correct_count, 0)
    const totalQ = results.reduce((s, r) => s + r.total_questions, 0)
    const avgAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 100
    try {
      const evalResult = await completeTrainingSession(session.id, student.id, avgAccuracy)
      setEvaluation(evalResult)
    } catch { /* show summary */ }
    setState({ phase: 'summary' })
  }

  // ========== Render ==========

  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-gray-500">トレーニングを準備中...</p>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{state.message}</p>
          <button type="button" onClick={() => router.push('/training')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">メニューに戻る</button>
        </div>
      </div>
    )
  }

  if (state.phase === 'summary') {
    return <SessionSummary results={results} evaluation={evaluation} onFinish={() => router.push('/training')} />
  }

  const currentSegment = segments[state.segmentIndex]
  const segmentLabel = SEGMENT_LABELS[currentSegment.segment_type] ?? currentSegment.segment_type

  // ========== テスト画面 ==========
  if (state.phase === 'segment_test' && currentQuiz) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* ヘッダー */}
          <div className="mb-4 rounded-lg px-4 py-2" style={{ background: 'linear-gradient(90deg, #1478C3 0%, #00345B 100%)' }}>
            <span className="text-white font-bold">{segmentLabel}</span>
            <span className="ml-3 text-blue-200 text-sm">テスト</span>
          </div>
          {/* テスト開始表示 */}
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-300 px-4 py-3 text-center">
            <span className="text-yellow-800 font-bold text-sm">
              練習終了！テストに答えてください
            </span>
          </div>
          <QuizCard
            question={currentQuiz.question}
            choices={currentQuiz.choices}
            correctIndex={currentQuiz.correctIndex}
            onAnswer={handleQuizAnswer}
          />
        </div>
      </div>
    )
  }

  // ========== トレーニング画面（既存デザイン準拠） ==========
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* ヘッダー：青バー */}
        <div className="mb-3 rounded-lg px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #1478C3 0%, #00345B 100%)' }}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push('/training')}
              className="text-blue-200 hover:text-white text-sm">← 戻る</button>
            <span className="text-white font-bold text-base">{segmentLabel}</span>
          </div>
          <span className="text-blue-200 text-sm">
            {state.segmentIndex + 1} / {segments.length}
          </span>
        </div>

        {/* タイマー */}
        <div className="mb-4">
          <TrainingTimer
            key={`timer-${state.segmentIndex}`}
            durationSec={currentSegment.duration_sec}
            onComplete={handleTimerComplete}
            paused={paused}
            onPauseToggle={() => setPaused(p => !p)}
          />
        </div>

        {/* トレーニング表示エリア */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4" style={{ minHeight: '480px' }}>
          {isShunkanType(currentSegment.segment_type) && shunkanWords.length > 0 && (
            <ShunkanDisplay
              words={shunkanWords}
              displayType={(DISPLAY_TYPE_MAP[currentSegment.segment_type] ?? 'tate_1line') as 'barabara' | 'tate_1line' | 'tate_2line' | 'yoko_1line' | 'yoko_2line'}
              onFlash={(w) => { lastFlashedWord.current = w }}
            />
          )}

          {(currentSegment.segment_type === 'block_tate' || currentSegment.segment_type === 'block_yoko') && readingText && (
            <div className="h-full flex flex-col">
              <div className="flex items-center border-2 border-blue-500 rounded-md overflow-hidden mb-4">
                <span className="shrink-0 bg-blue-600 text-white font-bold px-4 py-2 text-sm">コンテンツ</span>
                <span className="flex-1 px-4 py-2 text-sm text-gray-700 truncate">{readingText.title}</span>
              </div>
              <div
                className="flex-1 overflow-y-auto px-4"
                style={{
                  writingMode: currentSegment.segment_type === 'block_tate' ? 'vertical-rl' : 'horizontal-tb',
                  fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
                  fontSize: '20px',
                  lineHeight: '2',
                  minHeight: '400px',
                }}
              >
                {readingText.body.slice(0, 3000)}
              </div>
            </div>
          )}

          {(currentSegment.segment_type === 'output_tate' || currentSegment.segment_type === 'output_yoko') && readingText && (
            <div className="h-full flex flex-col">
              <div className="flex items-center border-2 border-green-500 rounded-md overflow-hidden mb-4">
                <span className="shrink-0 bg-green-600 text-white font-bold px-4 py-2 text-sm">アウトプット</span>
                <span className="flex-1 px-4 py-2 text-sm text-gray-700 truncate">{readingText.title}</span>
              </div>
              <div
                className="flex-1 overflow-y-auto px-4"
                style={{
                  writingMode: currentSegment.segment_type === 'output_tate' ? 'vertical-rl' : 'horizontal-tb',
                  fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
                  fontSize: '20px',
                  lineHeight: '2',
                  minHeight: '400px',
                }}
              >
                {readingText.body.slice(0, 3000)}
              </div>
            </div>
          )}

          {currentSegment.segment_type === 'reading_speed' && readingText && (
            <div className="h-full flex flex-col">
              <div className="flex items-center border-2 border-amber-500 rounded-md overflow-hidden mb-4">
                <span className="shrink-0 bg-amber-500 text-white font-bold px-4 py-2 text-sm">読書速度計測</span>
                <span className="flex-1 px-4 py-2 text-sm text-gray-700">{readingText.body.length}文字</span>
              </div>
              <div
                className="flex-1 overflow-y-auto px-6"
                style={{
                  fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
                  fontSize: '18px',
                  lineHeight: '2.2',
                  minHeight: '400px',
                }}
              >
                {readingText.body.slice(0, 3000)}
              </div>
              <p className="mt-3 text-center text-sm text-gray-400">
                読み終わったら「次へ」を押してください
              </p>
            </div>
          )}
        </div>

        {/* 次へボタン（黄色スタートボタン風） */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              const seg = segments[state.segmentIndex]
              if (seg.has_test) {
                setState({ phase: 'segment_test', segmentIndex: state.segmentIndex })
              } else {
                moveToNextSegment(state.segmentIndex)
              }
            }}
            className="rounded-full px-10 py-3 text-base font-bold shadow-md transition-transform hover:scale-105"
            style={{
              background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
              color: '#333',
              border: '2px solid #E6C200',
            }}
          >
            次へ →
          </button>
        </div>
      </div>
    </div>
  )
}
