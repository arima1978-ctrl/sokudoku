'use server'

/**
 * サーバーアクション用の認証ガードヘルパー。
 * service_role クライアントを使うアクションで、呼び出しユーザーの権限を
 * 明示的に確認するために使用する。
 *
 * 使い方:
 *   const { student } = await requireStudent()
 *   const { admin } = await requireAdmin()       // platform or school
 *   const { admin } = await requirePlatform()    // platform のみ
 *   const { admin } = await requireSchool()      // school のみ
 */
import { getLoggedInStudent, type LoggedInStudent } from '@/lib/auth'
import { getLoggedInAdmin, type LoggedInAdmin } from '@/lib/adminAuth'

export class AuthzError extends Error {
  constructor(public readonly code: 'unauthenticated' | 'forbidden', message: string) {
    super(message)
    this.name = 'AuthzError'
  }
}

export async function requireStudent(): Promise<{ student: LoggedInStudent }> {
  const student = await getLoggedInStudent()
  if (!student) throw new AuthzError('unauthenticated', '生徒としてログインしていません')
  return { student }
}

export async function requireAdmin(): Promise<{ admin: LoggedInAdmin }> {
  const admin = await getLoggedInAdmin()
  if (!admin) throw new AuthzError('unauthenticated', '管理者としてログインしていません')
  return { admin }
}

export async function requirePlatform(): Promise<{ admin: LoggedInAdmin }> {
  const { admin } = await requireAdmin()
  if (admin.role !== 'platform') {
    throw new AuthzError('forbidden', '運用管理者権限が必要です')
  }
  return { admin }
}

export async function requireSchool(): Promise<{ admin: LoggedInAdmin }> {
  const { admin } = await requireAdmin()
  if (admin.role !== 'school' || !admin.id) {
    throw new AuthzError('forbidden', '塾管理者権限が必要です')
  }
  return { admin }
}

/**
 * 指定された studentId が現在ログイン中の生徒本人か確認。
 * 他人の学生IDでクエリしようとした場合に例外。
 */
export async function requireStudentOwnership(studentId: string): Promise<LoggedInStudent> {
  const { student } = await requireStudent()
  if (student.id !== studentId) {
    throw new AuthzError('forbidden', '他の生徒のデータにはアクセスできません')
  }
  return student
}

/**
 * 指定された schoolId が現在ログイン中の塾管理者のスクール本人か
 * （または運用管理者か）確認。
 */
export async function requireSchoolOwnership(schoolId: string): Promise<LoggedInAdmin> {
  const { admin } = await requireAdmin()
  if (admin.role === 'platform') return admin // 運用管理者は全塾参照可
  if (admin.id !== schoolId) {
    throw new AuthzError('forbidden', '他の塾のデータにはアクセスできません')
  }
  return admin
}
