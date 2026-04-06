import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { getStudentProgressList } from '@/app/actions/admin'
import Link from 'next/link'

export default async function AdminStudentsPage() {
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  const students = await getStudentProgressList(school.id)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">生徒一覧</h2>
        <Link
          href="/admin/students/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          生徒を追加
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500">生徒が登録されていません</p>
          <Link
            href="/admin/students/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            最初の生徒を追加
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">生徒名</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">ログインID</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">学年</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">フェーズ</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">ステップ</th>
                <th className="px-3 py-3 text-center font-medium text-zinc-600">回数</th>
                <th className="px-3 py-3 text-center font-medium text-zinc-600">速度</th>
                <th className="px-3 py-3 text-center font-medium text-zinc-600">正答率</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-600">最終日</th>
                <th className="px-3 py-3 text-center font-medium text-zinc-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2.5 font-medium text-zinc-900">
                    {s.student_name ?? '-'}
                    {!s.onboarding_completed && (
                      <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">未設定</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 font-mono text-xs">{s.student_login_id}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{s.grade_level_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{s.phase_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-zinc-600 text-xs">{s.step_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-zinc-900">{s.total_training_count}</td>
                  <td className="px-3 py-2.5 text-center">
                    {s.latest_wpm ? (
                      <span className="font-medium text-blue-600">{s.latest_wpm}</span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {s.avg_accuracy_pct !== null ? (
                      <span className={`font-medium ${
                        s.avg_accuracy_pct >= 80 ? 'text-green-600' :
                        s.avg_accuracy_pct >= 60 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {Math.round(s.avg_accuracy_pct)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs">
                    {s.last_training_at
                      ? new Date(s.last_training_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="rounded bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
