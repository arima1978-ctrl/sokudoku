'use server'

import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'

const COOKIE_NAME = 'sokudoku_student'

export async function getGradeLevels() {
  const { data, error } = await supabase
    .from('grade_levels')
    .select('id, name, display_order')
    .order('display_order', { ascending: true })

  if (error) throw new Error(`学年の取得に失敗: ${error.message}`)
  return (data ?? []) as Array<{ id: string; name: string; display_order: number }>
}

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, icon, display_order')
    .order('display_order', { ascending: true })

  if (error) throw new Error(`ジャンルの取得に失敗: ${error.message}`)
  return (data ?? []) as Array<{ id: string; name: string; icon: string | null; display_order: number }>
}

export async function completeOnboarding(
  studentName: string,
  gradeLevelId: string,
  subjectId: string,
  parentEmail?: string,
): Promise<{ success: boolean; error?: string }> {
  const student = await getLoggedInStudent()
  if (!student) return { success: false, error: 'ログインしてください' }

  if (!studentName.trim()) return { success: false, error: '名前を入力してください' }
  if (!gradeLevelId) return { success: false, error: '学年を選択してください' }
  if (!subjectId) return { success: false, error: 'ジャンルを選択してください' }

  // 生徒情報を更新
  const { error: updateError } = await supabase
    .from('students')
    .update({
      student_name: studentName.trim(),
      grade_level_id: gradeLevelId,
      preferred_subject_id: subjectId,
      parent_email: parentEmail?.trim() || null,
      onboarding_completed: true,
    } as Record<string, unknown>)
    .eq('id', student.id)

  if (updateError) {
    return { success: false, error: `登録に失敗しました: ${updateError.message}` }
  }

  // student_progress を自動作成
  const { error: progressError } = await supabase.rpc('initialize_student_progress', {
    p_student_id: student.id,
  })

  if (progressError) {
    return { success: false, error: `進捗の初期化に失敗しました: ${progressError.message}` }
  }

  // Cookie を更新（新しい情報を反映）
  const updatedStudent: LoggedInStudent = {
    ...student,
    student_name: studentName.trim(),
    grade_level_id: gradeLevelId,
    preferred_subject_id: subjectId,
    onboarding_completed: true,
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(updatedStudent), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true }
}
