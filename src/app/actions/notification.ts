'use server'

import { supabase } from '@/lib/supabase'

export interface NotificationSummary {
  studentName: string
  period: string
  totalSessions: number
  avgAccuracy: number | null
  latestWpm: number | null
  previousWpm: number | null
  stepName: string
  phaseName: string
}

/** 生徒の週次サマリーを取得 */
export async function getWeeklySummary(studentId: string): Promise<NotificationSummary | null> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  // 生徒情報
  const { data: student } = await supabase
    .from('students')
    .select('student_name')
    .eq('id', studentId)
    .single()

  if (!student) return null

  // 直近1週間のセッション数
  const { count } = await supabase
    .from('daily_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .gte('created_at', oneWeekAgo.toISOString())

  // 直近のテスト平均正答率
  const { data: tests } = await supabase
    .from('training_tests')
    .select('accuracy_pct')
    .eq('student_id', studentId)
    .gte('completed_at', oneWeekAgo.toISOString())
    .limit(50)

  const avgAccuracy = tests && tests.length > 0
    ? Math.round(
        (tests as Array<{ accuracy_pct: number }>).reduce((sum, t) => sum + t.accuracy_pct, 0) / tests.length
      )
    : null

  // 最新のWPM
  const { data: latestSpeed } = await supabase
    .from('speed_history')
    .select('wpm')
    .eq('student_id', studentId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  // 1週間前のWPM
  const { data: prevSpeed } = await supabase
    .from('speed_history')
    .select('wpm')
    .eq('student_id', studentId)
    .lte('measured_at', oneWeekAgo.toISOString())
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  // 現在のステップ
  const { data: progress } = await supabase
    .from('student_progress')
    .select('current_phase_id, current_step_id')
    .eq('student_id', studentId)
    .single()

  let phaseName = ''
  let stepName = ''
  if (progress) {
    const p = progress as { current_phase_id: string; current_step_id: string }
    const { data: phase } = await supabase.from('training_phases').select('name').eq('id', p.current_phase_id).single()
    const { data: step } = await supabase.from('training_steps').select('name').eq('id', p.current_step_id).single()
    phaseName = (phase as { name: string } | null)?.name ?? p.current_phase_id
    stepName = (step as { name: string } | null)?.name ?? p.current_step_id
  }

  return {
    studentName: (student as { student_name: string | null }).student_name ?? '生徒',
    period: `${oneWeekAgo.toLocaleDateString('ja-JP')} 〜 ${new Date().toLocaleDateString('ja-JP')}`,
    totalSessions: count ?? 0,
    avgAccuracy,
    latestWpm: (latestSpeed as { wpm: number } | null)?.wpm ?? null,
    previousWpm: (prevSpeed as { wpm: number } | null)?.wpm ?? null,
    stepName,
    phaseName,
  }
}

/** 保護者通知レコードを作成 */
export async function createParentNotification(
  studentId: string,
  type: 'weekly_report' | 'monthly_report' | 'milestone' | 'streak',
  channel: 'email' | 'line',
  subject: string,
  body: string,
  metadata?: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('parent_notifications')
    .insert({
      student_id: studentId,
      notification_type: type,
      channel,
      subject,
      body,
      metadata: metadata ?? {},
    } as Record<string, unknown>)
    .select('id')
    .single()

  if (error) throw new Error(`通知の作成に失敗: ${error.message}`)
  return data as { id: string }
}

/** 保護者通知を送信済みにマーク */
export async function markNotificationSent(notificationId: string) {
  await supabase
    .from('parent_notifications')
    .update({
      is_sent: true,
      sent_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', notificationId)
}

/** 週次レポートの本文を生成 */
export async function buildWeeklyReportBody(summary: NotificationSummary): Promise<string> {
  const lines: string[] = [
    `${summary.studentName}さんの速読トレーニングレポート`,
    `期間: ${summary.period}`,
    '',
    `■ トレーニング回数: ${summary.totalSessions}回`,
  ]

  if (summary.avgAccuracy !== null) {
    lines.push(`■ 平均正答率: ${summary.avgAccuracy}%`)
  }

  if (summary.latestWpm !== null) {
    lines.push(`■ 最新読書速度: ${summary.latestWpm} 文字/分`)
    if (summary.previousWpm !== null) {
      const diff = summary.latestWpm - summary.previousWpm
      lines.push(`  (前週比: ${diff > 0 ? '+' : ''}${diff} 文字/分)`)
    }
  }

  lines.push('')
  lines.push(`現在のレベル: ${summary.phaseName} - ${summary.stepName}`)
  lines.push('')
  lines.push('引き続き、お子様の速読トレーニングを応援してください。')

  return lines.join('\n')
}

/** 保護者のメールアドレスを持つ全生徒の週次レポートを一括生成 */
export async function generateWeeklyReports() {
  const { data: students } = await supabase
    .from('students')
    .select('id, parent_email')
    .eq('status', 'active')
    .eq('onboarding_completed', true)
    .not('parent_email', 'is', null)

  if (!students || students.length === 0) return { count: 0 }

  let count = 0
  for (const s of students as Array<{ id: string; parent_email: string }>) {
    const summary = await getWeeklySummary(s.id)
    if (!summary || summary.totalSessions === 0) continue

    const body = await buildWeeklyReportBody(summary)
    await createParentNotification(
      s.id,
      'weekly_report',
      'email',
      `${summary.studentName}さんの週間レポート`,
      body,
      { summary },
    )
    count++
  }

  return { count }
}
