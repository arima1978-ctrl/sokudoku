'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/types/database'

const COOKIE_NAME = 'sokudoku_student'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface LoggedInStudent {
  id: string
  school_id: string
  student_login_id: string
  student_name: string | null
  grade_level_id: string | null
  preferred_subject_id: string | null
  onboarding_completed: boolean
  /** このログインセッションで使うスタイル。ログインごとに反転。 */
  koe_e_style: 'koe' | 'e'
}

export interface LoginResult {
  success: boolean
  error?: string
  onboarding_completed?: boolean
}

export async function loginStudent(
  schoolId: string,
  loginId: string,
  password: string
): Promise<LoginResult> {
  if (!schoolId || !loginId || !password) {
    return { success: false, error: 'すべての項目を入力してください' }
  }

  // schools + students を1クエリで取得（INNER JOIN）
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select(`
      id, school_id, student_login_id, student_password, student_name,
      grade_level_id, preferred_subject_id, onboarding_completed, status, koe_e_style,
      schools!inner(id, school_id, status)
    `)
    .eq('schools.school_id', schoolId)
    .in('schools.status', ['active', 'trial'])
    .eq('student_login_id', loginId)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'スクールID または ログインID が正しくありません' }
  }

  const s = student as unknown as Student

  if (s.status !== 'active') {
    return { success: false, error: 'このアカウントは無効です' }
  }

  if (s.student_password !== password) {
    return { success: false, error: 'パスワードが正しくありません' }
  }

  // ログインごとに koe_e_style を反転（非同期 fire-and-forget）
  const prevStyle = (s as unknown as { koe_e_style?: string }).koe_e_style
  const nextStyle: 'koe' | 'e' = prevStyle === 'koe' ? 'e' : 'koe'
  // awaitしない = ログインレスポンスを待たせない
  void supabase.from('students').update({ koe_e_style: nextStyle }).eq('id', s.id).then(() => {})

  // Store student info in cookie
  const studentData: LoggedInStudent = {
    id: s.id,
    school_id: s.school_id,
    student_login_id: s.student_login_id,
    student_name: s.student_name,
    grade_level_id: s.grade_level_id,
    preferred_subject_id: s.preferred_subject_id ?? null,
    onboarding_completed: s.onboarding_completed ?? false,
    koe_e_style: nextStyle,
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(studentData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true, onboarding_completed: s.onboarding_completed ?? false }
}

export async function getLoggedInStudent(): Promise<LoggedInStudent | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) {
    return null
  }

  try {
    return JSON.parse(cookie.value) as LoggedInStudent
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/login')
}
