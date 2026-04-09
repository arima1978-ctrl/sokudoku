'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ShunkanDisplay from '@/components/training/ShunkanDisplay'
import VerticalBlockReader from '@/components/training/VerticalBlockReader'
import WordRecognitionTest from '@/components/training/WordRecognitionTest'
import ContentPicker from '@/components/training/ContentPicker'
import type { ReadingMode } from '@/components/training/VerticalBlockReader'
import { FLASH_TIMING, BLOCK_CONFIG } from '@/lib/trainingConfig'
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
  getFastReadInitialCpm,
  getFastReadCurrentMode,
  getRecognitionWords,
  saveFastReadResult,
  type MenuSegment,
  type SegmentTestResult,
  type StepEvaluation,
  type TrainingSession,
} from '@/app/actions/training'
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'

// ========== たてブロックよみ モード昇格マップ ==========
const MODE_UPGRADE: Record<ReadingMode, ReadingMode> = {
  '3point': '2point',
  '2point': '1line',
  '1line': '2line',
  '2line': '2line', // 最上位
}

// 現在モードの C_line 値（1カウントあたりの行消化数）
const C_LINE_BY_MODE: Record<ReadingMode, number> = {
  '3point': 3,
  '2point': 2,
  '1line': 1,
  '2line': 0.5,
}

/** cpm × (1行文字数 / C_line) で字/分換算 */
function calcWpmFor(cpm: number, mode: ReadingMode): number {
  return Math.round((cpm / C_LINE_BY_MODE[mode]) * BLOCK_CONFIG.verticalSplitWord)
}

// ========== 種目ラベル ==========
const SEGMENT_LABELS: Record<string, string> = {
  barabara: 'ばらばら瞬間よみ',
  shunkan_tate_1line: 'たて1行瞬間よみ',
  shunkan_tate_2line: 'たて2行瞬間よみ',
  shunkan_yoko_1line: 'よこ1行瞬間よみ',
  shunkan_yoko_2line: 'よこ2行瞬間よみ',
  koe_e: '声になる文 / 絵になる文',
  koe_bun: '声になる文',
  e_bun: '絵になる文',
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
  koe_bun: 'tate_1line',
  e_bun: 'tate_1line',
}

function isShunkanType(type: string) {
  return type in DISPLAY_TYPE_MAP
}

