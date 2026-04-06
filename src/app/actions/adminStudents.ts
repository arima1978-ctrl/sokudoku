'use server'

import { supabase } from '@/lib/supabase'
import { getLoggedInSchool } from '@/lib/adminAuth'

export async function addStudent(
  loginId: string,
  password: string,
  studentName?: string,
): Promise<{ success: boolean; error?: string }> {
  const school = await getLoggedInSchool()
  if (!school) return { success: false, error: 'ログインしてください' }

  if (!loginId.trim()) return { success: false, error: 'ログインIDを入力してください' }
  if (!password.trim()) return { success: false, error: 'パスワードを入力してください' }

  // 重複チェック
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', school.id)
    .eq('student_login_id', loginId.trim())
    .single()

  if (existing) {
    return { success: false, error: 'このログインIDは既に使われています' }
  }

  const { error } = await supabase.from('students').insert({
    school_id: school.id,
    student_login_id: loginId.trim(),
    student_password: password.trim(),
    student_name: studentName?.trim() || null,
    status: 'active',
  } as Record<string, unknown>)

  if (error) return { success: false, error: `登録に失敗しました: ${error.message}` }
  return { success: true }
}

export async function updateStudent(
  studentId: string,
  data: {
    student_name?: string
    student_password?: string
    grade_level_id?: string
    status?: string
  },
): Promise<{ success: boolean; error?: string }> {
  const school = await getLoggedInSchool()
  if (!school) return { success: false, error: 'ログインしてください' }

  // 自スクールの生徒か確認
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', school.id)
    .single()

  if (!student) return { success: false, error: '生徒が見つかりません' }

  const update: Record<string, unknown> = {}
  if (data.student_name !== undefined) update.student_name = data.student_name.trim() || null
  if (data.student_password !== undefined) update.student_password = data.student_password.trim()
  if (data.grade_level_id !== undefined) update.grade_level_id = data.grade_level_id || null
  if (data.status !== undefined) update.status = data.status

  const { error } = await supabase
    .from('students')
    .update(update)
    .eq('id', studentId)

  if (error) return { success: false, error: `更新に失敗しました: ${error.message}` }
  return { success: true }
}
