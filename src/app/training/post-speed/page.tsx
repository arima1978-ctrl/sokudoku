'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'
import SpeedMeasurement from '@/components/training/SpeedMeasurement'
import DailyResult from '@/components/training/DailyResult'
import {
  getSpeedContent,
  saveSpeedMeasurement,
  updateDailySessionStatus,
  recordSpeedHistory,
} from '@/app/actions/speed'
import { getQuizForContent } from '@/app/actions/training'

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

export default function PostSpeedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dailySessionId = searchParams.get('daily')

  const [phase, setPhase] = useState<'loading' | 'measuring' | 'result'>('loading')
  const [student, setStudent] = useState<LoggedInStudent | null>(null)
  const [content, setContent] = useState<SpeedContentData | null>(null)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [postWpm, setPostWpm] = useState<number | null>(null)

  useEffect(() => {
    async function init() {
      if (!dailySessionId) { router.push('/training'); return }

      const loggedIn = await getLoggedInStudent()
      if (!loggedIn) { router.push('/login'); return }
      setStudent(loggedIn)

      await updateDailySessionStatus(dailySessionId, 'post_speed')

      const speedContent = await getSpeedContent(
        loggedIn.grade_level_id ?? 'g4',
        loggedIn.preferred_subject_id ?? 'story',
      )
      if (!speedContent) {
        await updateDailySessionStatus(dailySessionId, 'completed')
        setPhase('result')
        return
      }
      setContent(speedContent)

      const quizData = await getQuizForContent(speedContent.id)
      if (quizData && quizData.questions.length > 0) {
        const q = quizData.questions[0]
        setQuiz({
          question: q.question_text,
          choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
          correctIndex: Math.max(0, ['A', 'B', 'C', 'D'].indexOf(q.correct)),
        })
      }

      setPhase('measuring')
    }
    init()
  }, [dailySessionId, router])

  const handleComplete = useCallback(async (result: {
    charCount: number
    readingTimeSec: number
    quizCorrect?: number
    quizTotal?: number
  }) => {
    if (!dailySessionId || !student || !content) return

    const saved = await saveSpeedMeasurement(
      dailySessionId, student.id, content.id, 'post',
      result.charCount, result.readingTimeSec,
      result.quizTotal, result.quizCorrect,
    )
    setPostWpm(saved.wpm)
    await recordSpeedHistory(student.id, saved.wpm, saved.quiz_accuracy, content.id)
    await updateDailySessionStatus(dailySessionId, 'completed')
    setPhase('result')
  }, [dailySessionId, student, content])

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-zinc-500">速度計測を準備中...</p>
        </div>
      </div>
    )
  }

  if (phase === 'measuring' && content) {
    return (
      <SpeedMeasurement
        content={content}
        quiz={quiz}
        type="post"
        onComplete={handleComplete}
      />
    )
  }

  return (
    <DailyResult
      preWpm={null}
      postWpm={postWpm}
      trainingResults={[]}
      onFinish={() => router.push('/training')}
    />
  )
}
