'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getFinalTestEligibility,
  pickFinalTestPack,
  submitFinalTest,
  type FinalTestEligibility,
  type FinalTestSubmitResult,
} from '@/app/actions/finalTest'
import { getLoggedInStudent } from '@/lib/auth'

type Phase = 'loading' | 'intro' | 'ineligible' | 'reading' | 'quiz' | 'result'

interface PackData {
  packId: string
  title: string
  body: string
  charCount: number
  questions: Array<{
    questionNo: number
    questionText: string
    choiceA: string
    choiceB: string
    choiceC: string
    choiceD: string
  }>
}

export default function FinalTestPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [eligibility, setEligibility] = useState<FinalTestEligibility | null>(null)
  const [pack, setPack] = useState<PackData | null>(null)
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({})
  const [achievedCount, setAchievedCount] = useState<number>(0)
  const [result, setResult] = useState<FinalTestSubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const student = await getLoggedInStudent()
      if (!student) {
        router.push('/login')
        return
      }
      setStudentId(student.id)
      const elig = await getFinalTestEligibility(student.id)
      setEligibility(elig)
      if (!elig || !elig.eligible) {
        setPhase('ineligible')
        return
      }
      const p = await pickFinalTestPack(student.id)
      if (!p) {
        setPhase('ineligible')
        return
      }
      setPack(p)
      setPhase('intro')
    })()
  }, [router])

  const startReading = () => setPhase('reading')
  const finishReading = (achieved: number) => {
    setAchievedCount(achieved)
    setPhase('quiz')
  }

  const selectAnswer = (qNo: number, choice: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({ ...prev, [qNo]: choice }))
  }

  const submit = async () => {
    if (!studentId || !pack) return
    setSubmitting(true)
    try {
      const res = await submitFinalTest({
        studentId,
        packId: pack.packId,
        achievedCount,
        answers: pack.questions
          .filter(q => answers[q.questionNo])
          .map(q => ({ questionNo: q.questionNo, selected: answers[q.questionNo] })),
      })
      setResult(res)
      setPhase('result')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'loading') {
    return <div className="p-8 text-center text-zinc-600">読み込み中...</div>
  }

  if (phase === 'ineligible' || !eligibility) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-black mb-4">🚧 まだ受けられません</h1>
        <p className="text-zinc-600 mb-6">
          {eligibility
            ? `あと ${Math.max(0, eligibility.sessionsRequired - eligibility.sessionsCompleted)} 回トレーニングしてから挑戦してね！`
            : 'このステージの修了テストは利用できません。'}
        </p>
        <button
          onClick={() => router.push('/training')}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold"
        >
          トレーニング画面に戻る
        </button>
      </div>
    )
  }

  if (phase === 'intro' && eligibility && pack) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-black mb-2 text-center">🎯 ステージ修了テスト</h1>
        <p className="text-center text-zinc-600 mb-6">{eligibility.stageName}</p>

        <div className="bg-pink-50 border-2 border-pink-300 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">テストの流れ</h2>
          <ol className="space-y-2 text-sm text-zinc-700 list-decimal list-inside">
            <li>目標カウント <strong className="text-pink-600">{eligibility.targetCount}</strong> で高速読みを行う</li>
            <li>読み終わったら内容理解テスト6問</li>
            <li>4問以上正解で <strong className="text-green-600">合格</strong>!</li>
          </ol>
          <p className="text-xs text-zinc-500 mt-3">
            不合格の場合は追加2回トレーニング後に再挑戦できます
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <div className="text-sm text-zinc-500 mb-2">使用するコンテンツ</div>
          <div className="text-lg font-bold mb-3">{pack.title}</div>
          <div className="text-xs text-zinc-400">{pack.charCount}字</div>
        </div>

        <button
          onClick={startReading}
          className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-black text-lg shadow-lg"
        >
          🚀 テストを始める
        </button>
      </div>
    )
  }

  if (phase === 'reading' && pack) {
    return (
      <FinalTestReading
        pack={pack}
        targetCount={eligibility?.targetCount ?? 240}
        onFinish={finishReading}
      />
    )
  }

  if (phase === 'quiz' && pack) {
    const answered = pack.questions.every(q => answers[q.questionNo])
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-black mb-2 text-center">📝 内容理解テスト（6問）</h1>
        <p className="text-center text-zinc-500 text-sm mb-6">
          到達カウント: <strong>{achievedCount}</strong> / 目標 {eligibility?.targetCount}
        </p>

        <div className="space-y-4">
          {pack.questions.map(q => (
            <div key={q.questionNo} className="bg-white rounded-2xl p-5 border border-zinc-200">
              <div className="font-bold mb-3">
                Q{q.questionNo}. {q.questionText}
              </div>
              <div className="space-y-2">
                {(['A', 'B', 'C', 'D'] as const).map(k => (
                  <label
                    key={k}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 ${
                      answers[q.questionNo] === k
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${q.questionNo}`}
                      value={k}
                      checked={answers[q.questionNo] === k}
                      onChange={() => selectAnswer(q.questionNo, k)}
                    />
                    <span className="font-bold">{k}.</span>
                    <span>{q[`choice${k}` as 'choiceA'] as string}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={!answered || submitting}
          className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-black text-lg disabled:opacity-50"
        >
          {submitting ? '採点中...' : '採点する'}
        </button>
      </div>
    )
  }

  if (phase === 'result' && result && eligibility) {
    return <FinalTestResult result={result} stageName={eligibility.stageName} />
  }

  return null
}

// ========== 修了テスト読書画面（簡易版） ==========

function FinalTestReading({
  pack,
  targetCount,
  onFinish,
}: {
  pack: PackData
  targetCount: number
  onFinish: (achievedCount: number) => void
}) {
  const [currentCount, setCurrentCount] = useState(60)
  const [started, setStarted] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!started) return
    const timer = setInterval(() => {
      setElapsedSec(s => s + 1)
      // 8秒ごとに1カウント上昇（実際は8ビートだが簡易実装）
      if ((elapsedSec + 1) % 8 === 0) {
        setCurrentCount(c => c + 1)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [started, elapsedSec])

  if (!started) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h2 className="text-xl font-black mb-4">目標カウント <span className="text-pink-600">{targetCount}</span> まで読もう</h2>
        <p className="text-zinc-600 mb-6 text-sm">
          高速読みが始まります。目標カウントに到達したら、読み終わった位置で「読了」を押してください。
        </p>
        <button
          onClick={() => setStarted(true)}
          className="px-8 py-4 bg-pink-500 text-white rounded-xl font-black text-lg"
        >
          スタート
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-2xl p-6 mb-4 border border-zinc-200 max-h-[60vh] overflow-y-auto">
        <div className="text-lg font-bold mb-4">{pack.title}</div>
        <div className="whitespace-pre-wrap leading-relaxed text-zinc-800">{pack.body}</div>
      </div>

      <div className="sticky bottom-4 bg-white rounded-2xl p-4 shadow-lg border-2 border-pink-300">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-zinc-500">現在のカウント</div>
            <div className="text-3xl font-black text-pink-600">{currentCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">目標</div>
            <div className="text-3xl font-black text-zinc-400">{targetCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">経過時間</div>
            <div className="text-2xl font-black">{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</div>
          </div>
        </div>
        <button
          onClick={() => onFinish(currentCount)}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold"
        >
          📖 読了 → クイズへ
        </button>
      </div>
    </div>
  )
}

// ========== 結果表示 ==========

function FinalTestResult({ result, stageName }: { result: FinalTestSubmitResult; stageName: string }) {
  const router = useRouter()

  if (result.passed) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-black text-green-600 mb-2">合格！</h1>
        <p className="text-zinc-600 mb-6">{stageName} クリア！次のステージへ進みました</p>

        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-500">到達カウント</div>
              <div className="text-2xl font-black text-green-700">{result.achievedCount}</div>
              <div className="text-xs">/ 目標 {result.targetCount}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">正解数</div>
              <div className="text-2xl font-black text-green-700">{result.correctCount}</div>
              <div className="text-xs">/ {result.totalQuestions}問</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/training')}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg"
        >
          トレーニング画面に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <div className="text-6xl mb-4">😢</div>
      <h1 className="text-3xl font-black text-orange-600 mb-2">不合格</h1>
      <p className="text-zinc-600 mb-6">
        あと少し！追加で2回トレーニングしてから再挑戦してね
      </p>

      <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-500">到達カウント</div>
            <div className={`text-2xl font-black ${result.reachedCountTarget ? 'text-green-600' : 'text-red-500'}`}>
              {result.achievedCount}
            </div>
            <div className="text-xs">/ 目標 {result.targetCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">正解数</div>
            <div className={`text-2xl font-black ${result.reachedCorrectTarget ? 'text-green-600' : 'text-red-500'}`}>
              {result.correctCount}
            </div>
            <div className="text-xs">/ {result.totalQuestions}問（4問以上で合格）</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-orange-700">
          {!result.reachedCountTarget && '⚠️ カウントが目標に届いていません'}
          {!result.reachedCorrectTarget && !result.reachedCountTarget && <br />}
          {!result.reachedCorrectTarget && '⚠️ 正解数が4問に届いていません'}
        </div>
      </div>

      <button
        onClick={() => router.push('/training')}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg"
      >
        トレーニング画面に戻る
      </button>
    </div>
  )
}
