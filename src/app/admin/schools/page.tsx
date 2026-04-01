import { getSchools } from '@/app/actions/juku'
import SchoolTable from '@/components/JukuTable'

export default async function SchoolsPage() {
  let schools: Awaited<ReturnType<typeof getSchools>> = []
  let error: string | null = null

  try {
    schools = await getSchools()
  } catch (e) {
    error = e instanceof Error ? e.message : 'データの取得に失敗しました'
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            スクール一覧
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            100万人の速読 - スクールID/パスワード管理
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : (
        <SchoolTable initialData={schools} />
      )}
    </div>
  )
}
