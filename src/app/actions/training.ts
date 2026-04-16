'use server'

import { supabase } from '@/lib/supabase'
import {
  calculateStartSpeed,
  calculateStartSpeedByTime,
  getNextDirection,
  getDirectionBySession,
  generateMenuSegments,
  generateSpeedModeSegments,
  type TrainingFrequency,
  type Direction,
  type DurationMin,
  type CoachStageNumber,
  type CoachSessionConfig,
  type DynamicSegment,
} from '@/lib/coach'

// ========== Types ==========

export interface StudentProgress {
  student_id: string
  current_phase_id: string
  current_step_id: string
  consecutive_pass_count: number
  // コーチ用
  coach_stage_id: string | null
  stage_session_count: number
  stage_direction_last: Direction | null
  fluency_reported: boolean
  block_240_cleared: number  // 240カウント突破回数（旧仕様・後方互換）
  block_accuracy_90: number  // 正答率90%達成回数（旧仕様・後方互換）
  speed_mode: boolean         // Stage5完了後のスピードモード（旧仕様・後方互換）
  // 新フロー: 修了テスト制
  stage_final_test_passed?: boolean
  stage_final_test_attempts?: number
  extra_sessions_required?: number
  stage_mode?: 'standard' | 'professional'
}

// Note: CoachSessionConfig, DynamicSegment types are exported from @/lib/coach directly
// 'use server' modules cannot re-export types (Next.js treats them as value exports)

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

/**
 * 次回セッションの高速読み開始速度を返す。
 * 前回トレーニングからの経過時間で倍率を決定:
 *   48時間以内: ×80%（記憶が新鮮）
 *   49〜96時間: ×70%（やや忘れている）
 *   97時間以上: ×60%（かなり忘れている）
 * 直近の pre 計測が無い場合は既定値 300 CPM を返す。
 */
