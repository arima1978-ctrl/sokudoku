import { getLoggedInSchool } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'
import { getBulkReportData, type BulkReportStudent } from '@/app/actions/coachHistory'
import PrintButton from '@/components/admin/PrintButton'

interface PageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function BulkPrintPage({ searchParams }: PageProps) {
  const { ids } = await searchParams
  const school = await getLoggedInSchool()
  if (!school) redirect('/admin/login')

  if (!ids) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-zinc-500">印刷する生徒が選択されていません</p>
      </div>
    )
  }

  const studentIds = ids.split(',').filter(Boolean)
  const students = await getBulkReportData(school.id, studentIds)
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .report-page { break-after: page; }
          .report-page:last-child { break-after: auto; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>

      {/* 操作バー（印刷時非表示） */}
      <div className="no-print fixed right-6 top-6 z-50 flex gap-2">
        <PrintButton />
        <a
          href="/admin/reports"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          戻る
        </a>
        <div className="flex items-center rounded-lg bg-zinc-800 px-3 text-sm text-white">
          {students.length}名分
        </div>
      </div>

      {/* レポート連結 */}
      <div style={{ fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif' }}>
        {students.map((student, idx) => (
          <div key={student.id} className="report-page mx-auto max-w-[210mm] bg-white px-8 py-6 text-zinc-900">
            <StudentReport
              student={student}
              schoolName={school.school_name}
              date={today}
              pageNum={idx + 1}
              totalPages={students.length}
            />
          </div>
        ))}
      </div>
    </>
  )
}

// ========== 1名分のレポート ==========

function StudentReport({ student, schoolName, date, pageNum, totalPages }: {
  student: BulkReportStudent
  schoolName: string
  date: string
  pageNum: number
  totalPages: number
}) {
  const { coach, speedTrend, sessionHistory, dashboard } = student

  return (
    <>
      {/* ヘッダー */}
      <header className="mb-5 border-b-2 border-blue-600 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-700">速読トレーニング 学習レポート</h1>
            <div className="mt-0.5 text-xs text-zinc-500">{schoolName}</div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <div>{date}</div>
            <div>{pageNum} / {totalPages}</div>
          </div>
        </div>
      </header>

      {/* 生徒情報 */}
      <section className="avoid-break mb-4">
        <div className="grid grid-cols-4 gap-3 rounded-lg border border-zinc-200 p-3">
          <InfoCell label="生徒名" value={student.studentName ?? '-'} bold />
          <InfoCell label="学年" value={student.gradeName ?? '-'} />
          <InfoCell label="累計トレーニング" value={`${coach?.totalTrainingCount ?? 0}回`} />
          <InfoCell label="最���トレーニング" value={
            coach?.lastTrainingAt
              ? new Date(coach.lastTrainingAt).toLocaleDateString('ja-JP')
              : '-'
          } />
        </div>
      </section>

      {/* ステージ + サマリー 横並��� */}
      {coach && (
        <section className="avoid-break mb-4 grid grid-cols-2 gap-3">
          {/* ��: ステージ */}
          <div className="rounded-lg border border-zinc-200 p-3">
            <div className="mb-2 text-[10px] font-bold text-zinc-500">現在のステージ</div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {coach.stageNumber}
              </div>
              <div>
                <div className="text-sm font-bold">Stage {coach.stageNumber}: {coach.stageName}</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, Math.round((coach.stageSessionCount / coach.minSessions) * 100))}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500">{coach.stageSessionCount}/{coach.minSessions}回</span>
                </div>
              </div>
            </div>
            {/* 条件 */}
            <div className="mt-2 flex gap-2 text-[10px]">
              <CondTag met={coach.stageSessionCount >= coach.minSessions} label={`${coach.minSessions}回実施`} />
              <CondTag met={coach.block240Cleared} label="240カウント" />
              <CondTag met={coach.blockAccuracy90} label="90%正答率" />
            </div>
          </div>

          {/* 右: 数値サマリー */}
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="読書��度" value={`${dashboard.latestWpm ?? '-'}`} unit="文字/分" color="blue" />
            <MiniStat label="最高速度" value={`${coach.bestWpm ?? '-'}`} unit="文字/分" color="green" />
            <MiniStat label="成長率" value={dashboard.growthRate !== null ? `${dashboard.growthRate > 0 ? '+' : ''}${dashboard.growthRate}` : '-'} unit="%" color={dashboard.growthRate !== null && dashboard.growthRate > 0 ? 'green' : 'zinc'} />
            <MiniStat label="平均正答率" value={dashboard.avgAccuracy !== null ? `${Math.round(dashboard.avgAccuracy)}` : '-'} unit="%" color="purple" />
          </div>
        </section>
      )}

      {/* 速度推移グラフ */}
      {speedTrend.length >= 2 && (
        <section className="avoid-break mb-4">
          <SectionTitle>読書速度の推移</SectionTitle>
          <div className="rounded-lg border border-zinc-200 p-3">
            <SpeedChart data={speedTrend} />
          </div>
        </section>
      )}

      {/* 速度計測��ーブル + トレーニング履歴 横並び */}
      <section className="avoid-break mb-4 grid grid-cols-2 gap-3">
        {/* 速度計測 */}
        <div>
          <SectionTitle>速度計測記録</SectionTitle>
          {speedTrend.length > 0 ? (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="px-1.5 py-1 text-left font-semibold text-zinc-600">日付</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">前</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">後</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">伸び</th>
                </tr>
              </thead>
              <tbody>
                {speedTrend.slice(-8).map((item, i) => {
                  const diff = item.postWpm !== null ? item.postWpm - item.preWpm : null
                  return (
                    <tr key={i} className="border-b border-zinc-50">
                      <td className="px-1.5 py-0.5">{item.date.slice(5)}</td>
                      <td className="px-1.5 py-0.5 text-center">{item.preWpm}</td>
                      <td className="px-1.5 py-0.5 text-center">{item.postWpm ?? '-'}</td>
                      <td className="px-1.5 py-0.5 text-center">
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
          ) : (
            <div className="rounded border border-zinc-100 p-3 text-center text-[10px] text-zinc-400">記録なし</div>
          )}
        </div>

        {/* ���レーニング履歴 */}
        <div>
          <SectionTitle>トレーニング履歴</SectionTitle>
          {sessionHistory.length > 0 ? (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="px-1.5 py-1 text-left font-semibold text-zinc-600">日付</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">時間</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">前</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">後</th>
                  <th className="px-1.5 py-1 text-center font-semibold text-zinc-600">状態</th>
                </tr>
              </thead>
              <tbody>
                {sessionHistory.slice(0, 8).map((sess) => (
                  <tr key={sess.id} className="border-b border-zinc-50">
                    <td className="px-1.5 py-0.5">{sess.date}</td>
                    <td className="px-1.5 py-0.5 text-center">{sess.durationMin}分</td>
                    <td className="px-1.5 py-0.5 text-center">{sess.preWpm ?? '-'}</td>
                    <td className="px-1.5 py-0.5 text-center">{sess.postWpm ?? '-'}</td>
                    <td className="px-1.5 py-0.5 text-center">
                      {sess.status === 'completed' ? '完了' : '途中'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-zinc-100 p-3 text-center text-[10px] text-zinc-400">記録なし</div>
          )}
        </div>
      </section>

      {/* フッター */}
      <footer className="mt-auto border-t border-zinc-200 pt-2 text-center text-[9px] text-zinc-400">
        速読トレーニングシステム - {schoolName} | {date} 発��
      </footer>
    </>
  )
}

// ========== Sub Components ==========

function InfoCell({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-zinc-400">{label}</div>
      <div className={`text-sm ${bold ? 'font-bold' : 'font-medium'}`}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-700">
      <span className="inline-block h-3 w-0.5 rounded-full bg-blue-600" />
      {children}
    </h3>
  )
}

function MiniStat({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string
}) {
  const colors: Record<string, { bg: string; text: string; sub: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', sub: 'text-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', sub: 'text-green-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-500' },
    zinc: { bg: 'bg-zinc-50', text: 'text-zinc-700', sub: 'text-zinc-400' },
  }
  const c = colors[color] ?? colors.zinc
  return (
    <div className={`rounded-md ${c.bg} p-2 text-center`}>
      <div className={`text-[9px] ${c.sub}`}>{label}</div>
      <div className={`text-base font-bold ${c.text}`}>{value}</div>
      <div className={`text-[9px] ${c.sub}`}>{unit}</div>
    </div>
  )
}

function CondTag({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${
      met ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-400'
    }`}>
      <span>{met ? '\u2713' : '\u25CB'}</span> {label}
    </span>
  )
}

function SpeedChart({ data }: { data: Array<{ date: string; preWpm: number; postWpm: number | null }> }) {
  const w = 480, h = 120
  const pad = { top: 14, right: 12, bottom: 22, left: 36 }
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  const allV = data.flatMap(d => [d.preWpm, ...(d.postWpm !== null ? [d.postWpm] : [])])
  const minV = Math.min(...allV) * 0.9
  const maxV = Math.max(...allV) * 1.05
  const range = maxV - minV || 1

  const toX = (i: number) => pad.left + (i / Math.max(1, data.length - 1)) * cw
  const toY = (v: number) => pad.top + ch - ((v - minV) / range) * ch

  const prePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.preWpm)}`).join(' ')
  const postPath = data
    .map((d, i) => d.postWpm !== null ? `${i === 0 || data[i - 1]?.postWpm === null ? 'M' : 'L'} ${toX(i)} ${toY(d.postWpm)}` : '')
    .filter(Boolean).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 150 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(r => {
        const y = pad.top + ch * (1 - r)
        return (
          <g key={r}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={pad.left - 3} y={y + 3} textAnchor="end" fontSize={7} fill="#9ca3af">
              {Math.round(minV + range * r)}
            </text>
          </g>
        )
      })}
      <path d={prePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      {data.map((d, i) => <circle key={`p${i}`} cx={toX(i)} cy={toY(d.preWpm)} r={2} fill="#3b82f6" />)}
      {postPath && <path d={postPath} fill="none" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 2" />}
      {data.map((d, i) => d.postWpm !== null ? <circle key={`o${i}`} cx={toX(i)} cy={toY(d.postWpm)} r={2} fill="#10b981" /> : null)}
      {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / 5)) === 0).map((d) => (
        <text key={d.date} x={toX(data.indexOf(d))} y={h - 4} textAnchor="middle" fontSize={6} fill="#9ca3af">{d.date.slice(5)}</text>
      ))}
      <circle cx={pad.left + 2} cy={7} r={2.5} fill="#3b82f6" />
      <text x={pad.left + 8} y={9.5} fontSize={7} fill="#3b82f6">前</text>
      <circle cx={pad.left + 26} cy={7} r={2.5} fill="#10b981" />
      <text x={pad.left + 32} y={9.5} fontSize={7} fill="#10b981">後</text>
    </svg>
  )
}
