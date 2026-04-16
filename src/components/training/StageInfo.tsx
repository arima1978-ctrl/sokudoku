'use client'

import Link from 'next/link'
import type { Direction } from '@/lib/coach'

interface StageInfoProps {
  stageNumber: number
  stageName: string
  sessionCount: number
  minSessions: number
  extraSessionsRequired: number
  finalTestPassed: boolean
  finalTestAttempts: number
  nextDirection: Direction
  countTarget: number
}

export default function StageInfo({
  stageNumber,
  stageName,
  sessionCount,
  minSessions,
  extraSessionsRequired,
  finalTestPassed,
  finalTestAttempts,
  nextDirection,
  countTarget,
}: StageInfoProps) {
  const sessionsRequired = minSessions + extraSessionsRequired
  const progressPct = Math.min(100, Math.round((sessionCount / sessionsRequired) * 100))
  const eligibleForFinalTest = sessionCount >= sessionsRequired

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* ステージバッジ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
            {stageNumber}
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900">{stageName}</div>
            <div className="text-xs text-zinc-500">
              {sessionCount}/{sessionsRequired} 回完了
              {extraSessionsRequired > 0 && (
                <span className="ml-1 text-orange-600">（追加+{extraSessionsRequired}）</span>
              )}
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

      {/* 進捗チェックリスト */}
      <div className="mt-3 space-y-1">
        <div className="text-xs font-medium text-zinc-500">ステージアップまでの進捗</div>
        <div className="flex items-center gap-2 text-xs">
          <span className={eligibleForFinalTest ? 'text-green-600' : 'text-zinc-400'}>
            {eligibleForFinalTest ? '\u2713' : '\u25CB'}
          </span>
          <span className={eligibleForFinalTest ? 'text-zinc-700' : 'text-zinc-400'}>
            STEP 1: 最低トレーニング回数 ({sessionCount}/{sessionsRequired})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={finalTestPassed ? 'text-green-600' : 'text-zinc-400'}>
            {finalTestPassed ? '\u2713' : '\u25CB'}
          </span>
          <span className={finalTestPassed ? 'text-zinc-700' : 'text-zinc-400'}>
            STEP 2: ステージ修了テスト合格（目標 {countTarget} カウント）
          </span>
        </div>
        {finalTestAttempts > 0 && !finalTestPassed && (
          <div className="ml-5 text-xs text-orange-600">
            受験 {finalTestAttempts} 回 / 不合格
          </div>
        )}
      </div>

      {/* 修了テストへのリンク */}
      {eligibleForFinalTest && !finalTestPassed && (
        <Link
          href="/training/final-test"
          className="mt-3 block w-full rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 py-3 text-center text-sm font-black text-white shadow-md hover:shadow-lg"
        >
          🎯 ステージ修了テストに挑戦
        </Link>
      )}

      {finalTestPassed && (
        <div className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-center text-sm text-green-700">
          🎉 修了テスト合格！次のステージへ
        </div>
      )}
    </div>
  )
}
