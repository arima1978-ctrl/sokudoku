import Link from 'next/link'
import { getLoggedInSchool, logoutSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'ダッシュボード' },
  { href: '/admin/students', label: '生徒一覧' },
  { href: '/admin/students/new', label: '生徒追加' },
] as const

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const school = await getLoggedInSchool()

  // ログインページ自体はレイアウトなしで表示
  // ログインしていない場合はchildrenをそのまま返す（loginページが表示される）
  if (!school) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white">
        <div className="p-4">
          {/* 塾名 */}
          <div className="mb-4 rounded-lg bg-zinc-900 px-3 py-3">
            <div className="text-xs text-zinc-400">ログイン中</div>
            <div className="mt-0.5 text-sm font-bold text-white truncate">{school.school_name}</div>
            <div className="text-xs text-zinc-500">{school.school_id}</div>
          </div>

          <nav>
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
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
