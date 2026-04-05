'use client'

import type { SpeedHistoryPoint, TrainingHistoryPoint } from '@/app/actions/history'

interface GrowthChartProps {
  speedHistory: SpeedHistoryPoint[]
  testHistory: TrainingHistoryPoint[]
  latestWpm: number | null
  growthRate: number | null
  avgAccuracy: number | null
}

export default function GrowthChart({
  speedHistory,
  testHistory,
  latestWpm,
  growthRate,
  avgAccuracy,
}: GrowthChartProps) {
  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="読書速度"
          value={latestWpm ? `${latestWpm}` : '-'}
          unit="文字/分"
          color="text-blue-600"
        />
        <StatCard
          label="成長率"
          value={growthRate !== null ? `${growthRate > 0 ? '+' : ''}${growthRate}` : '-'}
          unit="%"
          color={growthRate !== null && growthRate > 0 ? 'text-green-600' : 'text-zinc-600'}
        />
        <StatCard
          label="平均正答率"
          value={avgAccuracy !== null ? `${avgAccuracy}` : '-'}
          unit="%"
          color={avgAccuracy !== null && avgAccuracy >= 80 ? 'text-green-600' : 'text-orange-600'}
        />
      </div>

      {/* 速度グラフ（SVG） */}
      {speedHistory.length >= 2 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-medium text-zinc-700">読書速度の推移</h4>
          <SimpleLineChart
            data={speedHistory.map(p => p.wpm)}
            labels={speedHistory.map(p => {
              const d = new Date(p.measured_at)
              return `${d.getMonth() + 1}/${d.getDate()}`
            })}
            color="#3b82f6"
            unit="文字/分"
          />
        </div>
      )}

      {/* 正答率グラフ */}
      {testHistory.length >= 2 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-medium text-zinc-700">テスト正答率の推移</h4>
          <SimpleLineChart
            data={testHistory.map(p => p.accuracy_pct)}
            labels={testHistory.map(p => {
              const d = new Date(p.date)
              return `${d.getMonth() + 1}/${d.getDate()}`
            })}
            color="#10b981"
            unit="%"
            maxY={100}
          />
        </div>
      )}

      {speedHistory.length < 2 && testHistory.length < 2 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm text-zinc-500">
            トレーニングを続けるとグラフが表示されます
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-400">{unit}</div>
    </div>
  )
}

/** SVGベースのシンプルな折れ線グラフ */
function SimpleLineChart({ data, labels, color, unit, maxY }: {
  data: number[]; labels: string[]; color: string; unit: string; maxY?: number
}) {
  if (data.length < 2) return null

  const width = 320
  const height = 140
  const padding = { top: 10, right: 10, bottom: 24, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minVal = Math.min(...data)
  const maxVal = maxY ?? Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((v - minVal) / range) * chartH,
    value: v,
    label: labels[i],
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 180 }}>
      {/* グリッド線 */}
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = padding.top + chartH * (1 - r)
        const val = Math.round(minVal + range * r)
        return (
          <g key={r}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
              stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={padding.left - 4} y={y + 3} textAnchor="end"
              fontSize={8} fill="#9ca3af">{val}</text>
          </g>
        )
      })}

      {/* 折れ線 */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />

      {/* ドット */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* X軸ラベル（間引き） */}
      {points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0).map((p, i) => (
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">
          {p.label}
        </text>
      ))}

      {/* 最新値 */}
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8}
        textAnchor="middle" fontSize={9} fill={color} fontWeight="bold">
        {points[points.length - 1].value}{unit}
      </text>
    </svg>
  )
}
