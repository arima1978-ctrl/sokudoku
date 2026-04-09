'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SpeedMeasurement from '@/components/training/SpeedMeasurement'
import SpeedResultScreen from '@/components/training/SpeedResultScreen'
import WordRecognitionTest from '@/components/training/WordRecognitionTest'
import ContentPicker from '@/components/training/ContentPicker'
import { getRecognitionWords } from '@/app/actions/training'
import { getSpeedContentList } from '@/app/actions/speed'
import DailyResult from '@/components/training/DailyResult'
import GrowthChart from '@/components/training/GrowthChart'
import { getStudentDashboard } from '@/app/actions/history'
import {
  startDailySession,
  updateDailySessionStatus,
  saveSpeedMeasurement,
  recordSpeedHistory,
  getSpeedContent,
} from '@/app/actions/speed'
import { getQuizForContent } from '@/app/actions/training'

interface TrainingHomeProps {
  student: {
    id: string
    name: string
    gradeLevelId: string
    subjectId: string
  }
  progress: {
    phaseId: string
    phaseName: string
    stepId: string
    stepName: string
  }
  stats: {
    totalSessions: number
    latestWpm: number | null
  }
  basicMenus: Array<Record<string, unknown>>
  genreMenus: Array<Record<string, unknown>>
  subjects: Array<{ id: string; name: string; icon: string | null }>
}

type FlowPhase =
  | 'menu_select'
  | 'pre_speed_loading'
  | 'pre_content_select'  // 生徒がコンテンツ選択(前)
  | 'pre_speed'
  | 'pre_speed_test'      // 単語認識テスト(前)
  | 'pre_speed_result'    // 計測結果表示 → ボタンでトレーニングへ
  | 'training'
  | 'post_speed_loading'
  | 'post_content_select' // 生徒がコンテンツ選択(後)
  | 'post_speed'
  | 'post_speed_test'     // 単語認識テスト(後)
  | 'post_speed_result'   // 計測結果表示 → ボタンで最終サマリーへ
  | 'result'

