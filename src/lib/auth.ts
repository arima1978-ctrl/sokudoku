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
}

export interface LoginResult {
  success: boolean
  error?: string
}

export async function loginStudent(
  schoolId: string,
  loginId: string,
  password: string
): Promise<LoginResult> {
  if (!schoolId || !loginId || !password) {
    return { success: false, error: 'すべての項目を入力してください' }
  }

  // Look up the school first
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, school_id')
    .eq('school_id', schoolId)
    .in('status', ['active', 'trial'])
    .single()

  if (schoolError || !school) {
    return { success: false, error: 'スクールIDが見つかりません' }
  }

  // Look up the student (school_id is UUID reference to schools.id)
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, school_id, student_login_id, student_password, student_name, grade_level_id, status')
    .eq('school_id', (school as Record<string, string>).id)
    .eq('student_login_id', loginId)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'ログインIDが見つかりません' }
  }

  const s = student as Student

  if (s.status !== 'active') {
    return { success: false, error: 'このアカウントは無効です' }
  }

  if (s.student_password !== password) {
    return { success: false, error: 'パスワードが正しくありません' }
  }

  // Store student info in cookie
  const studentData: LoggedInStudent = {
    id: s.id,
    school_id: s.school_id,
    student_login_id: s.student_login_id,
    student_name: s.student_name,
    grade_level_id: s.grade_level_id,
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(studentData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true }
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
