import { getStudentProgressList, type StudentProgressView } from '@/app/actions/admin'
import { supabase } from '@/lib/supabase'

export default async function AdminStudentsPage() {
  // 全スクールの生徒を表示（管理者用）
  const { data: schools } = await supabase
    .from('schools')
    .select('id, school_id, school_name')
    .in('status', ['active', 'trial'])
    .order('school_name', { ascending: true })

  if (!schools || schools.length === 0) {
    return <div className="p-6 text-zinc-500">スクールが登録されていません。</div>
  }

  // 各スクールの生徒進捗を取得
  const schoolData: Array<{
    school: { id: string; school_id: string; school_name: string }
    students: StudentProgressView[]
  }> = []

  for (const school of schools as Array<{ id: string; school_id: string; school_name: string }>) {
    const students = await getStudentProgressList(school.id)
    if (students.length > 0) {
      schoolData.push({ school, students })
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-zinc-900">生徒進捗一覧</h2>

      {schoolData.length === 0 && (
        <p className="text-zinc-500">生徒が登録されていません。</p>
      )}

      {schoolData.map(({ school, students }) => (
        <div key={school.id} className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-zinc-800">
            {school.school_name}
            <span className="ml-2 text-sm font-normal text-zinc-500">({school.school_id})</span>
          </h3>

          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">生徒名</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">学年</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">フェーズ</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">ステップ</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-600">回数</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-600">速度</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-600">正答率</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">最終日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {s.student_name ?? s.student_login_id}
                      {!s.onboarding_completed && (
                        <span className="ml-1 text-xs text-orange-500">(未設定)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{s.grade_level_name ?? '-'}</td>
                    <td className="px-3 py-2 text-zinc-600">{s.phase_name ?? '-'}</td>
                    <td className="px-3 py-2 text-zinc-600 text-xs">{s.step_name ?? '-'}</td>
                    <td className="px-3 py-2 text-center text-zinc-900 font-medium">{s.total_training_count}</td>
                    <td className="px-3 py-2 text-center">
                      {s.latest_wpm ? (
                        <span className="font-medium text-blue-600">{s.latest_wpm}</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.avg_accuracy_pct !== null ? (
                        <span className={`font-medium ${
                          s.avg_accuracy_pct >= 80 ? 'text-green-600' :
                          s.avg_accuracy_pct >= 60 ? 'text-yellow-600' : 'text-red-500'
                        }`}>
                          {Math.round(s.avg_accuracy_pct)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {s.last_training_at
                        ? new Date(s.last_training_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
