'use client'

import { useEffect, useState, useCallback } from 'react'

interface ShunkanDisplayProps {
  /** 表示する単語リスト */
  words: { body: string; answer?: string }[]
  /** 表示タイプ */
  displayType: 'barabara' | 'tate_1line' | 'tate_2line' | 'yoko_1line' | 'yoko_2line'
  /** フラッシュ間隔（ミリ秒） */
  intervalMs?: number
  /** フラッシュ表示時間（ミリ秒） */
  flashMs?: number
  /** 現在のフラッシュ単語を親に通知 */
  onFlash?: (word: string) => void
  /** 一時停止中か */
  paused?: boolean
}

/**
 * 速読トレーニング 文字表示コンポーネント
 * 既存システム（100万人の速読）のデザインを再現
 */
export default function ShunkanDisplay({
  words,
  displayType,
  intervalMs = 2000,
  flashMs = 700,
  onFlash,
  paused = false,
}: ShunkanDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showText, setShowText] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)

  const currentWord = words[currentIndex]
  const text = currentWord?.body ?? ''
  const answer = currentWord?.answer ?? text

  const nextWord = useCallback(() => {
    if (paused) return
    setShowAnswer(false)
    setShowText(true)
    setCurrentIndex((prev) => (prev + 1) % words.length)
  }, [paused, words.length])

  // フラッシュサイクル
  useEffect(() => {
    if (paused || words.length === 0) return

    const flashTimer = setTimeout(() => setShowText(false), flashMs)
    const nextTimer = setTimeout(nextWord, intervalMs)

    return () => {
      clearTimeout(flashTimer)
      clearTimeout(nextTimer)
    }
  }, [currentIndex, paused, words.length, flashMs, intervalMs, nextWord])

  // 親に通知
  useEffect(() => {
    if (showText && onFlash) {
      onFlash(text)
    }
  }, [currentIndex, showText, text, onFlash])

  const toggleAnswer = () => setShowAnswer((prev) => !prev)

  return (
    <div className="flex flex-col h-full">
      {/* 解答バー */}
      <div className="flex items-center border-2 border-red-500 rounded-md overflow-hidden mb-4">
        <button
          type="button"
          onClick={toggleAnswer}
          className="shrink-0 bg-red-600 text-white font-bold px-5 py-2 text-base"
        >
          解答
        </button>
        <div className="flex-1 px-4 py-2 bg-white min-h-[40px]">
          {showAnswer && (
            <span className="text-red-600 font-bold text-lg">{answer}</span>
          )}
        </div>
      </div>

      {/* 文字表示エリア */}
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg min-h-[400px] relative overflow-hidden">
        {showText ? (
          <TrainingText text={text} displayType={displayType} />
        ) : (
          <div className="text-zinc-200 text-6xl select-none">・</div>
        )}
      </div>
    </div>
  )
}

/** 表示タイプ別の文字レンダリング */
function TrainingText({
  text,
  displayType,
}: {
  text: string
  displayType: string
}) {
  const chars = text.split('')

  switch (displayType) {
    case 'barabara':
      return <BarabaraLayout chars={chars} />
    case 'tate_1line':
      return <Tate1LineLayout chars={chars} />
    case 'tate_2line':
      return <Tate2LineLayout text={text} />
    case 'yoko_1line':
      return <Yoko1LineLayout chars={chars} />
    case 'yoko_2line':
      return <Yoko2LineLayout text={text} />
    default:
      return <Tate1LineLayout chars={chars} />
  }
}

/** ばらばら配置: 文字を円形にランダム風に配置 */
function BarabaraLayout({ chars }: { chars: string[] }) {
  const positions = getScatteredPositions(chars.length)

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {chars.map((char, i) => (
        <span
          key={i}
          className="absolute text-black select-none"
          style={{
            left: `${positions[i].x}%`,
            top: `${positions[i].y}%`,
            transform: `translate(-50%, -50%) rotate(${positions[i].rotate}deg)`,
            fontSize: `${Math.max(56, 80 - chars.length * 4)}px`,
            fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
            fontWeight: 400,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

/** たて1行: 縦書き1列、中央 */
function Tate1LineLayout({ chars }: { chars: string[] }) {
  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ writingMode: 'vertical-rl' }}
    >
      <span
        className="text-black select-none leading-tight"
        style={{
          fontSize: `${Math.max(48, 72 - chars.length * 2)}px`,
          fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
          letterSpacing: '0.1em',
        }}
      >
        {chars.join('')}
      </span>
    </div>
  )
}

/** たて2行: 縦書き2列 */
function Tate2LineLayout({ text }: { text: string }) {
  // テキストを2行に分割（テキスト1/テキスト2がある場合は区切り文字で分割）
  const midpoint = Math.ceil(text.length / 2)
  const line1 = text.slice(0, midpoint)
  const line2 = text.slice(midpoint)

  const fontSize = `${Math.max(40, 64 - text.length * 2)}px`
  const fontStyle = {
    fontSize,
    fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
    letterSpacing: '0.1em',
  }

  return (
    <div className="flex gap-10" style={{ writingMode: 'vertical-rl' }}>
      <span className="text-black select-none leading-tight" style={fontStyle}>
        {line1}
      </span>
      <span className="text-black select-none leading-tight" style={fontStyle}>
        {line2}
      </span>
    </div>
  )
}

/** よこ1行: 横書き1行、中央 */
function Yoko1LineLayout({ chars }: { chars: string[] }) {
  return (
    <span
      className="text-black select-none"
      style={{
        fontSize: `${Math.max(48, 72 - chars.length * 3)}px`,
        fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
        letterSpacing: '0.15em',
      }}
    >
      {chars.join('')}
    </span>
  )
}

/** よこ2行: 横書き2行 */
function Yoko2LineLayout({ text }: { text: string }) {
  const midpoint = Math.ceil(text.length / 2)
  const line1 = text.slice(0, midpoint)
  const line2 = text.slice(midpoint)

  const fontSize = `${Math.max(36, 56 - text.length * 2)}px`
  const fontStyle = {
    fontSize,
    fontFamily: '"Yu Mincho", "游明朝", "Hiragino Mincho Pro", serif',
    letterSpacing: '0.12em',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-black select-none" style={fontStyle}>
        {line1}
      </span>
      <span className="text-black select-none" style={fontStyle}>
        {line2}
      </span>
    </div>
  )
}

/** 円形散布の座標を生成（既存システムのばらばら配置を再現） */
function getScatteredPositions(count: number) {
  const positions: { x: number; y: number; rotate: number }[] = []
  const cx = 50
  const cy = 50
  const radius = Math.min(30, 35 - count)

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    const r = radius + (Math.random() - 0.5) * 8
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    const rotate = (Math.random() - 0.5) * 30

    positions.push({
      x: Math.max(15, Math.min(85, x)),
      y: Math.max(15, Math.min(85, y)),
      rotate,
    })
  }

  return positions
}
