'use server'

import { supabase } from '@/lib/supabase'
import { getCountTarget } from '@/lib/trainingConfig'

// ========== Types ==========

export interface CoachProgressSummary {
  stageNumber: number
  stageName: string
  stageSessionCount: number
  minSessions: number
  directionLast: string | null
  block240Count: number
  block90Count: number
  speedMode: boolean
  countTarget: number  // 学年別カウント目標（200/220/240）
  totalTrainingCount: number
  latestWpm: number | null
  bestWpm: number | null
  avgAccuracy: number | null
  lastTrainingAt: string | null
}

export interface SessionHistoryItem {
  id: string
  date: string
  durationMin: number
  status: string
  preWpm: number | null
  postWpm: number | null
  avgAccuracy: number | null
}

export interface StageProgressItem {
  stageNumber: number
  stageName: string
  startedAt: string
  completedAt: string | null
  sessionsCompleted: number
}

// ========== 共通データ取得 ==========

/** 生徒のコーチ進行状況サマリー */
export async function getCoachProgressSummary(studentId: string): Promise<CoachProgressSummary | null> {
  const { data: progress } = await supabase
    .from('student_progress')
    .select('coach_stage_id, stage_session_count, stage_direction_last, block_240_cleared, block_accuracy_90, total_training_count, latest_wpm, best_wpm, avg_accuracy_pct, last_training_at')
    .eq('student_id', studentId)
    .single()

  if (!progress) return null

  const p = progress as Record<string, unknown>
  const stageId = (p.coach_stage_id as string) ?? 'stage_1'

  const [{ data: stage }, { data: studentData }] = await Promise.all([
    supabase.from('coach_stages').select('name, stage_number, min_sessions').eq('id', stageId).single(),
    supabase.from('students').select('grade_level_id').eq('id', studentId).single(),
  ])

  const s = (stage as Record<string, unknown>) ?? {}
  const gradeLevelId = (studentData as Record<string, unknown> | null)?.grade_level_id as string | null

  return {
    stageNumber: (s.stage_number as number) ?? 1,
    stageName: (s.name as string) ?? '3点読み',
    stageSessionCount: (p.stage_session_count as number) ?? 0,
    minSessions: (s.min_sessions as number) ?? 6,
    directionLast: p.stage_direction_last as string | null,
    block240Count: (p.block_240_cleared as number) ?? 0,
    block90Count: (p.block_accuracy_90 as number) ?? 0,
    speedMode: (p.speed_mode as boolean) ?? false,
    countTarget: getCountTarget(gradeLevelId),
    totalTrainingCount: (p.total_training_count as number) ?? 0,
    latestWpm: p.latest_wpm as number | null,
    bestWpm: p.best_wpm as number | null,
    avgAccuracy: p.avg_accuracy_pct as number | null,
    lastTrainingAt: p.last_training_at as string | null,
  }
}

