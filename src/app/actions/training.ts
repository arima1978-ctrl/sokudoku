'use server'

import { supabase } from '@/lib/supabase'

// ========== Types ==========

export interface StudentProgress {
  student_id: string
  current_phase_id: string
  current_step_id: string
  consecutive_pass_count: number
}

export interface MenuSegment {
  id: string
  menu_id: string
  segment_order: number
  segment_type: string
  duration_sec: number
  has_test: boolean
  test_duration_sec: number | null
  test_type: string | null
  skippable: boolean
  should_skip: boolean
}

export interface TrainingSession {
  id: string
  student_id: string
  menu_id: string
  step_id: string
  started_at: string
  finished_at: string | null
  is_completed: boolean
}

export interface StepEvaluation {
  action: 'step_up' | 'phase_up' | 'step_down' | 'maintain'
  new_step_id?: string
  new_phase_id?: string
  message?: string
}

export interface SegmentTestResult {
  segment_type: string
  total_questions: number
  correct_count: number
  accuracy_pct: number
}

// ========== Server Actions ==========

export async function getStudentProgress(
  studentId: string
): Promise<StudentProgress | null> {
  const { data, error } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId)
    .single()

  if (error || !data) {
    return null
  }

  return data as StudentProgress
}

export async function getTrainingStep(stepId: string) {
  const { data, error } = await supabase
    .from('training_steps')
    .select('*')
    .eq('id', stepId)
    .single()

  if (error) {
    return null
  }

  return data as Record<string, unknown>
}

export async function getTrainingPhase(phaseId: string) {
  const { data, error } = await supabase
    .from('training_phases')
    .select('*')
    .eq('id', phaseId)
    .single()

  if (error) {
    return null
  }

  return data as Record<string, unknown>
}

export async function getMenuSegments(
  menuId: string,
  studentId: string
): Promise<MenuSegment[]> {
  const { data: segments, error } = await supabase
    .from('menu_segments')
    .select('*')
    .eq('menu_id', menuId)
    .order('segment_order', { ascending: true })

  if (error || !segments) {
    throw new Error(`メニューセグメントの取得に失敗しました: ${error?.message}`)
  }

  // Check skip logic for each skippable segment
  const results: MenuSegment[] = []
  for (const seg of segments) {
    let shouldSkip = false
    if (seg.skippable) {
      const { data: skipResult } = await supabase.rpc('should_skip_segment', {
        student_id: studentId,
        segment_type: seg.segment_type,
      })
      shouldSkip = skipResult === true
    }
    results.push({
      ...(seg as Omit<MenuSegment, 'should_skip'>),
      should_skip: shouldSkip,
    })
  }

  return results
}

export async function getAvailableMenus(phaseId: string) {
  const { data, error } = await supabase
    .from('training_menus')
    .select('*')
    .eq('phase_id', phaseId)
    .order('duration_min', { ascending: true })

  if (error) {
    throw new Error(`メニューの取得に失敗しました: ${error.message}`)
  }

  return (data ?? []) as Array<Record<string, unknown>>
}

export async function startTrainingSession(
  studentId: string,
  menuId: string,
  stepId: string
): Promise<TrainingSession> {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      student_id: studentId,
      menu_id: menuId,
      step_id: stepId,
      started_at: new Date().toISOString(),
      is_completed: false,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    throw new Error(`セッション開始に失敗しました: ${error.message}`)
  }

  return data as TrainingSession
}

export async function submitSegmentTest(
  sessionId: string,
  studentId: string,
  segmentType: string,
  totalQuestions: number,
  correctCount: number
): Promise<SegmentTestResult> {
  const accuracyPct =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  const { error } = await supabase.from('training_tests').insert({
    training_session_id: sessionId,
    student_id: studentId,
    test_type: 'comprehension',
    segment_type: segmentType,
    total_questions: totalQuestions,
    correct_count: correctCount,
    accuracy_pct: accuracyPct,
  } as Record<string, unknown>)

  if (error) {
    throw new Error(`テスト結果の保存に失敗しました: ${error.message}`)
  }

  return {
    segment_type: segmentType,
    total_questions: totalQuestions,
    correct_count: correctCount,
    accuracy_pct: accuracyPct,
  }
}

export async function completeTrainingSession(
  sessionId: string,
  studentId: string,
  avgAccuracy: number
): Promise<StepEvaluation> {
  // Mark session as completed
  const { error: updateError } = await supabase
    .from('training_sessions')
    .update({
      finished_at: new Date().toISOString(),
      is_completed: true,
    } as Record<string, unknown>)
    .eq('id', sessionId)

  if (updateError) {
    throw new Error(`セッション完了に失敗しました: ${updateError.message}`)
  }

  // Evaluate step progression
  const { data: evalResult, error: evalError } = await supabase.rpc(
    'evaluate_step_up',
    {
      student_id: studentId,
      accuracy_pct: avgAccuracy,
    }
  )

  if (evalError) {
    throw new Error(`ステップ評価に失敗しました: ${evalError.message}`)
  }

  return (evalResult as StepEvaluation) ?? { action: 'maintain' }
}

export async function getStudentStats(studentId: string) {
  // Get session count
  const { count: sessionCount } = await supabase
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_completed', true)

  // Get latest speed
  const { data: latestSpeed } = await supabase
    .from('speed_history')
    .select('wpm, accuracy_pct')
    .eq('student_id', studentId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  return {
    total_sessions: sessionCount ?? 0,
    latest_wpm: (latestSpeed as Record<string, unknown> | null)?.wpm as number | null,
    latest_accuracy: (latestSpeed as Record<string, unknown> | null)?.accuracy_pct as number | null,
  }
}
