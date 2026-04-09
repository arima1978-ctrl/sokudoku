'use client'

interface SpeedResultScreenProps {
  label: string
  wpm: number
  /** 前計測との差分（後計測時のみ） */
  diffFromPre?: number | null
  buttonLabel: string
  onNext: () => void
}

/**
 * 読書スピード計測直後に表示する単一結果画面。
 * pre/post 計測直後にWPMを表示し、ボタンで次のフェーズへ進む。
 */
export default function SpeedResultScreen({
  label,
  wpm,
  diffFromPre,
  buttonLabel,
  onNext,
}: SpeedResultScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}
    >
      <div className="text-center px-6">
        <div className="mb-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white">
          {label}
        </div>
        <h2 className="mb-2 text-base text-zinc-600">あなたの読書スピード</h2>
        <div className="mb-2 text-5xl font-bold text-zinc-900">
          {wpm.toLocaleString()}
          <span className="ml-2 text-base font-medium text-zinc-500">文字/分</span>
        </div>
        {diffFromPre !== null && diffFromPre !== undefined && (
          <p
            className={`mb-6 text-sm font-bold ${
              diffFromPre > 0 ? 'text-green-600' : diffFromPre < 0 ? 'text-red-500' : 'text-zinc-500'
            }`}
          >
            {diffFromPre > 0 && '+'}
            {diffFromPre.toLocaleString()} 文字/分 {diffFromPre > 0 ? 'アップ！' : diffFromPre < 0 ? 'ダウン' : '変化なし'}
          </p>
        )}
        <button
          type="button"
          onClick={onNext}
          style={{
            padding: '14px 48px',
            borderRadius: 28,
            border: '2px solid #E6C200',
            background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
            color: '#333',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: 24,
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
