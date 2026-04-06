'use server'

import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

const COOKIE_NAME = 'sokudoku_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export interface LoggedInSchool {
  id: string
  school_id: string
  school_name: string
}

export interface AdminLoginResult {
  success: boolean
  error?: string
}

export async function loginSchool(
  schoolId: string,
  password: string,
): Promise<AdminLoginResult> {
  if (!schoolId || !password) {
    return { success: false, error: 'スクールIDとパスワードを入力してください' }
  }

  const { data: school, error } = await supabase
    .from('schools')
    .select('id, school_id, school_name, password, status')
    .eq('school_id', schoolId)
    .in('status', ['active', 'trial'])
    .single()

  if (error || !school) {
    return { success: false, error: 'スクールIDが見つかりません' }
  }

  const s = school as { id: string; school_id: string; school_name: string; password: string }

  if (s.password !== password) {
    return { success: false, error: 'パスワードが正しくありません' }
  }

  const data: LoggedInSchool = {
    id: s.id,
    school_id: s.school_id,
    school_name: s.school_name,
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true }
}

export async function getLoggedInSchool(): Promise<LoggedInSchool | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) return null

  try {
    return JSON.parse(cookie.value) as LoggedInSchool
  } catch {
    return null
  }
}

export async function logoutSchool(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
