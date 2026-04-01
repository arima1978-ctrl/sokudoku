import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="text-center">
        <h2 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          100万人の速読
        </h2>
        <p className="mb-8 text-zinc-500">
          速読トレーニングプラットフォーム
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            生徒ログイン
          </Link>
          <Link
            href="/admin/schools"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-8 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            管理者
          </Link>
        </div>
      </div>
    </div>
  )
}