// ========== State machine ==========
type SessionState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'segment_active'; segmentIndex: number }
  | { phase: 'segment_intro'; segmentIndex: number }  // トレーニング種目表示
  | { phase: 'test_start'; segmentIndex: number }    // テスト開始合図
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
  const dailySessionId = searchParams.get('daily')

  const [state, setState] = useState<SessionState>({ phase: 'loading' })
  const [student, setStudent] = useState<LoggedInStudent | null>(null)
  const [segments, setSegments] = useState<MenuSegment[]>([])
  const [session, setSession] = useState<TrainingSession | null>(null)
  const [results, setResults] = useState<SegmentTestResult[]>([])
  const [evaluation, setEvaluation] = useState<StepEvaluation | null>(null)
  const [paused, setPaused] = useState(false)

  // コンテンツ
  const [shunkanWords, setShunkanWords] = useState<{ body: string; answer?: string }[]>([])
  // たて1行/たて2行用: その日の koe or e プール(日替わり)
  const [todayStylePool, setTodayStylePool] = useState<{ body: string; answer?: string }[]>([])
  const [todayStyle, setTodayStyle] = useState<'koe' | 'e'>('koe')
  const [normalShunkan, setNormalShunkan] = useState<{ body: string; answer?: string }[]>([])
  const [readingText, setReadingText] = useState<{ id: string; title: string; body: string } | null>(null)
  const [fastReadInitialCpm, setFastReadInitialCpm] = useState<number>(60) // たてブロックよみ初期CPM
  const [fastReadInitialMode, setFastReadInitialMode] = useState<ReadingMode>('3point')
  // 高速読みのステージ: picker → reading → test → done
  const [fastReadStage, setFastReadStage] = useState<'picker' | 'reading' | 'test' | 'done'>('picker')
  const [fastReadContentList, setFastReadContentList] = useState<Array<{ id: string; title: string; body: string; char_count: number }>>([])
  const [fastReadResult, setFastReadResult] = useState<{
    maxCpm: number
    finalCpm: number
    finalMode: ReadingMode
    maxWpm: number
  } | null>(null)
  const [recognitionWords, setRecognitionWords] = useState<{ in_words: string[]; decoy_words: string[] }>({ in_words: [], decoy_words: [] })
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null)
  const [testWord, setTestWord] = useState<{ body: string }>({ body: '' }) // テスト中の正解単語
  const [testPhaseInner, setTestPhaseInner] = useState<'flash' | 'quiz'>('flash') // テスト内部状態
  const lastFlashedWord = useRef<string>('')
  const flashedWords = useRef<string[]>([])
  const mountedRef = useRef(true)
  const [questionCount, setQuestionCount] = useState(0)
  const [testRound, setTestRound] = useState(0)       // テスト現在の問番号(0-9)
  const [testCorrect, setTestCorrect] = useState(0)   // テスト正解数
  const TEST_TOTAL = 5                                 // テスト全5問

  // unmount フラグ管理
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // セグメント切替時: たて1行/たて2行のときその日のスタイル(koe or e)プールを使う
  useEffect(() => {
    if (!('segmentIndex' in state)) return
    const seg = segments[state.segmentIndex]
    if (!seg) return
    if (seg.segment_type === 'shunkan_tate_1line' || seg.segment_type === 'shunkan_tate_2line') {
      if (todayStylePool.length > 0) {
        setShunkanWords(todayStylePool)
        return
      }
    }
    if (normalShunkan.length > 0) {
      setShunkanWords(normalShunkan)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, segments, todayStylePool, normalShunkan])

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

        // ログイン単位で koe / e を切替(cookie に保存された値を使用)
        const loginStyle: 'koe' | 'e' = loggedIn.koe_e_style ?? 'koe'
        setTodayStyle(loginStyle)

        const [shunkan, styledContent, reading, fastCpm, fastMode] = await Promise.all([
          getShunkanContent(grade, 1, 'normal'),
          getShunkanContent(grade, undefined, loginStyle),
          getReadingContent(grade),
          getFastReadInitialCpm(loggedIn.id),
          getFastReadCurrentMode(loggedIn.id),
        ])
        setFastReadInitialCpm(fastCpm)
        setFastReadInitialMode(fastMode)

        const normalPool = shunkan.map(c => ({ body: c.body, answer: c.body }))
        setNormalShunkan(normalPool)

        const stylePool = styledContent.map(c => ({ body: c.body, answer: c.body }))
        setTodayStylePool(stylePool)

        // 初期表示用(たて系以外に使う)
        setShunkanWords(normalPool)
        if (reading.length > 0) {
          // 高速読み用のコンテンツリスト（生徒が選択）
          setFastReadContentList(
            reading.map(r => ({
              id: r.id as string,
              title: r.title as string,
              body: r.body as string,
              char_count: (r.char_count as number) ?? (r.body as string).length,
            }))
          )
          // 初期 readingText は未選択状態(null)のまま - 選択画面で決定
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
        // 最初の種目名を表示してから開始
        setState({ phase: 'segment_intro', segmentIndex: 0 })
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : 'エラーが発生しました' })
      }
    }
    init()
  }, [menuId, stepId, router])

  // 瞬間読みテスト: ShunkanDisplayと同じフラッシュ→消えたら4択表示
  function prepareShunkanTest(segIdx: number) {
    const pool = shunkanWords.length > 0 ? shunkanWords : [{ body: '---' }]
    const correct = pool[Math.floor(Math.random() * pool.length)]
    setTestWord(correct)
    setTestPhaseInner('flash')
    // 4択を事前に準備
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
    setState({ phase: 'test_flash', segmentIndex: segIdx })
  }

  // テスト中のShunkanDisplay「解答」クリック → 4択表示に切替
  function handleTestFlashAnswer() {
    setTestPhaseInner('quiz')
    if ('segmentIndex' in state) {
      setState({ phase: 'test_answer', segmentIndex: state.segmentIndex })
    }
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
      // テスト開始合図画面を表示
      setState({ phase: 'test_start', segmentIndex: state.segmentIndex })
    } else {
      moveToNextSegment(state.segmentIndex)
    }
  }, [state, segments])

  // テスト開始合図 → 実際のテストへ
  function startTestFromAnnounce(segIdx: number) {
    const seg = segments[segIdx]
    if (isShunkanType(seg.segment_type)) {
      setTestRound(0)
      setTestCorrect(0)
      prepareShunkanTest(segIdx)
    } else {
      setState({ phase: 'segment_test', segmentIndex: segIdx })
    }
  }

  // 開発用キーボードショートカット
  //   N : 現フェーズを完了して次のフェーズへ順送り
  //       トレーニング → テスト → 次のトレーニング → 次のテスト → ...
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    function onKey(ev: KeyboardEvent) {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return
      if (ev.key !== 'n' && ev.key !== 'N') return
      if (!('segmentIndex' in state)) return

      const idx = state.segmentIndex
      const seg = segments[idx]
      if (!seg) return

      if (state.phase === 'segment_intro') {
        // 紹介 → トレーニング開始
        setState({ phase: 'segment_active', segmentIndex: idx })
      } else if (state.phase === 'segment_active') {
        // トレーニング中 → テストへ(or 次セグメント)
        if (seg.has_test) {
          setState({ phase: 'test_start', segmentIndex: idx })
        } else {
          moveToNextSegment(idx)
        }
      } else if (state.phase === 'test_start') {
        // テスト開始合図 → 実テスト画面
        startTestFromAnnounce(idx)
      } else if (state.phase === 'test_flash' || state.phase === 'test_answer' || state.phase === 'segment_test') {
        // テスト中 → スキップして次セグメントへ
        moveToNextSegment(idx)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, segments])

  function moveToNextSegment(currentIndex: number) {
    const nextIndex = currentIndex + 1
    if (nextIndex >= segments.length) {
      finishSession()
    } else {
      setCurrentQuiz(null)
      setQuestionCount(prev => prev + 1)
      // 次セグメントへ進む前に reading_speed 用ステージをリセット
      setFastReadStage('picker')
      setFastReadResult(null)
      setRecognitionWords({ in_words: [], decoy_words: [] })
      // 次の種目名を表示してから開始
      setState({ phase: 'segment_intro', segmentIndex: nextIndex })
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

  // ========== 種目紹介画面 ==========
  if (state.phase === 'segment_intro') {
    const introSegment = segments[state.segmentIndex]
    const introLabel = SEGMENT_LABELS[introSegment.segment_type] ?? introSegment.segment_type
    const segNum = state.segmentIndex + 1
    const segTotal = segments.length
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="text-center px-6">
          <div className="mb-3 text-sm text-zinc-500">{segNum} / {segTotal}</div>
          <div className="mb-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white">
            次のトレーニング
          </div>
          <h2 className="mb-3 text-2xl font-bold text-zinc-900">{introLabel}</h2>
          <p className="mb-8 text-sm text-zinc-500">
            {`${Math.round(introSegment.duration_sec / 60 * 10) / 10}分間のトレーニングです`}
          </p>
          <button
            type="button"
            onClick={() => setState({ phase: 'segment_active', segmentIndex: state.segmentIndex })}
            style={{
              padding: '14px 48px', borderRadius: 28,
              border: '2px solid #E6C200',
              background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
              color: '#333', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            スタート
          </button>
        </div>
      </div>
    )
  }

  // ========== テスト開始合図画面 ==========
  if (state.phase === 'test_start') {
    const testSegment = segments[state.segmentIndex]
    const testLabel = SEGMENT_LABELS[testSegment.segment_type] ?? testSegment.segment_type
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="text-center px-6">
          <div className="mb-4 inline-block rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white animate-pulse">
            テスト開始
          </div>
          <h2 className="mb-3 text-2xl font-bold text-zinc-900">{testLabel}</h2>
          <p className="mb-2 text-sm text-zinc-600">
            {isShunkanType(testSegment.segment_type) ? '10問出題されます' : '内容理解テストです'}
          </p>
          <p className="mb-8 text-sm text-zinc-500">
            各問題は10秒以内に回答してください
          </p>
          <button
            type="button"
            onClick={() => startTestFromAnnounce(state.segmentIndex)}
            style={{
              padding: '14px 48px', borderRadius: 28,
              background: 'linear-gradient(180deg, #ff6b6b 0%, #ee5a24 100%)',
              border: '2px solid #c0392b',
              color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            テストを始める
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
        onFinish={() => {
          if (dailySessionId) {
            // dailyフローの場合: 速度計測(後)へ遷移
            router.push(`/training/post-speed?daily=${dailySessionId}`)
          } else {
            router.push('/training')
          }
        }}
        finishLabel={dailySessionId ? '速度計測へ進む' : 'メニューに戻る'}
      />
    )
  }

  const currentSegment = segments[state.segmentIndex]
  const segmentLabel = SEGMENT_LABELS[currentSegment.segment_type] ?? currentSegment.segment_type

  // ========== 瞬間読みテスト: トレーニングと同じフラッシュ → 消えたら4択 ==========
  if (state.phase === 'test_flash' || state.phase === 'test_answer') {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        {/* タイマーの代わりにテスト進捗 */}
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#666' }}>{segmentLabel} テスト</span>
            <span style={{ fontSize: 14, color: '#333', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {testRound + 1} / {TEST_TOTAL}
            </span>
          </div>
        </div>

        <div style={{ padding: '12px 16px' }}>
          {/* フラッシュ中: トレーニングと同じShunkanDisplay（1語のみ、ボタン非表示） */}
          {testPhaseInner === 'flash' && (
            <ShunkanDisplay
              key={`test-${testRound}`}
              words={[testWord]}
              displayType={(DISPLAY_TYPE_MAP[currentSegment.segment_type] ?? 'barabara') as 'barabara' | 'tate_1line' | 'tate_2line' | 'yoko_1line' | 'yoko_2line'}
              hideButtons
              onHidden={handleTestFlashAnswer}
            />
          )}

          {/* 4択表示（フラッシュ消えた後） */}
          {testPhaseInner === 'quiz' && currentQuiz && (
            <div>
              <p style={{ textAlign: 'center', fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 20 }}>
                何と書いてありましたか？
              </p>
              <QuizCard
                question={currentQuiz.question}
                choices={currentQuiz.choices}
                correctIndex={currentQuiz.correctIndex}
                timeLimitSec={5}
                onAnswer={handleQuizAnswer}
              />
            </div>
          )}
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
            timeLimitSec={5}
            onAnswer={handleQuizAnswer}
          />
        </div>
      </div>
    )
  }

  // ========== 高速読み（reading_speed = たてブロックよみ）専用全画面 ==========
  // 仕様: 元サイト「たてブロックよみ」準拠。11行 × cond2ブロック/行 の縦書きグリッドを
  //       ピンク帯で順次ハイライト。8カウントごとに +1 CPM（青天井）。
  //       初期CPMは 24h以内=前回×0.8 / 24h超=前回×0.6 / 初回=60。
  if (currentSegment.segment_type === 'reading_speed') {
    // Stage 0: コンテンツ選択
    if (fastReadStage === 'picker') {
      return (
        <ContentPicker
          label="高速読みトレーニング"
          items={fastReadContentList}
          onPick={(contentId) => {
            const picked = fastReadContentList.find(c => c.id === contentId)
            if (!picked) return
            setReadingText({ id: picked.id, title: picked.title, body: picked.body })
            setFastReadStage('reading')
          }}
        />
      )
    }

    if (!readingText) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )
    }

    // Stage 1: トレーニング実行
    if (fastReadStage === 'reading') {
      return (
        <VerticalBlockReader
          title={readingText.title}
          body={readingText.body}
          durationSec={currentSegment.duration_sec}
          initialCpm={fastReadInitialCpm}
          initialMode={fastReadInitialMode}
          onComplete={(result) => {
            setFastReadResult(result)
            // 認識単語を取得してテスト画面へ（unmount 後は state 反映しない）
            getRecognitionWords(readingText.id)
              .then(words => {
                if (!mountedRef.current) return
                setRecognitionWords(words)
                setFastReadStage('test')
              })
              .catch(() => {
                if (!mountedRef.current) return
                // 取得失敗時はテストをスキップして結果保存+次セグメント
                if (student) saveFastReadResult(student.id, result.maxCpm, result.finalMode).catch(() => {})
                moveToNextSegment(state.segmentIndex)
              })
          }}
        />
      )
    }

    // Stage 2: 単語認識テスト
    if (fastReadStage === 'test' && fastReadResult) {
      // 単語未登録なら即スキップ
      if (recognitionWords.in_words.length < 5 || recognitionWords.decoy_words.length < 5) {
        if (student) {
          saveFastReadResult(student.id, fastReadResult.maxCpm, fastReadResult.finalMode).catch(() => {})
        }
        setFastReadStage('done')
        setTimeout(() => moveToNextSegment(state.segmentIndex), 0)
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-zinc-500">認識テスト単語が未登録のためスキップします...</p>
          </div>
        )
      }
      return (
        <WordRecognitionTest
          inWords={recognitionWords.in_words}
          decoyWords={recognitionWords.decoy_words}
          onComplete={(correct, total) => {
            const accuracy = correct / total
            const passed = accuracy >= 0.9
            // 初期モードでの開始WPMを計算し、到達WPMが上回れば「速度向上」と判定
            const startWpm = calcWpmFor(fastReadInitialCpm, fastReadInitialMode)
            const wpmImproved = fastReadResult.maxWpm > startWpm
            // 合格 AND 速度向上 で次モードに昇格
            const nextMode: ReadingMode = passed && wpmImproved
              ? MODE_UPGRADE[fastReadResult.finalMode]
              : fastReadResult.finalMode

            if (session && student) {
              saveFastReadResult(student.id, fastReadResult.maxCpm, nextMode).catch(() => {})
              submitSegmentTest(
                session.id,
                student.id,
                'reading_speed',
                total,
                correct
              )
                .then(r => setResults(prev => [...prev, r]))
                .catch(() => {})
            }
            setFastReadStage('done')
            moveToNextSegment(state.segmentIndex)
          }}
        />
      )
    }

    // done → 次セグメントに進む間の空白
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
        {/* たて系セグメントでは「声になる文」「絵になる文」のいずれかをバッジ表示 */}
        {(currentSegment.segment_type === 'shunkan_tate_1line' ||
          currentSegment.segment_type === 'shunkan_tate_2line' ||
          currentSegment.segment_type === 'shunkan_yoko_1line' ||
          currentSegment.segment_type === 'shunkan_yoko_2line') && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '16px 48px',
                borderRadius: 40,
                background: todayStyle === 'koe' ? '#1478C3' : '#dd4b39',
                color: '#fff',
                fontSize: 36,
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '3px solid #fff',
              }}
            >
              {todayStyle === 'koe' ? '声になる文' : '絵になる文'}
            </span>
          </div>
        )}
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

          {/* reading_speed は専用全画面で表示（上のブロックで処理済み） */}
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
