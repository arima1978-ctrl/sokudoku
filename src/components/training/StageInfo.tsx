'use client'

import type { Direction } from '@/lib/coach'

interface StageInfoProps {
  stageNumber: number
  stageName: string
  sessionCount: number
  minSessions: number
  nextDirection: Direction
  block240Cleared: boolean
  blockAccuracy90: boolean
}

export default function StageInfo({
  stageNumber,
  stageName,
  sessionCount,
  minSessions,
  nextDirection,
  block240Cleared,
  blockAccuracy90,
}: StageInfoProps) {
  const progressPct = Math.min(100, Math.round((sessionCount / minSessions) * 100))
  const sessionsReached = sessionCount >= minSessions
  const allConditionsMet = sessionsReached && block240Cleared && blockAccuracy90

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

      {/* ステージアップ条件チェックリスト */}
      <div className="mt-3 space-y-1">
        <div className="text-xs font-medium text-zinc-500">ステージアップ条件</div>
        <div className="flex items-center gap-2 text-xs">
          <span className={sessionsReached ? 'text-green-600' : 'text-zinc-400'}>
            {sessionsReached ? '\u2713' : '\u25CB'}
          </span>
          <span className={sessionsReached ? 'text-zinc-700' : 'text-zinc-400'}>
            最低{minSessions}回実施 ({sessionCount}/{minSessions})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={block240Cleared ? 'text-green-600' : 'text-zinc-400'}>
            {block240Cleared ? '\u2713' : '\u25CB'}
          </span>
          <span className={block240Cleared ? 'text-zinc-700' : 'text-zinc-400'}>
            ブロック読み 240カウント突破
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={blockAccuracy90 ? 'text-green-600' : 'text-zinc-400'}>
            {blockAccuracy90 ? '\u2713' : '\u25CB'}
          </span>
          <span className={blockAccuracy90 ? 'text-zinc-700' : 'text-zinc-400'}>
            ブロック読み 正答率90%以上
          </span>
        </div>
      </div>

      {/* 全条件達成メッセージ */}
      {allConditionsMet && (
        <div className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-center text-sm text-green-700">
          次回のトレーニングでステージアップします
        </div>
      )}
    </div>
  )
}
