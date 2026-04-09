import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { getSchoolDashboard } from '@/app/actions/adminDashboard'

export default async function AdminDashboardPage() {
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')
  // 運用管理者は塾単位のダッシュボードではなくコンテンツ管理画面へ
  if (!school.id) redirect('/admin/contents')

  const dashboard = await getSchoolDashboard(school.id)

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-zinc-900">ダッシュボード</h2>

      {/* サマリーカード */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="生徒数" value={`${dashboard.activeStudents} / ${dashboard.totalStudents}`} sub="アクティブ / 全体" color="bg-blue-50 border-blue-200" />
        <SummaryCard label="トレーニング回数" value={`${dashboard.totalTrainingSessions}`} sub="回（全体）" color="bg-green-50 border-green-200" />
        <SummaryCard label="平均読書速度" value={dashboard.avgWpm ? `${dashboard.avgWpm}` : '-'} sub="文字/分" color="bg-purple-50 border-purple-200" />
        <SummaryCard label="平均正答率" value={dashboard.avgAccuracy ? `${dashboard.avgAccuracy}%` : '-'} sub="" color="bg-orange-50 border-orange-200" />
      </div>

      {/* 直近のアクティビティ */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">直近のトレーニング</h3>
        {dashboard.recentActivity.length === 0 ? (
          <p className="text-sm text-zinc-500">まだトレーニング記録がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">生徒</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">日付</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-600">読書速度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dashboard.recentActivity.map((a, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">{a.student_name}</td>
                    <td className="px-3 py-2 text-zinc-600">{a.date}</td>
                    <td className="px-3 py-2 text-center">
                      {a.wpm ? <span className="font-medium text-blue-600">{a.wpm} 文字/分</span> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-zinc-900">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}
