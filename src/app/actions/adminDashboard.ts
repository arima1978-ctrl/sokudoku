'use server'

import { supabase } from '@/lib/supabase'

export interface DashboardSummary {
  totalStudents: number
  activeStudents: number
  totalTrainingSessions: number
  avgWpm: number | null
  avgAccuracy: number | null
  recentActivity: Array<{
    student_name: string
    student_login_id: string
    date: string
    wpm: number | null
  }>
}

export async function getSchoolDashboard(schoolId: string): Promise<DashboardSummary> {
  // 生徒数
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  // アクティブ生徒数（オンボーディング完了済み）
  const { count: activeStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .eq('onboarding_completed', true)

  // 全生徒IDを取得
  const { data: studentRows } = await supabase
    .from('students')
    .select('id, student_name, student_login_id')
    .eq('school_id', schoolId)
    .eq('status', 'active')

  const studentIds = (studentRows ?? []).map((s: Record<string, unknown>) => s.id as string)
  const studentMap = new Map(
    (studentRows ?? []).map((s: Record<string, unknown>) => [
      s.id as string,
      { name: s.student_name as string | null, loginId: s.student_login_id as string },
    ])
  )

  let totalTrainingSessions = 0
  let avgWpm: number | null = null
  let avgAccuracy: number | null = null
  const recentActivity: DashboardSummary['recentActivity'] = []

  if (studentIds.length > 0) {
    // トレーニング総回数
    const { count: sessionCount } = await supabase
      .from('daily_sessions')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds)
      .eq('status', 'completed')

    totalTrainingSessions = sessionCount ?? 0

    // 平均WPM（直近の速度計測）
    const { data: speeds } = await supabase
      .from('speed_history')
      .select('wpm, student_id')
      .in('student_id', studentIds)
      .order('measured_at', { ascending: false })
      .limit(100)

    if (speeds && speeds.length > 0) {
      const wpmValues = (speeds as Array<{ wpm: number }>).map(s => s.wpm)
      avgWpm = Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length)
    }

    // 平均正答率
    const { data: tests } = await supabase
      .from('training_tests')
      .select('accuracy_pct')
      .in('student_id', studentIds)
      .order('completed_at', { ascending: false })
      .limit(100)

    if (tests && tests.length > 0) {
      const accValues = (tests as Array<{ accuracy_pct: number }>).map(t => t.accuracy_pct)
      avgAccuracy = Math.round(accValues.reduce((a, b) => a + b, 0) / accValues.length)
    }

    // 直近のアクティビティ
    const { data: recent } = await supabase
      .from('daily_sessions')
      .select('student_id, date, created_at')
      .in('student_id', studentIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recent) {
      for (const r of recent as Array<Record<string, unknown>>) {
        const sid = r.student_id as string
        const info = studentMap.get(sid)

        // 最新WPM
        const { data: sp } = await supabase
          .from('speed_history')
          .select('wpm')
          .eq('student_id', sid)
          .order('measured_at', { ascending: false })
          .limit(1)
          .single()

        recentActivity.push({
          student_name: info?.name ?? info?.loginId ?? '不明',
          student_login_id: info?.loginId ?? '',
          date: r.date as string,
          wpm: (sp as { wpm: number } | null)?.wpm ?? null,
        })
      }
    }
  }

  return {
    totalStudents: totalStudents ?? 0,
    activeStudents: activeStudents ?? 0,
    totalTrainingSessions,
    avgWpm,
    avgAccuracy,
    recentActivity,
  }
}
