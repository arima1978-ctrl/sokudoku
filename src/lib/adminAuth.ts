'use server'

import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { signSession, verifySession } from '@/lib/sessionCookie'

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

  const GENERIC_ERR = 'IDまたはパスワードが正しくありません'

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
    cookieStore.set(COOKIE_NAME, signSession(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'strict',
      path: '/',
    })
    return { success: true }
  }

  const { data: school, error } = await supabase
    .from('schools')
    .select('id, school_id, school_name, password, password_hash, status')
    .eq('school_id', id)
    .in('status', ['active', 'trial'])
    .single()

  if (error || !school) {
    return { success: false, error: GENERIC_ERR }
  }

  const s = school as {
    id: string
    school_id: string
    school_name: string
    password: string | null
    password_hash: string | null
  }

  // ハッシュがあればハッシュ検証。無ければ平文比較+自動ハッシュ化(移行期)
  let passwordOk = false
  if (s.password_hash) {
    passwordOk = await bcrypt.compare(password, s.password_hash)
  } else if (s.password) {
    passwordOk = safeEqual(s.password, password)
    if (passwordOk) {
      const hash = await bcrypt.hash(password, 10)
      await supabase.from('schools').update({ password_hash: hash }).eq('id', s.id)
    }
  }
  if (!passwordOk) {
    return { success: false, error: GENERIC_ERR }
  }

  const data: LoggedInAdmin = {
    role: 'school',
    id: s.id,
    school_id: s.school_id,
    school_name: s.school_name,
  }
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, signSession(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'strict',
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
  const parsed = verifySession<Partial<LoggedInAdmin>>(cookie.value)
  if (!parsed) return null
  if (parsed.role !== 'platform' && parsed.role !== 'school') return null
  return parsed as LoggedInAdmin
}

/** 後方互換 */
export async function getLoggedInSchool(): Promise<LoggedInAdmin | null> {
  return getLoggedInAdmin()
}

export async function logoutSchool(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
