'use client'

interface DailyResultProps {
  preWpm: number | null
  postWpm: number | null
  trainingResults: Array<{ segment: string; accuracy: number }>
  onFinish: () => void
}

export default function DailyResult({
  preWpm,
  postWpm,
  trainingResults,
  onFinish,
}: DailyResultProps) {
  const hasSpeed = preWpm !== null && postWpm !== null
  const speedChange = hasSpeed ? postWpm - preWpm : null
  const speedChangePercent = hasSpeed && preWpm > 0
    ? Math.round(((postWpm - preWpm) / preWpm) * 100)
    : null

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-center text-xl font-bold text-zinc-900">
          本日のトレーニング結果
        </h2>

        {/* 速度変化 */}
        {hasSpeed && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-700">読書速度の変化</h3>
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4">
              <div className="text-center">
                <div className="text-xs text-zinc-500">トレーニング前</div>
                <div className="mt-1 text-2xl font-bold text-zinc-700">{preWpm}</div>
                <div className="text-xs text-zinc-400">文字/分</div>
              </div>
              <div className="text-center">
                <span className="text-2xl text-zinc-300">{'\u2192'}</span>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">トレーニング後</div>
                <div className="mt-1 text-2xl font-bold text-blue-600">{postWpm}</div>
                <div className="text-xs text-zinc-400">文字/分</div>
              </div>
            </div>
            {speedChange !== null && (
              <div className="mt-2 text-center">
                <span className={`text-lg font-bold ${
                  speedChange > 0 ? 'text-green-600' : speedChange < 0 ? 'text-red-500' : 'text-zinc-500'
                }`}>
                  {speedChange > 0 ? '+' : ''}{speedChange} 文字/分
                  {speedChangePercent !== null && ` (${speedChangePercent > 0 ? '+' : ''}${speedChangePercent}%)`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 速度が片方だけの場合 */}
        {!hasSpeed && (preWpm !== null || postWpm !== null) && (
          <div className="mb-6 rounded-lg bg-zinc-50 p-4 text-center">
            <div className="text-xs text-zinc-500">読書速度</div>
            <div className="mt-1 text-3xl font-bold text-blue-600">
              {preWpm ?? postWpm}
            </div>
            <div className="text-xs text-zinc-400">文字/分</div>
          </div>
        )}

        {/* テスト結果 */}
        {trainingResults.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-700">テスト結果</h3>
            <div className="space-y-2">
              {trainingResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                  <span className="text-sm text-zinc-700">{r.segment}</span>
                  <span className={`text-sm font-bold ${
                    r.accuracy >= 80 ? 'text-green-600' :
                    r.accuracy >= 60 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {r.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メッセージ */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center">
          {speedChange !== null && speedChange > 0 ? (
            <p className="text-sm font-medium text-blue-800">
              素晴らしい! 読書速度が向上しました!
            </p>
          ) : (
            <p className="text-sm font-medium text-blue-800">
              トレーニングお疲れさまでした!
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          メニューに戻る
        </button>
      </div>
    </div>
  )
}