/** セッション履歴（速度計測付き） */
export async function getSessionHistory(studentId: string, limit = 30): Promise<SessionHistoryItem[]> {
  const { data: sessions } = await supabase
    .from('daily_sessions')
    .select('id, date, duration_min, status, pre_speed_id, post_speed_id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!sessions) return []

  const result: SessionHistoryItem[] = []

  for (const sess of sessions as Array<Record<string, unknown>>) {
    let preWpm: number | null = null
    let postWpm: number | null = null

    if (sess.pre_speed_id) {
      const { data: pre } = await supabase
        .from('speed_measurements').select('wpm').eq('id', sess.pre_speed_id).single()
      preWpm = (pre as Record<string, unknown> | null)?.wpm as number | null
    }
    if (sess.post_speed_id) {
      const { data: post } = await supabase
        .from('speed_measurements').select('wpm').eq('id', sess.post_speed_id).single()
      postWpm = (post as Record<string, unknown> | null)?.wpm as number | null
    }

    // セッションの平均正答率
    let avgAccuracy: number | null = null
    if (sess.id) {
      const { data: tsession } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle()

      // daily_session に紐づくテスト結果の平均
      const { data: tests } = await supabase
        .from('training_tests')
        .select('accuracy_pct')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(5)

      if (tests && tests.length > 0) {
        const total = (tests as Array<Record<string, unknown>>).reduce(
          (sum, t) => sum + (t.accuracy_pct as number), 0
        )
        avgAccuracy = Math.round(total / tests.length)
      }
    }

    result.push({
      id: sess.id as string,
      date: sess.date as string,
      durationMin: sess.duration_min as number,
      status: sess.status as string,
      preWpm,
      postWpm,
      avgAccuracy,
    })
  }

  return result
}

/** 速度推移データ（前後の計測ペア） */
export async function getSpeedTrend(studentId: string, limit = 20): Promise<Array<{
  date: string
  preWpm: number
  postWpm: number | null
}>> {
  const { data } = await supabase
    .from('speed_measurements')
    .select('wpm, measurement_type, measured_at')
    .eq('student_id', studentId)
    .order('measured_at', { ascending: true })
    .limit(limit * 2) // pre + post

  if (!data) return []

  // pre/post をペアにまとめる（同日のものをグループ化）
  const byDate = new Map<string, { pre?: number; post?: number }>()
  for (const d of data as Array<Record<string, unknown>>) {
    const date = (d.measured_at as string).slice(0, 10) // YYYY-MM-DD
    const entry = byDate.get(date) ?? {}
    if (d.measurement_type === 'pre') entry.pre = d.wpm as number
    else entry.post = d.wpm as number
    byDate.set(date, entry)
  }

  return Array.from(byDate.entries())
    .filter(([, v]) => v.pre !== undefined)
    .map(([date, v]) => ({
      date,
      preWpm: v.pre!,
      postWpm: v.post ?? null,
    }))
}

// ========== 管理者向け: 全生徒コーチステージ一覧 ==========

export interface StudentCoachOverview {
  id: string
  studentName: string | null
  studentLoginId: string
  stageNumber: number
  stageName: string
  stageSessionCount: number
  minSessions: number
  block240Count: number
  block90Count: number
  speedMode: boolean
  latestWpm: number | null
  lastTrainingAt: string | null
}

/** スクール所属の全生徒のコーチ進行一覧 */
export async function getSchoolCoachOverview(schoolId: string): Promise<StudentCoachOverview[]> {
  const { data: students } = await supabase
    .from('students')
    .select('id, student_name, student_login_id')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .order('student_login_id', { ascending: true })

  if (!students) return []

  const result: StudentCoachOverview[] = []

  for (const stu of students as Array<Record<string, unknown>>) {
    const { data: progress } = await supabase
      .from('student_progress')
      .select('coach_stage_id, stage_session_count, block_240_cleared, block_accuracy_90, latest_wpm, last_training_at')
      .eq('student_id', stu.id)
      .single()

    if (!progress) continue

    const p = progress as Record<string, unknown>
    const stageId = (p.coach_stage_id as string) ?? 'stage_1'

    const { data: stage } = await supabase
      .from('coach_stages')
      .select('name, stage_number, min_sessions')
      .eq('id', stageId)
      .single()

    const s = (stage as Record<string, unknown>) ?? {}

    result.push({
      id: stu.id as string,
      studentName: stu.student_name as string | null,
      studentLoginId: stu.student_login_id as string,
      stageNumber: (s.stage_number as number) ?? 1,
      stageName: (s.name as string) ?? '3点読み',
      stageSessionCount: (p.stage_session_count as number) ?? 0,
      minSessions: (s.min_sessions as number) ?? 6,
      block240Count: (p.block_240_cleared as number) ?? 0,
      block90Count: (p.block_accuracy_90 as number) ?? 0,
      speedMode: (p.speed_mode as boolean) ?? false,
      latestWpm: p.latest_wpm as number | null,
      lastTrainingAt: p.last_training_at as string | null,
    })
  }

  return result
}

// ========== 保護者向けトークン ==========

/** 保護者レポート用のトークンを生成し student に保存 */
export async function generateParentToken(studentId: string): Promise<string> {
  const token = crypto.randomUUID()
  await supabase
    .from('students')
    .update({ parent_report_token: token } as Record<string, unknown>)
    .eq('id', studentId)
  return token
}

/** トークンから生徒を特定 */
export async function getStudentByParentToken(token: string): Promise<{
  id: string
  studentName: string | null
  schoolName: string | null
} | null> {
  const { data } = await supabase
    .from('students')
    .select('id, student_name, school_id')
    .eq('parent_report_token', token)
    .eq('status', 'active')
    .single()

  if (!data) return null

  const d = data as Record<string, unknown>
  let schoolName: string | null = null
  if (d.school_id) {
    const { data: school } = await supabase
      .from('schools').select('school_name').eq('id', d.school_id).single()
    schoolName = (school as Record<string, unknown> | null)?.school_name as string | null
  }

  return {
    id: d.id as string,
    studentName: d.student_name as string | null,
    schoolName,
  }
}

// ========== 一括レポート用 ==========

export interface BulkReportStudent {
  id: string
  studentName: string | null
  studentLoginId: string
  gradeName: string | null
  coach: CoachProgressSummary | null
  speedTrend: Array<{ date: string; preWpm: number; postWpm: number | null }>
  sessionHistory: SessionHistoryItem[]
  dashboard: {
    latestWpm: number | null
    growthRate: number | null
    avgAccuracy: number | null
  }
}

/** フィルタ付きで複数生徒のレポートデータを一括取得 */
export async function getBulkReportData(
  schoolId: string,
  studentIds: string[],
): Promise<BulkReportStudent[]> {
  if (studentIds.length === 0) return []

  const { data: students } = await supabase
    .from('students')
    .select('id, student_name, student_login_id, grade_level_id')
    .eq('school_id', schoolId)
    .in('id', studentIds)
    .eq('status', 'active')
    .order('student_login_id', { ascending: true })

  if (!students) return []

  const result: BulkReportStudent[] = []

  for (const stu of students as Array<Record<string, unknown>>) {
    const sid = stu.id as string

    // 学年名
    let gradeName: string | null = null
    if (stu.grade_level_id) {
      const { data: grade } = await supabase
        .from('grade_levels').select('name').eq('id', stu.grade_level_id).single()
      gradeName = (grade as { name: string } | null)?.name ?? null
    }

    const [coach, trend, sessions] = await Promise.all([
      getCoachProgressSummary(sid),
      getSpeedTrend(sid, 10),
      getSessionHistory(sid, 10),
    ])

    // ダッシュボードは軽量に
    const { data: speedHistory } = await supabase
      .from('speed_history')
      .select('wpm')
      .eq('student_id', sid)
      .order('measured_at', { ascending: true })
      .limit(30)

    const wpmList = (speedHistory ?? []).map((s: Record<string, unknown>) => s.wpm as number)
    const firstWpm = wpmList.length > 0 ? wpmList[0] : null
    const latestWpm = wpmList.length > 0 ? wpmList[wpmList.length - 1] : null
    const growthRate = firstWpm && latestWpm && firstWpm > 0
      ? Math.round(((latestWpm - firstWpm) / firstWpm) * 100)
      : null

    result.push({
      id: sid,
      studentName: stu.student_name as string | null,
      studentLoginId: stu.student_login_id as string,
      gradeName,
      coach,
      speedTrend: trend,
      sessionHistory: sessions,
      dashboard: {
        latestWpm: coach?.latestWpm ?? latestWpm,
        growthRate,
        avgAccuracy: coach?.avgAccuracy ?? null,
      },
    })
  }

  return result
}

/** 学年リストを取得 */
export async function getGradeLevels(): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabase
    .from('grade_levels')
    .select('id, name')
    .order('display_order', { ascending: true })
  return (data ?? []) as Array<{ id: string; name: string }>
}
