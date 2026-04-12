import {
  getStudentByParentToken,
  getCoachProgressSummary,
  getSessionHistory,
  getSpeedTrend,
} from '@/app/actions/coachHistory'
import { getStudentDashboard } from '@/app/actions/history'
import GrowthChart from '@/components/training/GrowthChart'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ParentReportPage({ params }: PageProps) {
  const { token } = await params

  const student = await getStudentByParentToken(token)

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-zinc-900">ページが見つかりません</h1>
          <p className="text-sm text-zinc-500">リンクが無効か、期限切れの可能性があります。</p>
        </div>
      </div>
    )
  }

  const [coachProgress, sessionHistory, speedTrend, dashboard] = await Promise.all([
    getCoachProgressSummary(student.id),
    getSessionHistory(student.id, 10),
    getSpeedTrend(student.id, 15),
    getStudentDashboard(student.id),
  ])

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ヘッダー */}
      <header className="border-b border-zinc-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-xs text-zinc-500">{student.schoolName}</div>
          <h1 className="text-lg font-bold text-zinc-900">
            {student.studentName ?? '生徒'}さんの学習レポート
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* コーチ進行状況 */}
        {coachProgress && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-zinc-900">現在の進行状況</h2>

            {/* ステージ表示 */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
                {coachProgress.stageNumber}
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-900">
                  Stage {coachProgress.stageNumber}: {coachProgress.stageName}
                </div>
                <div className="text-sm text-zinc-500">
                  {coachProgress.stageSessionCount}回 / 最低{coachProgress.minSessions}回
                </div>
              </div>
            </div>

            {/* 進捗バー */}
            <div className="mb-4">
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((coachProgress.stageSessionCount / coachProgress.minSessions) * 100))}%` }}
                />
              </div>
            </div>

            {/* 統計カード */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <div className="text-xs text-blue-600">読書速度</div>
                <div className="mt-1 text-lg font-bold text-blue-700">
                  {coachProgress.latestWpm ?? '-'}
                </div>
                <div className="text-xs text-blue-500">文字/分</div>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <div className="text-xs text-green-600">最高速度</div>
                <div className="mt-1 text-lg font-bold text-green-700">
                  {coachProgress.bestWpm ?? '-'}
                </div>
                <div className="text-xs text-green-500">文字/分</div>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 text-center">
                <div className="text-xs text-purple-600">正答率</div>
                <div className="mt-1 text-lg font-bold text-purple-700">
                  {coachProgress.avgAccuracy !== null ? `${Math.round(coachProgress.avgAccuracy)}%` : '-'}
                </div>
              </div>
            </div>

            {/* 総トレーニング回数 */}
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-center text-sm text-zinc-600">
              累計トレーニング: <span className="font-bold text-zinc-900">{coachProgress.totalTrainingCount}回</span>
              {coachProgress.lastTrainingAt && (
                <span className="ml-2 text-xs text-zinc-400">
                  (最終: {new Date(coachProgress.lastTrainingAt).toLocaleDateString('ja-JP')})
                </span>
              )}
            </div>
          </section>
        )}

        {/* ステージアップ条件 */}
        {coachProgress && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-zinc-900">ステージアップまでの条件</h2>
            <div className="space-y-2">
              <ConditionRow
                met={coachProgress.stageSessionCount >= coachProgress.minSessions}
                label={`最低${coachProgress.minSessions}回のトレーニング`}
                detail={`${coachProgress.stageSessionCount}/${coachProgress.minSessions}回完了`}
              />
              <ConditionRow
                met={coachProgress.block240Cleared}
                label="ブロック読み 240カウント突破"
                detail={coachProgress.block240Cleared ? '達成済み' : '未達成'}
              />
              <ConditionRow
                met={coachProgress.blockAccuracy90}
                label="ブロック読み 正答率90%以上"
                detail={coachProgress.blockAccuracy90 ? '達成済み' : '未達成'}
              />
            </div>
          </section>
        )}

        {/* 成長グラフ */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-zinc-900">成長記録</h2>
          <GrowthChart
            speedHistory={dashboard.speedHistory}
            testHistory={dashboard.testHistory}
            latestWpm={dashboard.latestWpm}
            growthRate={dashboard.growthRate}
            avgAccuracy={dashboard.avgAccuracy}
          />
        </section>

        {/* 速度推移 */}
        {speedTrend.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-zinc-900">速度の推移</h2>
            <div className="space-y-2">
              {speedTrend.slice(-10).map((item, i) => {
                const diff = item.postWpm !== null ? item.postWpm - item.preWpm : null
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <span className="text-zinc-500">{item.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600">{item.preWpm}</span>
                      <span className="text-zinc-300">{'\u2192'}</span>
                      <span className="text-zinc-600">{item.postWpm ?? '-'}</span>
                      {diff !== null && (
                        <span className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({diff >= 0 ? '+' : ''}{diff})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 最近のトレーニング */}
        {sessionHistory.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-zinc-900">最近のトレーニング</h2>
            <div className="space-y-2">
              {sessionHistory.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  <div>
                    <span className="text-zinc-700">{sess.date}</span>
                    <span className="ml-2 text-xs text-zinc-400">{sess.durationMin}分コース</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    sess.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sess.status === 'completed' ? '完了' : '途中'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* フッター */}
        <footer className="py-4 text-center text-xs text-zinc-400">
          このレポートは速読トレーニングシステムにより自動生成されています
        </footer>
      </main>
    </div>
  )
}

function ConditionRow({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`text-base ${met ? 'text-green-600' : 'text-zinc-300'}`}>
          {met ? '\u2713' : '\u25CB'}
        </span>
        <span className={`text-sm ${met ? 'text-zinc-700' : 'text-zinc-400'}`}>{label}</span>
      </div>
      <span className={`text-xs ${met ? 'text-green-600 font-medium' : 'text-zinc-400'}`}>
        {detail}
      </span>
    </div>
  )
}