interface SpeedContentData {
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

const DURATION_CONFIG: Record<number, { label: string; desc: string; color: string; icon: string }> = {
  10: { label: '10分', desc: 'ウォーミングアップ', color: 'border-green-400 bg-green-50 hover:bg-green-100', icon: '⚡' },
  20: { label: '20分', desc: 'トレーニング+読書', color: 'border-blue-400 bg-blue-50 hover:bg-blue-100', icon: '📖' },
  30: { label: '30分', desc: 'フルコース', color: 'border-purple-400 bg-purple-50 hover:bg-purple-100', icon: '🏆' },
}

export default function TrainingHome({ student, progress, stats, basicMenus, genreMenus, subjects }: TrainingHomeProps) {
  const router = useRouter()
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('menu_select')
  const [dailySessionId, setDailySessionId] = useState<string | null>(null)
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(0)
  // コース種別 選択状態(null=未選択, 'basic'|'genre'=選択済み)
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'genre' | null>(null)
  // ジャンル別の場合の選択subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  // ジャンル別コースは basic メニューを使い回す(現時点では別のメニューは用意していない)
  const menus = selectedCategory === 'genre' ? (genreMenus.length > 0 ? genreMenus : basicMenus) : basicMenus
  // 実際にセッションで使う subjectId: ジャンル別選択中は選んだ値、それ以外は既定
  const effectiveSubjectId = selectedCategory === 'genre' && selectedSubjectId ? selectedSubjectId : student.subjectId

  // 速度計測用
  const [speedContent, setSpeedContent] = useState<SpeedContentData | null>(null)
  const [speedQuiz, setSpeedQuiz] = useState<QuizData | null>(null)
  const [preWpm, setPreWpm] = useState<number | null>(null)
  const [postWpm, setPostWpm] = useState<number | null>(null)
  // 単語認識テスト用
  const [recognitionWords, setRecognitionWords] = useState<{ in_words: string[]; decoy_words: string[] }>({ in_words: [], decoy_words: [] })
  const [pendingSpeedResult, setPendingSpeedResult] = useState<{
    charCount: number
    readingTimeSec: number
  } | null>(null)
  // コンテンツ選択用
  const [contentList, setContentList] = useState<Array<{ id: string; title: string; body: string; char_count: number }>>([])
  const mountedRef = useRef(true)
  const [trainingResults, setTrainingResults] = useState<Array<{ segment: string; accuracy: number }>>([])
  const [activeTab, setActiveTab] = useState<'training' | 'growth'>('training')
  const [dashboardData, setDashboardData] = useState<Awaited<ReturnType<typeof getStudentDashboard>> | null>(null)

  // 成長記録タブ切り替え時にデータ取得
  async function loadDashboard() {
    if (dashboardData) { setActiveTab('growth'); return }
    const data = await getStudentDashboard(student.id)
    setDashboardData(data)
    setActiveTab('growth')
  }

  // メニュー選択 → daily_session 開始 → 速度計測(前)
  async function handleMenuSelect(menuId: string, durationMin: number) {
    setSelectedMenuId(menuId)
    setSelectedDuration(durationMin)
    setFlowPhase('pre_speed_loading')

    try {
      const session = await startDailySession(student.id, durationMin)
      setDailySessionId(session.id)

      // 速度計測用コンテンツのリストを取得して選択画面へ
      const list = await getSpeedContentList(student.gradeLevelId, effectiveSubjectId)
      if (!list || list.length === 0) {
        // コンテンツがない場合は速度計測をスキップしてトレーニングへ
        await updateDailySessionStatus(session.id, 'training')
        setFlowPhase('training')
        router.push(`/training/session?menu=${menuId}&step=${progress.stepId}&daily=${session.id}`)
        return
      }
      setContentList(list)
      setSpeedQuiz(null)
      setFlowPhase('pre_content_select')
    } catch {
      setFlowPhase('menu_select')
    }
  }

  // コンテンツ選択(前) → speedContent セットして pre_speed へ
  const handlePreContentPick = useCallback((contentId: string) => {
    const picked = contentList.find(c => c.id === contentId)
    if (!picked) return
    setSpeedContent(picked)
    setFlowPhase('pre_speed')
  }, [contentList])

  // コンテンツ選択(後) → speedContent セットして post_speed へ
  const handlePostContentPick = useCallback((contentId: string) => {
    const picked = contentList.find(c => c.id === contentId)
    if (!picked) return
    setSpeedContent(picked)
    setFlowPhase('post_speed')
  }, [contentList])

  // 速度計測(前)完了 → 単語認識テストへ
  const handlePreSpeedComplete = useCallback(async (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => {
    if (!dailySessionId || !speedContent) return
    setPendingSpeedResult({ charCount: result.charCount, readingTimeSec: result.readingTimeSec })
    try {
      const words = await getRecognitionWords(speedContent.id)
      if (!mountedRef.current) return
      setRecognitionWords(words)
    } catch {
      if (!mountedRef.current) return
      setRecognitionWords({ in_words: [], decoy_words: [] })
    }
    if (!mountedRef.current) return
    setFlowPhase('pre_speed_test')
  }, [dailySessionId, speedContent])

  // 単語認識テスト(前)完了 → 保存 → 結果画面
  const handlePreRecognitionComplete = useCallback(async (correct: number, total: number) => {
    if (!dailySessionId || !speedContent || !pendingSpeedResult) return
    const saved = await saveSpeedMeasurement(
      dailySessionId, student.id, speedContent.id, 'pre',
      pendingSpeedResult.charCount, pendingSpeedResult.readingTimeSec,
      total, correct,
    )
    setPreWpm(saved.wpm)
    await recordSpeedHistory(student.id, saved.wpm, saved.quiz_accuracy, speedContent.id)
    setPendingSpeedResult(null)
    setFlowPhase('pre_speed_result')
  }, [dailySessionId, speedContent, student.id, pendingSpeedResult])

  // pre_speed_result → トレーニング開始
  const proceedToTraining = useCallback(async () => {
    if (!dailySessionId) return
    await updateDailySessionStatus(dailySessionId, 'training')
    setFlowPhase('training')
    router.push(`/training/session?menu=${selectedMenuId}&step=${progress.stepId}&daily=${dailySessionId}`)
  }, [dailySessionId, selectedMenuId, progress.stepId, router])

  // トレーニング完了後（sessionページから戻ってきた場合）の処理は
  // searchParamsで制御するので、ここでは post_speed を開始する関数を用意
  const startPostSpeed = useCallback(async () => {
    if (!dailySessionId) return
    setFlowPhase('post_speed_loading')

    try {
      await updateDailySessionStatus(dailySessionId, 'post_speed')
      const list = await getSpeedContentList(student.gradeLevelId, effectiveSubjectId)
      if (!list || list.length === 0) {
        await updateDailySessionStatus(dailySessionId, 'completed')
        setFlowPhase('result')
        return
      }
      setContentList(list)
      setSpeedQuiz(null)
      setFlowPhase('post_content_select')
    } catch {
      setFlowPhase('result')
    }
  }, [dailySessionId, student.gradeLevelId, effectiveSubjectId])

  // 速度計測(後)完了 → 単語認識テストへ
  const handlePostSpeedComplete = useCallback(async (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => {
    if (!dailySessionId || !speedContent) return
    setPendingSpeedResult({ charCount: result.charCount, readingTimeSec: result.readingTimeSec })
    try {
      const words = await getRecognitionWords(speedContent.id)
      if (!mountedRef.current) return
      setRecognitionWords(words)
    } catch {
      if (!mountedRef.current) return
      setRecognitionWords({ in_words: [], decoy_words: [] })
    }
    if (!mountedRef.current) return
    setFlowPhase('post_speed_test')
  }, [dailySessionId, speedContent])

  // 単語認識テスト(後)完了 → 保存 → 最終結果へ
  const handlePostRecognitionComplete = useCallback(async (correct: number, total: number) => {
    if (!dailySessionId || !speedContent || !pendingSpeedResult) return
    const saved = await saveSpeedMeasurement(
      dailySessionId, student.id, speedContent.id, 'post',
      pendingSpeedResult.charCount, pendingSpeedResult.readingTimeSec,
      total, correct,
    )
    setPostWpm(saved.wpm)
    await recordSpeedHistory(student.id, saved.wpm, saved.quiz_accuracy, speedContent.id)
    await updateDailySessionStatus(dailySessionId, 'completed')
    setPendingSpeedResult(null)
    setFlowPhase('post_speed_result')
  }, [dailySessionId, speedContent, student.id, pendingSpeedResult])

  // unmount フラグ
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 認識単語が未登録のテスト画面に入った場合、副作用で自動スキップ（レンダー中setter呼び出しを回避）
  useEffect(() => {
    if (flowPhase !== 'pre_speed_test' && flowPhase !== 'post_speed_test') return
    const wordsMissing =
      recognitionWords.in_words.length < 5 || recognitionWords.decoy_words.length < 5
    if (!wordsMissing) return
    if (flowPhase === 'pre_speed_test') {
      handlePreRecognitionComplete(0, 0)
    } else {
      handlePostRecognitionComplete(0, 0)
    }
  }, [flowPhase, recognitionWords, handlePreRecognitionComplete, handlePostRecognitionComplete])

  // ========== Render ==========

  // ローディング
  if (flowPhase === 'pre_speed_loading' || flowPhase === 'post_speed_loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-zinc-500">速度計測を準備中...</p>
        </div>
      </div>
    )
  }

  // 速度計測(前)
  if (flowPhase === 'pre_speed' && speedContent) {
    return (
      <SpeedMeasurement
        content={speedContent}
        quiz={null}
        type="pre"
        onComplete={handlePreSpeedComplete}
      />
    )
  }

  // 速度計測(後)
  if (flowPhase === 'post_speed' && speedContent) {
    return (
      <SpeedMeasurement
        content={speedContent}
        quiz={null}
        type="post"
        onComplete={handlePostSpeedComplete}
      />
    )
  }

  // コンテンツ選択(前)
  if (flowPhase === 'pre_content_select') {
    return (
      <ContentPicker
        label="速度計測(トレーニング前)"
        items={contentList}
        onPick={handlePreContentPick}
      />
    )
  }

  // コンテンツ選択(後)
  if (flowPhase === 'post_content_select') {
    return (
      <ContentPicker
        label="速度計測(トレーニング後)"
        items={contentList}
        onPick={handlePostContentPick}
      />
    )
  }

  // 単語認識テスト(前)
  if (flowPhase === 'pre_speed_test') {
    const wordsMissing =
      recognitionWords.in_words.length < 5 || recognitionWords.decoy_words.length < 5
    if (wordsMissing) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-500">認識単語が未登録のためスキップします...</p>
        </div>
      )
    }
    return (
      <WordRecognitionTest
        inWords={recognitionWords.in_words}
        decoyWords={recognitionWords.decoy_words}
        onComplete={handlePreRecognitionComplete}
      />
    )
  }

