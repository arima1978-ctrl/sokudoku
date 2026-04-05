'use server'

import { supabase } from '@/lib/supabase'

export async function saveDiary(
  dailySessionId: string,
  studentId: string,
  content: string,
  inputMethod: 'typing' | 'voice' = 'typing',
) {
  const { data, error } = await supabase
    .from('training_diaries')
    .insert({
      daily_session_id: dailySessionId,
      student_id: studentId,
      content: content.trim(),
      input_method: inputMethod,
      char_count: content.trim().length,
    } as Record<string, unknown>)
    .select('id')
    .single()

  if (error) throw new Error(`日記の保存に失敗: ${error.message}`)
  return data as { id: string }
}

export async function getDiaries(studentId: string, limit = 20) {
  const { data, error } = await supabase
    .from('training_diaries')
    .select('id, content, input_method, char_count, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`日記の取得に失敗: ${error.message}`)
  return (data ?? []) as Array<{
    id: string
    content: string
    input_method: string
    char_count: number
    created_at: string
  }>
}
