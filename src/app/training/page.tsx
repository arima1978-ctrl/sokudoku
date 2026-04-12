import { getLoggedInStudent } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getStudentProgress,
  getStudentStats,
  getTrainingPhase,
  getTrainingStep,
  getAvailableMenus,
} from '@/app/actions/training'
import { getSubjects } from '@/app/actions/onboarding'
import { supabase } from '@/lib/supabase'
import TrainingHome from './TrainingHome'

export default async function TrainingPage() {
  const student = await getLoggedInStudent()
  if (!student) redirect('/login')
  if (!student.onboarding_completed) redirect('/onboarding')

  const progress = await getStudentProgress(student.id)

  if (!progress) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="mb-4 text-xl font-bold text-zinc-900">トレーニング</h2>
          <p className="text-zinc-500">
            トレーニングの準備ができていません。管理者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  // コーチステージ情報を取得
  let coachStageName: string | null = null
  let coachStageNumber: number | null = null
  let coachMinSessions = 5
  if (progress.coach_stage_id) {
    const { data: stageRow } = await supabase
      .from('coach_stages')
      .select('name, stage_number, min_sessions')
      .eq('id', progress.coach_stage_id)
      .single()
    if (stageRow) {
      const row = stageRow as Record<string, unknown>
      coachStageName = row.name as string
      coachStageNumber = row.stage_number as number
      coachMinSessions = (row.min_sessions as number) ?? 5
    }
  }

  const [phase, step, stats, basicMenus, genreMenus, subjects] = await Promise.all([
    getTrainingPhase(progress.current_phase_id),
    getTrainingStep(progress.current_step_id),
    getStudentStats(student.id),
    getAvailableMenus(progress.current_phase_id, 'basic'),
    getAvailableMenus(progress.current_phase_id, 'genre'),
    getSubjects(),
  ])

  return (
    <TrainingHome
      student={{
        id: student.id,
        name: student.student_name ?? '',
        gradeLevelId: student.grade_level_id ?? 'g4',
        subjectId: student.preferred_subject_id ?? 'story',
      }}
      progress={{
        phaseId: progress.current_phase_id,
        phaseName: (phase?.name as string) ?? progress.current_phase_id,
        stepId: progress.current_step_id,
        stepName: (step?.name as string) ?? progress.current_step_id,
        coachStageId: progress.coach_stage_id ?? null,
        stageName: coachStageName,
        stageNumber: coachStageNumber,
        stageSessionCount: progress.stage_session_count ?? 0,
        stageDirectionLast: (progress.stage_direction_last as 'tate' | 'yoko' | null) ?? null,
        fluencyReported: progress.fluency_reported ?? false,
        block240Cleared: progress.block_240_cleared ?? false,
        blockAccuracy90: progress.block_accuracy_90 ?? false,
        minSessions: coachMinSessions,
      }}
      stats={{
        totalSessions: stats.total_sessions,
        latestWpm: stats.latest_wpm,
      }}
      basicMenus={basicMenus}
      genreMenus={genreMenus}
      subjects={subjects}
    />
  )
}
