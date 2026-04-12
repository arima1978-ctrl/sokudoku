'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentCoachOverview } from '@/app/actions/coachHistory'

interface Props {
  students: StudentCoachOverview[]
  gradeLevels: Array<{ id: string; name: string }>
}

export default function BulkReportSelector({ students, gradeLevels }: Props) {
  const router = useRouter()
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // フィルタ適用
  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterGrade !== 'all') {
        // grade_level_id は StudentCoachOverview には無いので、全件表示にする
        // 実際のフィルタは server side で行うが、ここでは stage でフィルタ
      }
      if (filterStage !== 'all' && s.stageNumber !== Number(filterStage)) {
        return false
      }
      return true
    })
  }, [students, filterGrade, filterStage])

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(s => s.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handlePrint() {
    if (selected.size === 0) return
    const ids = Array.from(selected).join(',')
    router.push(`/admin/reports/print?ids=${encodeURIComponent(ids)}`)
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">ステージ</label>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="all">全ステージ</option>
            <option value="1">Stage 1: 3点読み</option>
            <option value="2">Stage 2: 2点読み</option>
            <option value="3">Stage 3: 1行読み</option>
            <option value="4">Stage 4: 2行読み</option>
            <option value="5">Stage 5: ブロック読み</option>
          </select>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-zinc-500">
          {selected.size}名 選択中 / {filtered.length}名
        </div>

        <button
          type="button"
          onClick={handlePrint}
          disabled={selected.size === 0}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          選択した{selected.size}名のレポートを印刷
        </button>
      </div>

      {/* 生徒一覧テーブル */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-zinc-600">生徒名</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-600">ID</th>
              <th className="px-3 py-3 text-center font-medium text-zinc-600">ステージ</th>
              <th className="px-3 py-3 text-center font-medium text-zinc-600">回数</th>
              <th className="px-3 py-3 text-center font-medium text-zinc-600">速度</th>
              <th className="px-3 py-3 text-center font-medium text-zinc-600">240</th>
              <th className="px-3 py-3 text-center font-medium text-zinc-600">90%</th>
              <th className="px-3 py-3 text-left font-medium text-zinc-600">最終日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(s => (
              <tr
                key={s.id}
                className={`cursor-pointer transition-colors ${selected.has(s.id) ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
                onClick={() => toggle(s.id)}
              >
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="px-3 py-2.5 font-medium text-zinc-900">{s.studentName ?? '-'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{s.studentLoginId}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                      {s.stageNumber}
                    </span>
                    <span className="text-xs text-zinc-500">{s.stageName}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-zinc-600">
                  {s.stageSessionCount}/{s.minSessions}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {s.latestWpm ? <span className="font-medium text-blue-600">{s.latestWpm}</span> : '-'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={s.block240Cleared ? 'text-green-600' : 'text-zinc-300'}>
                    {s.block240Cleared ? '\u2713' : '\u2013'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={s.blockAccuracy90 ? 'text-green-600' : 'text-zinc-300'}>
                    {s.blockAccuracy90 ? '\u2713' : '\u2013'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {s.lastTrainingAt ? new Date(s.lastTrainingAt).toLocaleDateString('ja-JP') : '-'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-zinc-400">
                  該当する生徒がいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
