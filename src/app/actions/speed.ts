'use server'

import { supabase } from '@/lib/supabase'
import { reportBlock240Cleared, reportBlockAccuracy90 } from '@/app/actions/training'

export interface SpeedMeasurementResult {
  id: string
  wpm: number
  char_count: number
  reading_time_sec: number
  quiz_accuracy: number | null
}

/** 速度計測用コンテンツ取得（生徒のジャンル・学年に合った長文） */
export async function getSpeedContent(gradeLevelId: string, subjectId: string) {
  // まず生徒のジャンル+学年で探す
  const { data } = await supabase
    .from('contents')
    .select('id, title, body, char_count')
    .eq('grade_level_id', gradeLevelId)
    .eq('subject_id', subjectId)
    .gt('char_count', 200)
    .eq('is_active', true)
    .limit(10)

  if (data && data.length > 0) {
    const item = data[Math.floor(Math.random() * data.length)]
    return item as { id: string; title: string; body: string; char_count: number }
  }

  // フォールバック: 学年のみで探す
  const { data: fallback } = await supabase
    .from('contents')
    .select('id, title, body, char_count')
    .eq('grade_level_id', gradeLevelId)
    .gt('char_count', 200)
    .eq('is_active', true)
    .limit(10)

  if (fallback && fallback.length > 0) {
    const item = fallback[Math.floor(Math.random() * fallback.length)]
    return item as { id: string; title: string; body: string; char_count: number }
  }

  // 全学年から探す
  const { data: anyGrade } = await supabase
    .from('contents')
    .select('id, title, body, char_count')
    .gt('char_count', 200)
    .eq('is_active', true)
    .limit(10)

  if (anyGrade && anyGrade.length > 0) {
    const item = anyGrade[Math.floor(Math.random() * anyGrade.length)]
    return item as { id: string; title: string; body: string; char_count: number }
  }

  return null
}

/** 速度計測結果を保存 */
export async function saveSpeedMeasurement(
  dailySessionId: string,
  studentId: string,
  contentId: string,
  measurementType: 'pre' | 'post',
  charCount: number,
  readingTimeSec: number,
  quizTotal?: number,
  quizCorrect?: number,
): Promise<SpeedMeasurementResult> {
  const wpm = readingTimeSec > 0
    ? Math.round((charCount / readingTimeSec) * 60)
    : 0

  const quizAccuracy = (quizTotal && quizTotal > 0 && quizCorrect !== undefined)
    ? Math.round((quizCorrect / quizTotal) * 100)
    : null

  const { data, error } = await supabase
    .from('speed_measurements')
    .insert({
      daily_session_id: dailySessionId,
      student_id: studentId,
      content_id: contentId,
      measurement_type: measurementType,
      char_count: charCount,
      reading_time_sec: readingTimeSec,
      wpm,
      quiz_total: quizTotal ?? null,
      quiz_correct: quizCorrect ?? null,
      quiz_accuracy: quizAccuracy,
    } as Record<string, unknown>)
    .select('id, wpm, char_count, reading_time_sec, quiz_accuracy')
    .single()

  if (error) throw new Error(`速度計測の保存に失敗: ${error.message}`)

  // daily_session にも紐付け
  const updateField = measurementType === 'pre' ? 'pre_speed_id' : 'post_speed_id'
  await supabase
    .from('daily_sessions')
    .update({ [updateField]: (data as Record<string, unknown>).id } as Record<string, unknown>)
    .eq('id', dailySessionId)

  // 測定(前)で240文字/分以上 → ブロック読み240カウント達成を記録(+1)
  if (measurementType === 'pre' && wpm >= 240) {
    await reportBlock240Cleared(studentId)
  }

  // 測定(前)のテストで正答率90%以上 → 正答率90%達成を記録(+1)
  if (measurementType === 'pre' && quizAccuracy !== null && quizAccuracy >= 90) {
    await reportBlockAccuracy90(studentId)
  }

  return data as SpeedMeasurementResult
}

/** daily_session を開始 */
export async function startDailySession(
  studentId: string,
  durationMin: number,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('daily_sessions')
    .insert({
      student_id: studentId,
      duration_min: durationMin,
      status: 'pre_speed',
    } as Record<string, unknown>)
    .select('id')
    .single()

  if (error) throw new Error(`セッション開始に失敗: ${error.message}`)
  return data as { id: string }
}

/** daily_session のステータス更新 */
export async function updateDailySessionStatus(
  sessionId: string,
  status: 'pre_speed' | 'training' | 'post_speed' | 'completed',
  trainingSessionId?: string,
) {
  const update: Record<string, unknown> = { status }
  if (trainingSessionId) update.training_session_id = trainingSessionId
  if (status === 'completed') update.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('daily_sessions')
    .update(update)
    .eq('id', sessionId)

  if (error) throw new Error(`ステータス更新に失敗: ${error.message}`)
}

/** speed_history にも記録（グラフ表示用） */
export async function recordSpeedHistory(
  studentId: string,
  wpm: number,
  accuracy: number | null,
  contentId: string,
) {
  await supabase.from('speed_history').insert({
    student_id: studentId,
    wpm,
    accuracy_pct: accuracy,
    content_id: contentId,
  } as Record<string, unknown>)
}
