'use server'

import { supabase } from '@/lib/supabase'

export interface StudentProgressView {
  id: string
  student_name: string | null
  student_login_id: string
  grade_level_name: string | null
  phase_name: string | null
  step_name: string | null
  total_training_count: number
  latest_wpm: number | null
  avg_accuracy_pct: number | null
  last_training_at: string | null
  onboarding_completed: boolean
}

/** スクールに所属する生徒の進捗一覧 */
export async function getStudentProgressList(schoolId: string): Promise<StudentProgressView[]> {
  // 生徒一覧を取得
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_name, student_login_id, grade_level_id, onboarding_completed, status')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .order('student_login_id', { ascending: true })

  if (error || !students) return []

  const result: StudentProgressView[] = []

  for (const s of students as Array<Record<string, unknown>>) {
    // grade_level名を取得
    let gradeName: string | null = null
    if (s.grade_level_id) {
      const { data: grade } = await supabase
        .from('grade_levels').select('name').eq('id', s.grade_level_id).single()
      gradeName = (grade as { name: string } | null)?.name ?? null
    }

    // 進捗情報を取得
    let phaseName: string | null = null
    let stepName: string | null = null
    let totalCount = 0
    let avgAccuracy: number | null = null
    let lastTrainingAt: string | null = null

    const { data: progress } = await supabase
      .from('student_progress')
      .select('current_phase_id, current_step_id, total_training_count, avg_accuracy_pct, last_training_at')
      .eq('student_id', s.id)
      .single()

    if (progress) {
      const p = progress as Record<string, unknown>
      totalCount = (p.total_training_count as number) ?? 0
      avgAccuracy = p.avg_accuracy_pct as number | null
      lastTrainingAt = p.last_training_at as string | null

      const { data: phase } = await supabase
        .from('training_phases').select('name').eq('id', p.current_phase_id).single()
      phaseName = (phase as { name: string } | null)?.name ?? null

      const { data: step } = await supabase
        .from('training_steps').select('name').eq('id', p.current_step_id).single()
      stepName = (step as { name: string } | null)?.name ?? null
    }

    // 最新WPM
    const { data: speed } = await supabase
      .from('speed_history')
      .select('wpm')
      .eq('student_id', s.id as string)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single()

    result.push({
      id: s.id as string,
      student_name: s.student_name as string | null,
      student_login_id: s.student_login_id as string,
      grade_level_name: gradeName,
      phase_name: phaseName,
      step_name: stepName,
      total_training_count: totalCount,
      latest_wpm: (speed as { wpm: number } | null)?.wpm ?? null,
      avg_accuracy_pct: avgAccuracy,
      last_training_at: lastTrainingAt,
      onboarding_completed: s.onboarding_completed as boolean,
    })
  }

  return result
}
