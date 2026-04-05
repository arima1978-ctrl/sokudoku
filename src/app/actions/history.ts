'use server'

import { supabase } from '@/lib/supabase'

export interface SpeedHistoryPoint {
  wpm: number
  accuracy_pct: number | null
  measured_at: string
}

export interface TrainingHistoryPoint {
  date: string
  accuracy_pct: number
  segment_type: string
}

/** 速度履歴を取得（グラフ用） */
export async function getSpeedHistory(studentId: string, limit = 30): Promise<SpeedHistoryPoint[]> {
  const { data, error } = await supabase
    .from('speed_history')
    .select('wpm, accuracy_pct, measured_at')
    .eq('student_id', studentId)
    .order('measured_at', { ascending: true })
    .limit(limit)

  if (error) return []
  return (data ?? []) as SpeedHistoryPoint[]
}

/** テスト正答率履歴を取得（グラフ用） */
export async function getTestHistory(studentId: string, limit = 30): Promise<TrainingHistoryPoint[]> {
  const { data, error } = await supabase
    .from('training_tests')
    .select('accuracy_pct, segment_type, completed_at')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: true })
    .limit(limit)

  if (error) return []
  return (data ?? []).map((d: Record<string, unknown>) => ({
    date: d.completed_at as string,
    accuracy_pct: d.accuracy_pct as number,
    segment_type: d.segment_type as string,
  }))
}

/** ダッシュボード用サマリー */
export async function getStudentDashboard(studentId: string) {
  const [speedHistory, testHistory] = await Promise.all([
    getSpeedHistory(studentId),
    getTestHistory(studentId),
  ])

  // 最新と最古のWPMから成長率を計算
  const firstWpm = speedHistory.length > 0 ? speedHistory[0].wpm : null
  const latestWpm = speedHistory.length > 0 ? speedHistory[speedHistory.length - 1].wpm : null
  const growthRate = firstWpm && latestWpm && firstWpm > 0
    ? Math.round(((latestWpm - firstWpm) / firstWpm) * 100)
    : null

  // 平均正答率
  const avgAccuracy = testHistory.length > 0
    ? Math.round(testHistory.reduce((sum, t) => sum + t.accuracy_pct, 0) / testHistory.length)
    : null

  return {
    speedHistory,
    testHistory,
    latestWpm,
    firstWpm,
    growthRate,
    avgAccuracy,
    totalTests: testHistory.length,
  }
}
