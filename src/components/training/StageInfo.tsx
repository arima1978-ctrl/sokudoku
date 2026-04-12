'use client'

import { useState } from 'react'
import type { Direction } from '@/lib/coach'

interface StageInfoProps {
  stageNumber: number
  stageName: string
  sessionCount: number
  minSessions: number
  nextDirection: Direction
  fluencyReported: boolean
  onReportFluency: () => Promise<void>
}

export default function StageInfo({
  stageNumber,
  stageName,
  sessionCount,
  minSessions,
  nextDirection,
  fluencyReported,
  onReportFluency,
}: StageInfoProps) {
  const [reporting, setReporting] = useState(false)

  const canReport = sessionCount >= minSessions && !fluencyReported
  const progressPct = Math.min(100, Math.round((sessionCount / minSessions) * 100))

  async function handleReport() {
    setReporting(true)
    try {
      await onReportFluency()
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* ステージバッジ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
            {stageNumber}
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900">
              Stage {stageNumber}: {stageName}
            </div>
            <div className="text-xs text-zinc-500">
              {sessionCount}/{minSessions} 回完了
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">次回の方向</div>
          <div className="text-sm font-bold text-blue-600">
            {nextDirection === 'tate' ? 'たて' : 'よこ'}
          </div>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 流暢性報告ボタン */}
      {canReport && (
        <button
          type="button"
          onClick={handleReport}
          disabled={reporting}
          className="mt-3 w-full rounded-lg border-2 border-green-400 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
        >
          {reporting
            ? '報告中...'
            : '240カウントまでスムーズに読めた'}
        </button>
      )}
      {fluencyReported && sessionCount >= minSessions && (
        <div className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-center text-sm text-green-700">
          次回のトレーニングでステージアップします
        </div>
      )}
    </div>
  )
}
