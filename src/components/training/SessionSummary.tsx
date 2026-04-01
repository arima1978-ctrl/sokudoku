'use client'

import type { SegmentTestResult, StepEvaluation } from '@/app/actions/training'

interface SessionSummaryProps {
  results: SegmentTestResult[]
  evaluation: StepEvaluation | null
  onFinish: () => void
}

const SEGMENT_LABELS: Record<string, string> = {
  shunkan: '瞬間認識',
  block: 'ブロック読み',
  output: 'アウトプット',
  reading_speed: '読書速度',
}

const EVAL_MESSAGES: Record<string, { label: string; color: string }> = {
  step_up: { label: 'ステップアップ!', color: 'text-green-600 dark:text-green-400' },
  phase_up: { label: 'フェーズアップ!', color: 'text-blue-600 dark:text-blue-400' },
  step_down: { label: 'ステップダウン', color: 'text-orange-600 dark:text-orange-400' },
  maintain: { label: '現在のステップを継続', color: 'text-zinc-600 dark:text-zinc-400' },
}

export default function SessionSummary({
  results,
  evaluation,
  onFinish,
}: SessionSummaryProps) {
  const totalCorrect = results.reduce((sum, r) => sum + r.correct_count, 0)
  const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0)
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const evalInfo = evaluation
    ? EVAL_MESSAGES[evaluation.action] ?? EVAL_MESSAGES.maintain
    : EVAL_MESSAGES.maintain

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-6 text-center text-xl font-bold text-zinc-900 dark:text-zinc-50">
          トレーニング結果
        </h2>

        {/* Overall score */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-2 text-5xl font-bold text-blue-600 dark:text-blue-400">
            {overallAccuracy}%
          </div>
          <div className="text-sm text-zinc-500">
            正解 {totalCorrect} / {totalQuestions} 問
          </div>
        </div>

        {/* Per-segment results */}
        {results.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              セグメント別
            </h3>
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {SEGMENT_LABELS[r.segment_type] ?? r.segment_type}
                </span>
                <span className="text-sm font-medium">
                  <span
                    className={
                      r.accuracy_pct >= 80
                        ? 'text-green-600 dark:text-green-400'
                        : r.accuracy_pct >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {r.accuracy_pct}%
                  </span>
                  <span className="ml-2 text-zinc-400">
                    ({r.correct_count}/{r.total_questions})
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Step evaluation */}
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <p className={`text-lg font-bold ${evalInfo.color}`}>
            {evalInfo.label}
          </p>
          {evaluation?.message && (
            <p className="mt-1 text-sm text-zinc-500">{evaluation.message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          メニューに戻る
        </button>
      </div>
    </div>
  )
}
