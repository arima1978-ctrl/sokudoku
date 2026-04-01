import { getLoggedInStudent } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getStudentProgress,
  getStudentStats,
  getTrainingPhase,
  getTrainingStep,
  getAvailableMenus,
} from '@/app/actions/training'
import MenuSelector from './MenuSelector'

export default async function TrainingPage() {
  const student = await getLoggedInStudent()
  if (!student) {
    redirect('/login')
  }

  const progress = await getStudentProgress(student.id)

  // If no progress record, show a message
  if (!progress) {
    return (
      <div className="text-center">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          トレーニング
        </h2>
        <p className="text-zinc-500">
          まだトレーニングが設定されていません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  const [phase, step, stats, menus] = await Promise.all([
    getTrainingPhase(progress.current_phase_id),
    getTrainingStep(progress.current_step_id),
    getStudentStats(student.id),
    getAvailableMenus(progress.current_phase_id),
  ])

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        トレーニング
      </h2>

      {/* Progress summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="フェーズ"
          value={(phase?.name as string) ?? progress.current_phase_id}
        />
        <StatCard
          label="ステップ"
          value={(step?.name as string) ?? progress.current_step_id}
        />
        <StatCard
          label="読書速度"
          value={stats.latest_wpm ? `${stats.latest_wpm} WPM` : '-'}
        />
        <StatCard
          label="セッション数"
          value={`${stats.total_sessions} 回`}
        />
      </div>

      {/* Menu selection */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          トレーニング時間を選択
        </h3>
        <MenuSelector
          menus={menus}
          stepId={progress.current_step_id}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
    </div>
  )
}
