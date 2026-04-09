import Link from 'next/link'
import { getLoggedInAdmin, logoutSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'

/** 運用管理者: 全メニュー。塾管理者: 塾向けサブセット */
const PLATFORM_NAV = [
  { href: '/admin/dashboard', label: 'ダッシュボード' },
  { href: '/admin/schools', label: 'スクール一覧' },
  { href: '/admin/students', label: '生徒一覧' },
  { href: '/admin/students/new', label: '生徒追加' },
  { href: '/admin/contents', label: 'コンテンツ管理' },
] as const

const SCHOOL_NAV = [
  { href: '/admin/dashboard', label: 'ダッシュボード' },
  { href: '/admin/students', label: '生徒一覧' },
  { href: '/admin/students/new', label: '生徒追加' },
  { href: '/admin/contents', label: 'コンテンツ管理' },
] as const

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const admin = await getLoggedInAdmin()

  if (!admin) {
    return <>{children}</>
  }

  const navItems = admin.role === 'platform' ? PLATFORM_NAV : SCHOOL_NAV

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white">
        <div className="p-4">
          {/* ログイン中ユーザー */}
          <div className="mb-4 rounded-lg bg-zinc-900 px-3 py-3">
            <div className="text-xs text-zinc-400">
              {admin.role === 'platform' ? '運用管理者' : 'ログイン中'}
            </div>
            <div className="mt-0.5 text-sm font-bold text-white truncate">{admin.school_name}</div>
            {admin.school_id && <div className="text-xs text-zinc-500">{admin.school_id}</div>}
          </div>

          <nav>
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ログアウト */}
        <div className="absolute bottom-4 left-0 w-56 px-4">
          <form action={async () => {
            'use server'
            await logoutSchool()
            redirect('/admin/login')
          }}>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
