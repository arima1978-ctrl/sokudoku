'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SpeedMeasurement from '@/components/training/SpeedMeasurement'
import DailyResult from '@/components/training/DailyResult'
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
  menus: Array<Record<string, unknown>>
}

type FlowPhase =
  | 'menu_select'
  | 'pre_speed_loading'
  | 'pre_speed'
  | 'training'
  | 'post_speed_loading'
  | 'post_speed'
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

const DURATION_CONFIG: Record<number, { label: string; color: string; icon: string }> = {
  7:  { label: '7分', color: 'border-green-400 bg-green-50 hover:bg-green-100', icon: '⚡' },
  15: { label: '15分', color: 'border-blue-400 bg-blue-50 hover:bg-blue-100', icon: '📖' },
  30: { label: '30分', color: 'border-purple-400 bg-purple-50 hover:bg-purple-100', icon: '🏆' },
}

export default function TrainingHome({ student, progress, stats, menus }: TrainingHomeProps) {
  const router = useRouter()
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('menu_select')
  const [dailySessionId, setDailySessionId] = useState<string | null>(null)
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(0)

  // 速度計測用
  const [speedContent, setSpeedContent] = useState<SpeedContentData | null>(null)
  const [speedQuiz, setSpeedQuiz] = useState<QuizData | null>(null)
  const [preWpm, setPreWpm] = useState<number | null>(null)
  const [postWpm, setPostWpm] = useState<number | null>(null)
  const [trainingResults, setTrainingResults] = useState<Array<{ segment: string; accuracy: number }>>([])

  // メニュー選択 → daily_session 開始 → 速度計測(前)
  async function handleMenuSelect(menuId: string, durationMin: number) {
    setSelectedMenuId(menuId)
    setSelectedDuration(durationMin)
    setFlowPhase('pre_speed_loading')

    try {
      const session = await startDailySession(student.id, durationMin)
      setDailySessionId(session.id)

      // 速度計測用コンテンツを取得
      const content = await getSpeedContent(student.gradeLevelId, student.subjectId)
      if (!content) {
        // コンテンツがない場合は速度計測をスキップしてトレーニングへ
        await updateDailySessionStatus(session.id, 'training')
        setFlowPhase('training')
        router.push(`/training/session?menu=${menuId}&step=${progress.stepId}&daily=${session.id}`)
        return
      }
      setSpeedContent(content)

      // クイズ取得
      const quizData = await getQuizForContent(content.id)
      if (quizData && quizData.questions.length > 0) {
        const q = quizData.questions[0]
        setSpeedQuiz({
          question: q.question_text,
          choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
          correctIndex: Math.max(0, ['A', 'B', 'C', 'D'].indexOf(q.correct)),
        })
      } else {
        setSpeedQuiz(null)
      }

      setFlowPhase('pre_speed')
    } catch {
      setFlowPhase('menu_select')
    }
  }

  // 速度計測(前)完了
  const handlePreSpeedComplete = useCallback(async (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => {
    if (!dailySessionId || !speedContent) return

    const saved = await saveSpeedMeasurement(
      dailySessionId, student.id, speedContent.id, 'pre',
      result.charCount, result.readingTimeSec,
      result.quizTotal, result.quizCorrect,
    )
    setPreWpm(saved.wpm)
    await recordSpeedHistory(student.id, saved.wpm, saved.quiz_accuracy, speedContent.id)

    // トレーニングへ遷移
    await updateDailySessionStatus(dailySessionId, 'training')
    setFlowPhase('training')
    router.push(`/training/session?menu=${selectedMenuId}&step=${progress.stepId}&daily=${dailySessionId}`)
  }, [dailySessionId, speedContent, student.id, selectedMenuId, progress.stepId, router])

  // トレーニング完了後（sessionページから戻ってきた場合）の処理は
  // searchParamsで制御するので、ここでは post_speed を開始する関数を用意
  const startPostSpeed = useCallback(async () => {
    if (!dailySessionId) return
    setFlowPhase('post_speed_loading')

    try {
      await updateDailySessionStatus(dailySessionId, 'post_speed')
      const content = await getSpeedContent(student.gradeLevelId, student.subjectId)
      if (!content) {
        await updateDailySessionStatus(dailySessionId, 'completed')
        setFlowPhase('result')
        return
      }
      setSpeedContent(content)

      const quizData = await getQuizForContent(content.id)
      if (quizData && quizData.questions.length > 0) {
        const q = quizData.questions[0]
        setSpeedQuiz({
          question: q.question_text,
          choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
          correctIndex: Math.max(0, ['A', 'B', 'C', 'D'].indexOf(q.correct)),
        })
      } else {
        setSpeedQuiz(null)
      }

      setFlowPhase('post_speed')
    } catch {
      setFlowPhase('result')
    }
  }, [dailySessionId, student.gradeLevelId, student.subjectId])

  // 速度計測(後)完了
  const handlePostSpeedComplete = useCallback(async (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => {
    if (!dailySessionId || !speedContent) return

    const saved = await saveSpeedMeasurement(
      dailySessionId, student.id, speedContent.id, 'post',
      result.charCount, result.readingTimeSec,
      result.quizTotal, result.quizCorrect,
    )
    setPostWpm(saved.wpm)
    await recordSpeedHistory(student.id, saved.wpm, saved.quiz_accuracy, speedContent.id)
    await updateDailySessionStatus(dailySessionId, 'completed')
    setFlowPhase('result')
  }, [dailySessionId, speedContent, student.id])

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
        quiz={speedQuiz}
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
        quiz={speedQuiz}
        type="post"
        onComplete={handlePostSpeedComplete}
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

      {/* メニュー選択 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-center text-lg font-semibold text-zinc-900">
          トレーニング時間を選択
        </h3>
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
                  <div className="text-xs text-zinc-500">{menu.description as string}</div>
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          速度計測 → トレーニング → 速度計測 の流れで進みます
        </p>
      </div>
    </div>
  )
}
