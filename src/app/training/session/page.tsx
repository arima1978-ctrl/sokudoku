'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ShunkanDisplay from '@/components/training/ShunkanDisplay'
import { FLASH_TIMING } from '@/lib/trainingConfig'
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
  | { phase: 'test_flash'; segmentIndex: number }   // テスト: ばらばらフラッシュ中
  | { phase: 'test_answer'; segmentIndex: number }   // テスト: 4択回答
  | { phase: 'segment_test'; segmentIndex: number }  // テスト: 長文系
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
  const [testFlashWord, setTestFlashWord] = useState<string>('')
  const [testFlashVisible, setTestFlashVisible] = useState(false)
  const lastFlashedWord = useRef<string>('')
  const flashedWords = useRef<string[]>([])
  const [questionCount, setQuestionCount] = useState(0)
  const [testRound, setTestRound] = useState(0)       // テスト現在の問番号(0-9)
  const [testCorrect, setTestCorrect] = useState(0)   // テスト正解数
  const TEST_TOTAL = 10                                // テスト全10問

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

  // 瞬間読みテスト: フラッシュ→4択の準備
  function prepareShunkanTest(segIdx: number) {
    // ランダムに1語選んでフラッシュ
    const pool = shunkanWords.length > 0 ? shunkanWords : [{ body: '---' }]
    const correct = pool[Math.floor(Math.random() * pool.length)]
    setTestFlashWord(correct.body)
    setTestFlashVisible(true)
    setState({ phase: 'test_flash', segmentIndex: segIdx })

    // 0.4秒後に消して4択へ
    setTimeout(() => {
      setTestFlashVisible(false)
      // 4択を生成
      const others = shunkanWords
        .filter(w => w.body !== correct.body)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.body)
      while (others.length < 3) others.push('---')
      const choices = [...others, correct.body].sort(() => Math.random() - 0.5) as [string, string, string, string]
      setCurrentQuiz({
        question: '何と書いてありましたか？',
        choices,
        correctIndex: choices.indexOf(correct.body),
      })
      setState({ phase: 'test_answer', segmentIndex: segIdx })
    }, FLASH_TIMING.showMs)
  }

  // テスト問題生成（長文系）
  useEffect(() => {
    if (state.phase !== 'segment_test') return
    const seg = segments[state.segmentIndex]

    if (readingText) {
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
      if (isShunkanType(seg.segment_type)) {
        // 瞬間読みテスト: フラッシュ→4択を10回
        setTestRound(0)
        setTestCorrect(0)
        prepareShunkanTest(state.segmentIndex)
      } else {
        // 長文系テスト
        setState({ phase: 'segment_test', segmentIndex: state.segmentIndex })
      }
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
    if (!session || !student) return
    if (!('segmentIndex' in state)) return
    const seg = segments[state.segmentIndex]

    // 瞬間読みテスト（10回繰り返し）
    if (state.phase === 'test_answer') {
      if (isCorrect) setTestCorrect(c => c + 1)
      const nextRound = testRound + 1

      if (nextRound < TEST_TOTAL) {
        // 次の問題（1秒待ってからフラッシュ）
        setTestRound(nextRound)
        setTimeout(() => prepareShunkanTest(state.segmentIndex), 1000)
      } else {
        // 10問終了 → 結果をDBに保存して次のセグメントへ
        const finalCorrect = isCorrect ? testCorrect + 1 : testCorrect
        try {
          const result = await submitSegmentTest(session.id, student.id, seg.segment_type, TEST_TOTAL, finalCorrect)
          setResults(prev => [...prev, result])
        } catch { /* continue */ }
        setTimeout(() => moveToNextSegment(state.segmentIndex), 1000)
      }
      return
    }

    // 長文系テスト（1回）
    if (state.phase === 'segment_test') {
      try {
        const result = await submitSegmentTest(session.id, student.id, seg.segment_type, 1, isCorrect ? 1 : 0)
        setResults(prev => [...prev, result])
      } catch { /* continue */ }
      setTimeout(() => moveToNextSegment(state.segmentIndex), 1000)
    }
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

  // ========== 瞬間読みテスト: フラッシュ表示中 ==========
  if (state.phase === 'test_flash') {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div style={{ padding: '16px' }}>
          <div className="mb-4 rounded-lg px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #1478C3 0%, #00345B 100%)' }}>
            <div>
              <span className="text-white font-bold">{segmentLabel}</span>
              <span className="ml-3 text-blue-200 text-sm">テスト</span>
            </div>
            <span className="text-white text-sm font-mono">{testRound + 1} / {TEST_TOTAL}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', borderRadius: 8,
            width: '100%', aspectRatio: '1 / 1', maxHeight: 'calc(100vh - 180px)',
          }}>
            {testFlashVisible ? (
              <BarabaraFlash text={testFlashWord} />
            ) : (
              <span style={{ color: '#ccc', fontSize: 18 }}>...</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ========== 瞬間読みテスト: 4択回答 ==========
  if (state.phase === 'test_answer' && currentQuiz) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="mb-4 rounded-lg px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #1478C3 0%, #00345B 100%)' }}>
            <div>
              <span className="text-white font-bold">{segmentLabel}</span>
              <span className="ml-3 text-blue-200 text-sm">テスト</span>
            </div>
            <span className="text-white text-sm font-mono">{testRound + 1} / {TEST_TOTAL}</span>
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

  // ========== 長文系テスト画面 ==========
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
  // 既存レイアウト: タイマー(最上部) → 解答バー+表示エリア(白背景一体)
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
      {/* ===== 最上部: タイマーバー ===== */}
      <div style={{ padding: '8px 16px 0' }}>
        <TrainingTimer
          key={`timer-${state.segmentIndex}`}
          durationSec={currentSegment.duration_sec}
          onComplete={handleTimerComplete}
          paused={paused}
          onPauseToggle={() => setPaused(p => !p)}
        />
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div style={{ padding: '12px 16px' }}>
        {isShunkanType(currentSegment.segment_type) && shunkanWords.length > 0 && (
          <ShunkanDisplay
            words={shunkanWords}
            displayType={(DISPLAY_TYPE_MAP[currentSegment.segment_type] ?? 'tate_1line') as 'barabara' | 'tate_1line' | 'tate_2line' | 'yoko_1line' | 'yoko_2line'}
            onFlash={(w) => {
              lastFlashedWord.current = w
              if (!flashedWords.current.includes(w)) flashedWords.current.push(w)
            }}
          />
        )}

          {(currentSegment.segment_type === 'block_tate' || currentSegment.segment_type === 'block_yoko') && readingText && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, minHeight: 480 }}>
              <div style={{ display: 'flex', border: '2px solid #0084E8', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <span style={{ background: '#0084E8', color: '#fff', fontWeight: 'bold', padding: '8px 16px', fontSize: 14 }}>コンテンツ</span>
                <span style={{ flex: 1, padding: '8px 16px', fontSize: 14, color: '#666' }}>{readingText.title}</span>
              </div>
              <div style={{
                writingMode: currentSegment.segment_type === 'block_tate' ? 'vertical-rl' : 'horizontal-tb',
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 20, lineHeight: 2,
                overflowY: 'auto', minHeight: 400,
              }}>
                {readingText.body.slice(0, 3000)}
              </div>
            </div>
          )}

          {(currentSegment.segment_type === 'output_tate' || currentSegment.segment_type === 'output_yoko') && readingText && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, minHeight: 480 }}>
              <div style={{ display: 'flex', border: '2px solid #00aa6e', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <span style={{ background: '#00aa6e', color: '#fff', fontWeight: 'bold', padding: '8px 16px', fontSize: 14 }}>アウトプット</span>
                <span style={{ flex: 1, padding: '8px 16px', fontSize: 14, color: '#666' }}>{readingText.title}</span>
              </div>
              <div style={{
                writingMode: currentSegment.segment_type === 'output_tate' ? 'vertical-rl' : 'horizontal-tb',
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 20, lineHeight: 2,
                overflowY: 'auto', minHeight: 400,
              }}>
                {readingText.body.slice(0, 3000)}
              </div>
            </div>
          )}

          {currentSegment.segment_type === 'reading_speed' && readingText && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, minHeight: 480 }}>
              <div style={{ display: 'flex', border: '2px solid #f59e0b', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <span style={{ background: '#f59e0b', color: '#fff', fontWeight: 'bold', padding: '8px 16px', fontSize: 14 }}>読書速度計測</span>
                <span style={{ flex: 1, padding: '8px 16px', fontSize: 14, color: '#666' }}>{readingText.body.length}文字</span>
              </div>
              <div style={{
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 18, lineHeight: 2.2,
                overflowY: 'auto', minHeight: 400, padding: '0 8px',
              }}>
                {readingText.body.slice(0, 3000)}
              </div>
              <p style={{ textAlign: 'center', color: '#999', fontSize: 14, marginTop: 12 }}>
                読み終わったら「次へ」を押してください
              </p>
            </div>
          )}
          {/* ブロック/アウトプット/読書速度の「次へ」ボタン */}
          {!isShunkanType(currentSegment.segment_type) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
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
                style={{
                  padding: '12px 48px', borderRadius: 28,
                  border: '2px solid #E6C200',
                  background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
                  color: '#333', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                }}
              >
                {'次へ \u2192'}
              </button>
            </div>
          )}
        </div>
      </div>
  )
}

/** テスト用ばらばらフラッシュ表示 */
function BarabaraFlash({ text }: { text: string }) {
  const chars = text.split('')
  const cx = 50, cy = 50, r = 38
  const positions = chars.map((_, i) => ({
    x: cx + r * Math.cos((i / chars.length) * 2 * Math.PI - Math.PI / 2),
    y: cy + r * Math.sin((i / chars.length) * 2 * Math.PI - Math.PI / 2),
  }))
  const shuffled = [...positions].sort(() => Math.random() - 0.5)

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
      {chars.map((c, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${shuffled[i].x}%`, top: `${shuffled[i].y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: 96,
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 500,
          color: '#000', lineHeight: 1, userSelect: 'none',
        }}>{c}</span>
      ))}
    </div>
  )
}
