'use server'

import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

const COOKIE_NAME = 'sokudoku_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** ログイン中の管理者情報。role = 'platform'(運用管理者) or 'school'(塾管理者) */
export interface LoggedInAdmin {
  role: 'platform' | 'school'
  /** school role のときのみ: schools.id (UUID) */
  id: string | null
  /** school role のときのみ: schools.school_id (文字列ID) */
  school_id: string | null
  /** 表示用名称 */
  school_name: string
}

/** 後方互換エイリアス */
export type LoggedInSchool = LoggedInAdmin

export interface AdminLoginResult {
  success: boolean
  error?: string
}

/**
 * 管理者ログイン。
 * 1. SOKUDOKU_MANAGER_ID/PW 環境変数と一致 → 運用管理者(role=platform)
 * 2. それ以外は schools テーブルで照合 → 塾管理者(role=school)
 */
export async function loginAdmin(
  id: string,
  password: string,
): Promise<AdminLoginResult> {
  if (!id || !password) {
    return { success: false, error: 'IDとパスワードを入力してください' }
  }

  const platformId = process.env.SOKUDOKU_MANAGER_ID
  const platformPw = process.env.SOKUDOKU_MANAGER_PW
  if (platformId && platformPw && id === platformId && password === platformPw) {
    const data: LoggedInAdmin = {
      role: 'platform',
      id: null,
      school_id: null,
      school_name: '運用管理者',
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

  const { data: school, error } = await supabase
    .from('schools')
    .select('id, school_id, school_name, password, status')
    .eq('school_id', id)
    .in('status', ['active', 'trial'])
    .single()

  if (error || !school) {
    return { success: false, error: 'IDが見つかりません' }
  }

  const s = school as { id: string; school_id: string; school_name: string; password: string }
  if (s.password !== password) {
    return { success: false, error: 'パスワードが正しくありません' }
  }

  const data: LoggedInAdmin = {
    role: 'school',
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

/** 後方互換: 既存呼び出しはそのまま動く */
export async function loginSchool(
  schoolId: string,
  password: string,
): Promise<AdminLoginResult> {
  return loginAdmin(schoolId, password)
}

export async function getLoggedInAdmin(): Promise<LoggedInAdmin | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null
  try {
    const parsed = JSON.parse(cookie.value) as Partial<LoggedInAdmin>
    if (!parsed.role) {
      // 旧フォーマット互換: role 欠落時は school とみなす
      return {
        role: 'school',
        id: (parsed.id as string) ?? null,
        school_id: (parsed.school_id as string) ?? null,
        school_name: (parsed.school_name as string) ?? '',
      }
    }
    return parsed as LoggedInAdmin
  } catch {
    return null
  }
}

/** 後方互換 */
export async function getLoggedInSchool(): Promise<LoggedInAdmin | null> {
  return getLoggedInAdmin()
}

export async function logoutSchool(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
