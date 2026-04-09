import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLoggedInAdmin } from '@/lib/adminAuth'
import { listContentsForAdmin } from '@/app/actions/contents'

export default async function ContentsListPage() {
  const admin = await getLoggedInAdmin()
  if (!admin) redirect('/admin/login')

  const contents = await listContentsForAdmin()

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">コンテンツ管理</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {admin.role === 'platform'
              ? '全コンテンツを管理できます'
              : '自塾登録分は編集可、運用管理者登録分は閲覧のみ'}
          </p>
        </div>
        <Link
          href="/admin/contents/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新規作成
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3 text-left">タイトル</th>
              <th className="px-4 py-3 text-left">学年</th>
              <th className="px-4 py-3 text-left">ジャンル</th>
              <th className="px-4 py-3 text-right">文字数</th>
              <th className="px-4 py-3 text-left">登録元</th>
              <th className="px-4 py-3 text-left">認識単語</th>
              <th className="px-4 py-3 text-center">有効</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {contents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  コンテンツがありません
                </td>
              </tr>
            )}
            {contents.map(c => {
              const isMine = admin.role === 'platform' || c.owner_school_id === admin.id
              const hasWords =
                (c.recognition_in_words?.length ?? 0) >= 5 &&
                (c.recognition_decoy_words?.length ?? 0) >= 5
              return (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{c.title}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.grade_level_id ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.subject_id ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {c.char_count?.toLocaleString() ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {c.owner_school_id ? '塾' : '運用管理者'}
                  </td>
                  <td className="px-4 py-3">
                    {hasWords ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        登録済
                      </span>
                    ) : (
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                        未登録
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_active ? '○' : '×'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isMine ? (
                      <Link
                        href={`/admin/contents/${c.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        編集
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400">閲覧のみ</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