export async function getStartWpm(studentId: string): Promise<number> {
  // 直近の pre 計測と前回トレーニング日時を取得
  const [{ data: speedData }, { data: progressData }] = await Promise.all([
    supabase
      .from('speed_measurements')
      .select('wpm, measured_at')
      .eq('student_id', studentId)
      .eq('measurement_type', 'pre')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('student_progress')
      .select('last_training_at')
      .eq('student_id', studentId)
      .single(),
  ])

  if (!speedData || !speedData.wpm) {
    return 300
  }

  const prevPreWpm = Number(speedData.wpm)
  if (!Number.isFinite(prevPreWpm) || prevPreWpm <= 0) {
    return 300
  }

  const lastTrainingAt = (progressData as Record<string, unknown> | null)?.last_training_at as string | null

  return calculateStartSpeedByTime(prevPreWpm, lastTrainingAt)
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

export async function getAvailableMenus(
  phaseId: string,
  category: 'basic' | 'genre' = 'basic',
) {
  const { data, error } = await supabase
    .from('training_menus')
    .select('*')
    .eq('phase_id', phaseId)
    .eq('category', category)
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

  // segment_type に応じた test_type を決定
  const shunkanTypes = ['barabara', 'shunkan_tate_1line', 'shunkan_tate_2line', 'shunkan_yoko_1line', 'shunkan_yoko_2line', 'koe_e']
  const outputTypes = ['output_tate', 'output_yoko']
  let testType = 'content_comprehension'
  if (shunkanTypes.includes(segmentType)) testType = 'shunkan_recall'
  else if (outputTypes.includes(segmentType)) testType = 'vocab_check'

  const { error } = await supabase.from('training_tests').insert({
    training_session_id: sessionId,
    student_id: studentId,
    test_type: testType,
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

export interface CoachStageEvaluation {
  action: 'stage_up' | 'speed_mode_start' | 'speed_mode' | 'maintain' | 'not_found'
  previous_stage: string
  new_stage: string
  stage_name: string
  session_count: number
  min_sessions: number
  block_240_count: number   // 240カウント突破回数
  block_90_count: number    // 正答率90%達成回数
  required_clears: number   // 必要回数 (5)
}

export async function completeTrainingSession(
  sessionId: string,
  studentId: string,
  avgAccuracy: number,
  coachDirection?: Direction,
): Promise<{ step: StepEvaluation; coach: CoachStageEvaluation | null }> {
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

  // Evaluate step progression (既存ロジック)
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

  const stepEval = (evalResult as StepEvaluation) ?? { action: 'maintain' }

  // Evaluate coach stage progression (新ロジック)
  let coachEval: CoachStageEvaluation | null = null
  if (coachDirection) {
    const { data: coachResult, error: coachError } = await supabase.rpc(
      'evaluate_coach_stage_up',
      {
        p_student_id: studentId,
        p_direction: coachDirection,
      }
    )

    if (!coachError && coachResult) {
      coachEval = coachResult as CoachStageEvaluation
    }
  }

  return { step: stepEval, coach: coachEval }
}

// ========== コーチ用アクション ==========

/**
 * コーチセッション設定を取得する。
 * 生徒の現在ステージ、頻度、方向履歴からセッション構成を自動生成。
 */
export async function getCoachSessionConfig(
  studentId: string,
  durationMin: DurationMin,
): Promise<CoachSessionConfig> {
  // 生徒の進行状況を取得
  const { data: progress, error: progressError } = await supabase
    .from('student_progress')
    .select('coach_stage_id, stage_session_count, stage_direction_last, block_240_cleared, block_accuracy_90, speed_mode')
    .eq('student_id', studentId)
    .single()

  if (progressError || !progress) {
    throw new Error('生徒の進行状況が見つかりません')
  }

  // コーチステージ情報を取得
  const stageId = progress.coach_stage_id ?? 'stage_1'
  const { data: stage, error: stageError } = await supabase
    .from('coach_stages')
    .select('*')
    .eq('id', stageId)
    .single()

  if (stageError || !stage) {
    throw new Error('ステージ情報が見つかりません')
  }

  const stageNumber = (stage as Record<string, unknown>).stage_number as CoachStageNumber
  const stageSessionCount = progress.stage_session_count as number
  const nextSessionNumber = stageSessionCount + 1
  const direction = getDirectionBySession(nextSessionNumber)
  const isSpeedMode = (progress.speed_mode as boolean) ?? false

  // スタート速度を計算
  const startWpm = await getStartWpm(studentId)

  // スピードモード or 通常メニュー生成
  const segments = isSpeedMode
    ? generateSpeedModeSegments({ durationMin, direction })
    : generateMenuSegments({ durationMin, stageNumber, direction, stageSessionCount })

  return {
    segments,
    direction,
    stageName: (stage as Record<string, unknown>).name as string,
    stageNumber,
    startWpm,
    sessionNumber: stageSessionCount + 1,
  }
}

/**
 * ブロック読み240カウント突破を記録する（+1回）。
 * 5回達成でステージアップ条件クリア。
 */
export async function reportBlock240Cleared(studentId: string): Promise<void> {
  // 現在の値を取得して+1
  const { data } = await supabase
    .from('student_progress')
    .select('block_240_cleared')
    .eq('student_id', studentId)
    .single()

  const current = (data as Record<string, unknown> | null)?.block_240_cleared as number ?? 0

  const { error } = await supabase
    .from('student_progress')
    .update({ block_240_cleared: current + 1 } as Record<string, unknown>)
    .eq('student_id', studentId)

  if (error) {
    throw new Error(`240カウント達成記録に失敗しました: ${error.message}`)
  }
}

/**
 * ブロック読み正答率90%以上を記録する（+1回）。
 * 5回達成でステージアップ条件クリア。
 */
export async function reportBlockAccuracy90(studentId: string): Promise<void> {
  const { data } = await supabase
    .from('student_progress')
    .select('block_accuracy_90')
    .eq('student_id', studentId)
    .single()

  const current = (data as Record<string, unknown> | null)?.block_accuracy_90 as number ?? 0

  const { error } = await supabase
    .from('student_progress')
    .update({ block_accuracy_90: current + 1 } as Record<string, unknown>)
    .eq('student_id', studentId)

  if (error) {
    throw new Error(`正答率90%達成記録に失敗しました: ${error.message}`)
  }
}

/** @deprecated Use reportBlock240Cleared instead */
export async function reportFluency(studentId: string): Promise<void> {
  await reportBlock240Cleared(studentId)
}

/**
 * 生徒のトレーニング頻度を更新する
 */
export async function updateTrainingFrequency(
  studentId: string,
  frequency: TrainingFrequency,
): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ training_frequency: frequency } as Record<string, unknown>)
    .eq('id', studentId)

  if (error) {
    throw new Error(`頻度の更新に失敗しました: ${error.message}`)
  }
}

// ========== コンテンツ取得 ==========

export async function getShunkanContent(
  gradeLevelId: string,
  difficulty?: number,
  contentStyle: 'normal' | 'koe' | 'e' = 'normal',
) {
  // 学年に合った瞬間読みコンテンツを取得
  let query = supabase
    .from('contents')
    .select('id, title, body, char_count, difficulty, content_style')
    .eq('grade_level_id', gradeLevelId)
    .eq('content_style', contentStyle)
    .lte('char_count', 30)
    .eq('is_active', true)

  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  const { data, error } = await query.limit(30)

  if (error || !data || data.length === 0) {
    // フォールバック: 全学年から取得(style は維持)
    let fallbackQuery = supabase
      .from('contents')
      .select('id, title, body, char_count, difficulty, content_style')
      .eq('content_style', contentStyle)
      .lte('char_count', 30)
      .eq('is_active', true)

    if (difficulty) {
      fallbackQuery = fallbackQuery.eq('difficulty', difficulty)
    }

    const { data: fallback } = await fallbackQuery.limit(30)
    return (fallback ?? []) as Array<{ id: string; title: string; body: string; char_count: number; difficulty: number }>
  }

  return data as Array<{ id: string; title: string; body: string; char_count: number; difficulty: number }>
}

export async function getReadingContent(gradeLevelId: string, subjectId?: string) {
  // 学年に合った長文コンテンツを取得
  let query = supabase
    .from('contents')
    .select('id, title, body, char_count, subject_id, difficulty')
    .eq('grade_level_id', gradeLevelId)
    .gt('char_count', 100) // 長文のみ
    .eq('is_active', true)

  if (subjectId) {
    query = query.eq('subject_id', subjectId)
  }

  const { data, error } = await query.limit(10)

  if (error || !data || data.length === 0) {
    // フォールバック
    const { data: fallback } = await supabase
      .from('contents')
      .select('id, title, body, char_count, subject_id, difficulty')
      .gt('char_count', 100)
      .eq('is_active', true)
      .limit(10)
    return (fallback ?? []) as Array<Record<string, unknown>>
  }

  return data as Array<Record<string, unknown>>
}

export async function getQuizForContent(contentId: string) {
  // コンテンツに紐づくテストをランダム1パターン取得
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, pattern')
    .eq('content_id', contentId)

  if (!quizzes || quizzes.length === 0) return null

  // ランダムに1パターン選択
  const quiz = quizzes[Math.floor(Math.random() * quizzes.length)]

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', (quiz as Record<string, unknown>).id)
    .order('question_no', { ascending: true })

  return {
    quiz_id: (quiz as Record<string, unknown>).id as string,
    pattern: (quiz as Record<string, unknown>).pattern as string,
    questions: (questions ?? []) as Array<{
      id: string
      question_no: number
      question_text: string
      choice_a: string
      choice_b: string
      choice_c: string
      choice_d: string
      correct: string
    }>,
  }
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
