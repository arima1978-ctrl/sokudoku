'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/types/database'
import { signSession, verifySession } from '@/lib/sessionCookie'

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

  // ユーザー存在の漏洩を避けるため、エラーメッセージは統一
  const GENERIC_ERR = 'IDまたはパスワードが正しくありません'

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, school_id')
    .eq('school_id', schoolId)
    .in('status', ['active', 'trial'])
    .single()

  if (schoolError || !school) {
    return { success: false, error: GENERIC_ERR }
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, school_id, student_login_id, student_password, student_password_hash, student_name, grade_level_id, preferred_subject_id, onboarding_completed, status, koe_e_style')
    .eq('school_id', (school as Record<string, string>).id)
    .eq('student_login_id', loginId)
    .single()

  if (studentError || !student) {
    return { success: false, error: GENERIC_ERR }
  }

  const s = student as unknown as Student & { student_password_hash?: string | null }

  if (s.status !== 'active') {
    return { success: false, error: 'このアカウントは無効です' }
  }

  // ハッシュがあればハッシュで、無ければ平文フォールバック（旧データ移行期）
  let passwordOk = false
  if (s.student_password_hash) {
    passwordOk = await bcrypt.compare(password, s.student_password_hash)
  } else if (s.student_password) {
    passwordOk = s.student_password === password
    // 平文一致時はついでに hash を書き込んで次回以降ハッシュ検証に移行
    if (passwordOk) {
      const hash = await bcrypt.hash(password, 10)
      await supabase.from('students').update({ student_password_hash: hash }).eq('id', s.id)
    }
  }
  if (!passwordOk) {
    return { success: false, error: GENERIC_ERR }
  }

  // ログインごとに koe_e_style を反転
  const prevStyle = (s as unknown as { koe_e_style?: string }).koe_e_style
  const nextStyle: 'koe' | 'e' = prevStyle === 'koe' ? 'e' : 'koe'
  await supabase.from('students').update({ koe_e_style: nextStyle }).eq('id', s.id)

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
  cookieStore.set(COOKIE_NAME, signSession(studentData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'strict',
    path: '/',
  })

  return { success: true, onboarding_completed: s.onboarding_completed ?? false }
}

export async function getLoggedInStudent(): Promise<LoggedInStudent | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null
  return verifySession<LoggedInStudent>(cookie.value)
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/login')
}
