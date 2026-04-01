import { getJukus } from '@/app/actions/juku'
import JukuTable from '@/components/JukuTable'

export default async function Home() {
  let jukus: Awaited<ReturnType<typeof getJukus>> = []
  let error: string | null = null

  try {
    jukus = await getJukus()
  } catch (e) {
    error = e instanceof Error ? e.message : 'データの取得に失敗しました'
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            塾ID一覧
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            100万人の速読 - 塾ID/パスワード管理
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : (
        <JukuTable initialData={jukus} />
      )}
    </div>
  )
}
