import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStudentDashboard } from '@/app/actions/history'
import GrowthChart from '@/components/training/GrowthChart'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  // 生徒情報取得（自スクールに所属しているか確認）
  const { data: student } = await supabase
    .from('students')
    .select('id, student_name, student_login_id, student_password, grade_level_id, preferred_subject_id, onboarding_completed, status, created_at')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">生徒が見つかりません</p>
        <Link href="/admin/students" className="mt-4 inline-block text-blue-600 hover:underline">一覧に戻る</Link>
      </div>
    )
  }

  const s = student as Record<string, unknown>

  // 学年名
  let gradeName = '-'
  if (s.grade_level_id) {
    const { data: grade } = await supabase.from('grade_levels').select('name').eq('id', s.grade_level_id).single()
    gradeName = (grade as { name: string } | null)?.name ?? '-'
  }

  // ジャンル名
  let subjectName = '-'
  if (s.preferred_subject_id) {
    const { data: subject } = await supabase.from('subjects').select('name').eq('id', s.preferred_subject_id).single()
    subjectName = (subject as { name: string } | null)?.name ?? '-'
  }

  // 進捗情報
  const { data: progress } = await supabase
    .from('student_progress')
    .select('current_phase_id, current_step_id, total_training_count, last_training_at')
    .eq('student_id', id)
    .single()

  let phaseName = '-'
  let stepName = '-'
  if (progress) {
    const p = progress as Record<string, unknown>
    const { data: phase } = await supabase.from('training_phases').select('name').eq('id', p.current_phase_id).single()
    const { data: step } = await supabase.from('training_steps').select('name').eq('id', p.current_step_id).single()
    phaseName = (phase as { name: string } | null)?.name ?? '-'
    stepName = (step as { name: string } | null)?.name ?? '-'
  }

  // 成長データ
  const dashboard = await getStudentDashboard(id)

  // トレーニング履歴
  const { data: sessions } = await supabase
    .from('daily_sessions')
    .select('id, date, duration_min, status, created_at')
    .eq('student_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // テスト結果履歴
  const { data: tests } = await supabase
    .from('training_tests')
    .select('segment_type, accuracy_pct, total_questions, correct_count, completed_at')
    .eq('student_id', id)
    .order('completed_at', { ascending: false })
    .limit(20)

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/students" className="text-zinc-400 hover:text-zinc-600">&larr; 一覧</Link>
        <h2 className="text-xl font-bold text-zinc-900">
          {s.student_name as string ?? s.student_login_id as string}
        </h2>
        <Link
          href={`/admin/students/${id}/edit`}
          className="rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
        >
          編集
        </Link>
      </div>

      {/* 基本情報 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard label="ログインID" value={s.student_login_id as string} />
        <InfoCard label="学年" value={gradeName} />
        <InfoCard label="ジャンル" value={subjectName} />
        <InfoCard label="ステータス" value={s.status === 'active' ? '利用中' : '停止中'} />
      </div>

      {/* 進捗 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard label="フェーズ" value={phaseName} />
        <InfoCard label="ステップ" value={stepName} />
        <InfoCard label="トレーニング回数" value={`${(progress as Record<string, unknown> | null)?.total_training_count ?? 0}回`} />
        <InfoCard label="最終トレーニング" value={
          (progress as Record<string, unknown> | null)?.last_training_at
            ? new Date((progress as Record<string, unknown>).last_training_at as string).toLocaleDateString('ja-JP')
            : '-'
        } />
      </div>

      {/* 成長グラフ */}
      <div className="mb-6">
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">成長記録</h3>
        <GrowthChart
          speedHistory={dashboard.speedHistory}
          testHistory={dashboard.testHistory}
          latestWpm={dashboard.latestWpm}
          growthRate={dashboard.growthRate}
          avgAccuracy={dashboard.avgAccuracy}
        />
      </div>

      {/* トレーニング履歴 */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">トレーニング履歴</h3>
        {(!sessions || sessions.length === 0) ? (
          <p className="text-sm text-zinc-500">まだ記録がありません</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">日付</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-600">コース</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-600">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(sessions as Array<Record<string, unknown>>).map((sess, i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-700">{sess.date as string}</td>
                  <td className="px-3 py-2 text-center text-zinc-600">{sess.duration_min as number}分</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sess.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sess.status === 'completed' ? '完了' : '途中'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* テスト結果 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">テスト結果</h3>
        {(!tests || tests.length === 0) ? (
          <p className="text-sm text-zinc-500">まだ記録がありません</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">日時</th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600">種目</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-600">正解</th>
                <th className="px-3 py-2 text-center font-medium text-zinc-600">正答率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(tests as Array<Record<string, unknown>>).map((t, i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-600 text-xs">
                    {new Date(t.completed_at as string).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{t.segment_type as string}</td>
                  <td className="px-3 py-2 text-center text-zinc-600">
                    {t.correct_count as number}/{t.total_questions as number}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-medium ${
                      (t.accuracy_pct as number) >= 80 ? 'text-green-600' :
                      (t.accuracy_pct as number) >= 60 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {Math.round(t.accuracy_pct as number)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  )
}