  // 単語認識テスト(後)
  if (flowPhase === 'post_speed_test') {
    const wordsMissing =
      recognitionWords.in_words.length < 5 || recognitionWords.decoy_words.length < 5
    if (wordsMissing) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-500">認識単語が未登録のためスキップします...</p>
        </div>
      )
    }
    return (
      <WordRecognitionTest
        inWords={recognitionWords.in_words}
        decoyWords={recognitionWords.decoy_words}
        onComplete={handlePostRecognitionComplete}
      />
    )
  }

  // 速度計測(前) 結果画面
  if (flowPhase === 'pre_speed_result' && preWpm !== null) {
    return (
      <SpeedResultScreen
        label="計測結果（トレーニング前）"
        wpm={preWpm}
        buttonLabel="トレーニングを始める"
        onNext={proceedToTraining}
      />
    )
  }

  // 速度計測(後) 結果画面
  if (flowPhase === 'post_speed_result' && postWpm !== null) {
    const diff = preWpm !== null ? postWpm - preWpm : null
    return (
      <SpeedResultScreen
        label="計測結果（トレーニング後）"
        wpm={postWpm}
        diffFromPre={diff}
        buttonLabel="結果サマリーへ"
        onNext={() => setFlowPhase('result')}
      />
    )
  }

  // 結果表示
  if (flowPhase === 'result') {
    return (
      <DailyResult
        preWpm={preWpm}
        postWpm={postWpm}
        trainingResults={trainingResults}
        onFinish={() => {
          setFlowPhase('menu_select')
          setDailySessionId(null)
          setPreWpm(null)
          setPostWpm(null)
          setTrainingResults([])
        }}
      />
    )
  }

  // メニュー選択（デフォルト画面）
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* 挨拶 */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-zinc-900">
          {student.name}さん、こんにちは
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {progress.phaseName} - {progress.stepName}
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="mb-6 flex rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('training')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === 'training' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          トレーニング
        </button>
        <button
          type="button"
          onClick={loadDashboard}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            activeTab === 'growth' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          成長記録
        </button>
      </div>

      {activeTab === 'growth' && dashboardData ? (
        <GrowthChart
          speedHistory={dashboardData.speedHistory}
          testHistory={dashboardData.testHistory}
          latestWpm={dashboardData.latestWpm}
          growthRate={dashboardData.growthRate}
          avgAccuracy={dashboardData.avgAccuracy}
        />
      ) : (
        <>
          {/* 統計カード */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs text-zinc-500">読書速度</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">
                {stats.latestWpm ? `${stats.latestWpm} 文字/分` : '-'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs text-zinc-500">セッション数</div>
              <div className="mt-1 text-lg font-bold text-zinc-900">{stats.totalSessions} 回</div>
            </div>
          </div>

          {/* ジャンル別コース選択中 かつ subject 未選択 → ジャンル選択 */}
          {selectedCategory === 'genre' && selectedSubjectId === null && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">ジャンルを選択</h3>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← 戻る
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 bg-white p-4 text-center transition-colors hover:border-orange-400 hover:bg-orange-50"
                  >
                    <span className="text-3xl">{sub.icon ?? '📚'}</span>
                    <span className="text-sm font-bold text-zinc-900">{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* コース種別 未選択 → カテゴリ選択画面 */}
          {selectedCategory === null && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-center text-lg font-semibold text-zinc-900">
                コース種別を選択
              </h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('basic')}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-blue-400 bg-blue-50 p-5 text-left transition-colors hover:bg-blue-100"
                >
                  <span className="text-4xl">📚</span>
                  <div>
                    <div className="text-lg font-bold text-zinc-900">速読基本トレーニング</div>
                    <div className="text-xs text-zinc-500">
                      瞬間よみ・ブロックよみ・アウトプットの基本トレーニング
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('genre')}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-orange-400 bg-orange-50 p-5 text-left transition-colors hover:bg-orange-100"
                >
                  <span className="text-4xl">🎯</span>
                  <div>
                    <div className="text-lg font-bold text-zinc-900">ジャンル別コース</div>
                    <div className="text-xs text-zinc-500">
                      日本史・理科・情報・古文など教科別の速読トレーニング
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 時間選択画面: basic はカテゴリ選択後すぐ、genre は subject 選択後 */}
          {(selectedCategory === 'basic' || (selectedCategory === 'genre' && selectedSubjectId !== null)) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">
                  {selectedCategory === 'basic'
                    ? '速読基本: 時間を選択'
                    : `${subjects.find(s => s.id === selectedSubjectId)?.name ?? ''}: 時間を選択`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCategory === 'genre' && selectedSubjectId !== null) {
                      setSelectedSubjectId(null)
                    } else {
                      setSelectedCategory(null)
                    }
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← 戻る
                </button>
              </div>

              {menus.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
                  <p className="text-sm text-zinc-500">
                    {selectedCategory === 'genre'
                      ? 'ジャンル別コースは準備中です'
                      : 'メニューが登録されていません'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {menus.map((menu) => {
                    const duration = menu.duration_min as number
                    const menuId = menu.id as string
                    const config = DURATION_CONFIG[duration]
                    if (!config) return null
                    return (
                      <button
                        key={menuId}
                        type="button"
                        onClick={() => handleMenuSelect(menuId, duration)}
                        className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${config.color}`}
                      >
                        <span className="text-3xl">{config.icon}</span>
                        <div>
                          <div className="text-lg font-bold text-zinc-900">{config.label}コース</div>
                          <div className="text-xs text-zinc-500">{config.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="mt-4 text-center text-xs text-zinc-400">
                速度計測 → トレーニング → 速度計測 の流れで進みます
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
