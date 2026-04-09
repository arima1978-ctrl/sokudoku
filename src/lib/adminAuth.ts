'use server'

import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { supabase } from '@/lib/supabase'

/** タイミング攻撃を避けるための定時比較 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) {
    // 長さの違いも timingSafeEqual で比較するためパディング
    const len = Math.max(ab.length, bb.length)
    const ap = Buffer.alloc(len)
    const bp = Buffer.alloc(len)
    ab.copy(ap)
    bb.copy(bp)
    timingSafeEqual(ap, bp)
    return false
  }
  return timingSafeEqual(ab, bb)
}

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
  if (platformId && platformPw && safeEqual(id, platformId) && safeEqual(password, platformPw)) {
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
  if (!safeEqual(s.password ?? '', password)) {
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
    // role を持たない / 不正な role の cookie は拒否（権限昇格回避）
    if (parsed.role !== 'platform' && parsed.role !== 'school') return null
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
