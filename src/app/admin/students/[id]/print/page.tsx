import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getCoachProgressSummary,
  getSessionHistory,
  getSpeedTrend,
} from '@/app/actions/coachHistory'
import { getStudentDashboard } from '@/app/actions/history'
import PrintButton from '@/components/admin/PrintButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrintReportPage({ params }: PageProps) {
  const { id } = await params
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  const { data: student } = await supabase
    .from('students')
    .select('id, student_name, student_login_id, grade_level_id')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  if (!student) {
    return <div className="p-8 text-center text-zinc-500">生徒が見つかりません</div>
  }

  const s = student as Record<string, unknown>

  let gradeName = '-'
  if (s.grade_level_id) {
    const { data: grade } = await supabase.from('grade_levels').select('name').eq('id', s.grade_level_id).single()
    gradeName = (grade as { name: string } | null)?.name ?? '-'
  }

  const [coachProgress, sessionHistory, speedTrend, dashboard] = await Promise.all([
    getCoachProgressSummary(id),
    getSessionHistory(id, 15),
    getSpeedTrend(id, 20),
    getStudentDashboard(id),
  ])

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      {/* 印刷用グローバルスタイル */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { break-after: page; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      {/* 印刷/PDFボタン（印刷時は非表示） */}
      <div className="no-print fixed right-6 top-6 z-50 flex gap-2">
        <PrintButton />
        <a
          href={`/admin/students/${id}`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          戻る
        </a>
      </div>

      {/* ========== レポート本体 ========== */}
      <div className="mx-auto max-w-[210mm] bg-white px-8 py-6 text-zinc-900" style={{ fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif' }}>

        {/* --- ヘッダー --- */}
        <header className="mb-6 border-b-2 border-blue-600 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">速読トレーニング 学習レポート</h1>
              <div className="mt-1 text-sm text-zinc-500">{school.school_name}</div>
            </div>
            <div className="text-right text-sm text-zinc-500">
              <div>発行日: {today}</div>
            </div>
          </div>
        </header>

        {/* --- 生徒情報 --- */}
        <section className="avoid-break mb-6">
          <div className="grid grid-cols-4 gap-3 rounded-lg border border-zinc-200 p-4">
            <div>
              <div className="text-[10px] text-zinc-400">生徒名</div>
              <div className="text-base font-bold">{s.student_name as string ?? '-'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-400">学年</div>
              <div className="text-base font-medium">{gradeName}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-400">累計トレーニング</div>
              <div className="text-base font-medium">{coachProgress?.totalTrainingCount ?? 0}回</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-400">最終トレーニング</div>
              <div className="text-base font-medium">
                {coachProgress?.lastTrainingAt
                  ? new Date(coachProgress.lastTrainingAt).toLocaleDateString('ja-JP')
                  : '-'}
              </div>
            </div>
          </div>
        </section>

        {/* --- ステージ進行状況 --- */}
        {coachProgress && (
          <section className="avoid-break mb-6">
            <SectionTitle>現在のステージ</SectionTitle>
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {coachProgress.stageNumber}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-bold">
                    Stage {coachProgress.stageNumber}: {coachProgress.stageName}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, Math.round((coachProgress.stageSessionCount / coachProgress.minSessions) * 100))}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {coachProgress.stageSessionCount}/{coachProgress.minSessions}回
                    </span>
                  </div>
                </div>
              </div>

              {/* ステージアップ条件 */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ConditionBadge
                  met={coachProgress.stageSessionCount >= coachProgress.minSessions}
                  label={`${coachProgress.minSessions}回実施`}
                />
                <ConditionBadge met={coachProgress.block240Count >= 5} label={`240カウント(${coachProgress.block240Count}/5)`} />
                <ConditionBadge met={coachProgress.block90Count >= 5} label={`90%正答率(${coachProgress.block90Count}/5)`} />
              </div>
            </div>
          </section>
        )}

        {/* --- 数値サマリー --- */}
        <section className="avoid-break mb-6">
          <SectionTitle>成績サマリー</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="現在の読書速度" value={`${coachProgress?.latestWpm ?? '-'}`} unit="文字/分" accent="blue" />
            <StatBox label="最高速度" value={`${coachProgress?.bestWpm ?? '-'}`} unit="文字/分" accent="green" />
            <StatBox label="成長率" value={dashboard.growthRate !== null ? `${dashboard.growthRate > 0 ? '+' : ''}${dashboard.growthRate}` : '-'} unit="%" accent={dashboard.growthRate !== null && dashboard.growthRate > 0 ? 'green' : 'zinc'} />
            <StatBox label="平均正答率" value={coachProgress?.avgAccuracy !== null ? `${Math.round(coachProgress?.avgAccuracy ?? 0)}` : '-'} unit="%" accent="purple" />
          </div>
        </section>

        {/* --- 速度推移グラフ（SVG: 印刷対応） --- */}
        {speedTrend.length >= 2 && (
          <section className="avoid-break mb-6">
            <SectionTitle>読書速度の推移</SectionTitle>
            <div className="rounded-lg border border-zinc-200 p-4">
              <SpeedChart data={speedTrend} />
            </div>
          </section>
        )}

        {/* --- 速度推移テーブル --- */}
        {speedTrend.length > 0 && (
          <section className="avoid-break mb-6">
            <SectionTitle>速度計測記録</SectionTitle>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-300">
                  <th className="px-2 py-1.5 text-left font-semibold text-zinc-600">日付</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">測定(前)</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">測定(後)</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">伸び幅</th>
                </tr>
              </thead>
              <tbody>
                {speedTrend.map((item, i) => {
                  const diff = item.postWpm !== null ? item.postWpm - item.preWpm : null
                  return (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-2 py-1.5 text-zinc-700">{item.date}</td>
                      <td className="px-2 py-1.5 text-center">{item.preWpm} 文字/分</td>
                      <td className="px-2 py-1.5 text-center">{item.postWpm !== null ? `${item.postWpm} 文字/分` : '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {diff !== null ? (
                          <span className={diff >= 0 ? 'text-green-700 font-semibold' : 'text-red-600'}>
                            {diff >= 0 ? '+' : ''}{diff}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* --- トレーニング履歴 --- */}
        {sessionHistory.length > 0 && (
          <section className="avoid-break mb-6">
            <SectionTitle>トレーニング履歴（直近{sessionHistory.length}回）</SectionTitle>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-300">
                  <th className="px-2 py-1.5 text-left font-semibold text-zinc-600">日付</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">コース</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">前(文字/分)</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">後(文字/分)</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-zinc-600">状態</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.map((sess) => (
                  <tr key={sess.id} className="border-b border-zinc-100">
                    <td className="px-2 py-1.5 text-zinc-700">{sess.date}</td>
                    <td className="px-2 py-1.5 text-center">{sess.durationMin}分</td>
                    <td className="px-2 py-1.5 text-center">{sess.preWpm ?? '-'}</td>
                    <td className="px-2 py-1.5 text-center">{sess.postWpm ?? '-'}</td>
                    <td className="px-2 py-1.5 text-center">
                      {sess.status === 'completed' ? '完了' : '途中'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* --- フッター --- */}
        <footer className="mt-8 border-t border-zinc-200 pt-3 text-center text-[10px] text-zinc-400">
          <div>速読トレーニングシステム - {school.school_name}</div>
          <div>このレポートは {today} 時点のデータに基づいて自動生成されています</div>
        </footer>
      </div>
    </>
  )
}

// ========== Sub Components ==========

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-800">
      <span className="inline-block h-4 w-1 rounded-full bg-blue-600" />
      {children}
    </h2>
  )
}

function StatBox({ label, value, unit, accent }: {
  label: string; value: string; unit: string; accent: string
}) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', label: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'text-purple-600' },
    zinc: { bg: 'bg-zinc-50', text: 'text-zinc-700', label: 'text-zinc-500' },
  }
  const c = colors[accent] ?? colors.zinc
  return (
    <div className={`rounded-lg ${c.bg} p-3 text-center`}>
      <div className={`text-[10px] ${c.label}`}>{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${c.text}`}>{value}</div>
      <div className={`text-[10px] ${c.label}`}>{unit}</div>
    </div>
  )
}

function ConditionBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
      met ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-400'
    }`}>
      <span className="text-sm">{met ? '\u2713' : '\u25CB'}</span>
      <span className={met ? 'font-medium' : ''}>{label}</span>
    </div>
  )
}

/** 印刷対応のSVG速度推移グラフ（前後比較） */
function SpeedChart({ data }: { data: Array<{ date: string; preWpm: number; postWpm: number | null }> }) {
  const width = 560
  const height = 160
  const pad = { top: 16, right: 16, bottom: 28, left: 44 }
  const cw = width - pad.left - pad.right
  const ch = height - pad.top - pad.bottom

  const allVals = data.flatMap(d => [d.preWpm, ...(d.postWpm !== null ? [d.postWpm] : [])])
  const minV = Math.min(...allVals) * 0.9
  const maxV = Math.max(...allVals) * 1.05
  const range = maxV - minV || 1

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * cw
  const toY = (v: number) => pad.top + ch - ((v - minV) / range) * ch

  const prePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.preWpm)}`).join(' ')
  const postPoints = data.filter(d => d.postWpm !== null)
  const postPath = postPoints.length >= 2
    ? data.map((d, i) => d.postWpm !== null ? `${i === 0 || data[i - 1]?.postWpm === null ? 'M' : 'L'} ${toX(i)} ${toY(d.postWpm)}` : '').filter(Boolean).join(' ')
    : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* グリッド */}
      {[0, 0.25, 0.5, 0.75, 1].map(r => {
        const y = pad.top + ch * (1 - r)
        const val = Math.round(minV + range * r)
        return (
          <g key={r}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={pad.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#9ca3af">{val}</text>
          </g>
        )
      })}

      {/* 前(青) */}
      <path d={prePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
      {data.map((d, i) => <circle key={`pre-${i}`} cx={toX(i)} cy={toY(d.preWpm)} r={2.5} fill="#3b82f6" />)}

      {/* 後(緑) */}
      {postPath && <path d={postPath} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" />}
      {data.map((d, i) => d.postWpm !== null ? <circle key={`post-${i}`} cx={toX(i)} cy={toY(d.postWpm)} r={2.5} fill="#10b981" /> : null)}

      {/* X軸ラベル */}
      {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / 6)) === 0).map((d, i) => (
        <text key={i} x={toX(data.indexOf(d))} y={height - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">
          {d.date.slice(5)}
        </text>
      ))}

      {/* 凡例 */}
      <circle cx={pad.left + 4} cy={8} r={3} fill="#3b82f6" />
      <text x={pad.left + 12} y={11} fontSize={8} fill="#3b82f6">測定(前)</text>
      <circle cx={pad.left + 60} cy={8} r={3} fill="#10b981" />
      <text x={pad.left + 68} y={11} fontSize={8} fill="#10b981">測定(後)</text>
    </svg>
  )
}
