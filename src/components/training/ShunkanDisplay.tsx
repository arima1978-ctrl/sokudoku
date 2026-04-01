'use client'

import { useState, useRef } from 'react'
import {
  TRAINING_FONT,
  FONT_SIZES,
  DISPLAY_AREA,
  FLASH_TIMING,
  ANSWER_BAR,
  BARABARA_CONFIG,
} from '@/lib/trainingConfig'

interface ShunkanDisplayProps {
  words: { body: string; answer?: string }[]
  displayType: 'barabara' | 'tate_1line' | 'tate_2line' | 'yoko_1line' | 'yoko_2line'
  onFlash?: (word: string) => void
}

/**
 * 瞬間読みトレーニング（練習モード）
 *
 * ばらばら: 文字が表示されたまま → 「解答」で確認 → 「次の問題へ」
 * たて/よこ: 0.4秒フラッシュ → 消える → 「もう一度」or「解答」→「次へ」
 */
export default function ShunkanDisplay({
  words,
  displayType,
  onFlash,
}: ShunkanDisplayProps) {
  const [idx, setIdx] = useState(0)
  const [showText, setShowText] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const [count, setCount] = useState(1)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const word = words[idx]
  const text = word?.body ?? ''
  const answer = word?.answer ?? text

  // 全種目共通: 0.4秒フラッシュ→消える
  if (showText && !showAnswer && !hideTimer.current) {
    onFlash?.(text)
    hideTimer.current = setTimeout(() => {
      setShowText(false)
      hideTimer.current = null
    }, FLASH_TIMING.showMs)
  }

  const handleAnswer = () => {
    setShowAnswer(true)
    setShowText(true)
  }

  const handleNext = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
    const nextIdx = (idx + 1) % words.length
    setIdx(nextIdx)
    setCount(c => c + 1)
    setShowAnswer(false)
    setShowText(true)
    onFlash?.(words[nextIdx]?.body ?? '')

    hideTimer.current = setTimeout(() => {
      setShowText(false)
      hideTimer.current = null
    }, FLASH_TIMING.showMs)
  }

  const handleRetry = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
    setShowAnswer(false)
    setShowText(true)
    onFlash?.(text)
    hideTimer.current = setTimeout(() => {
      setShowText(false)
      hideTimer.current = null
    }, FLASH_TIMING.showMs)
  }

  // 全種目共通: 消えたら「もう一度」「解答」、解答後は「次の問題へ」
  const showRetryBtn = !showText && !showAnswer
  const showAnswerBtn = !showText && !showAnswer
  const showNextBtn = showAnswer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* 解答バー */}
      <div style={{
        display: 'flex',
        border: `2px solid ${ANSWER_BAR.border}`,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{
          background: ANSWER_BAR.labelBg, color: ANSWER_BAR.labelText,
          fontWeight: 'bold', fontSize: 15, padding: '10px 24px',
          fontFamily: TRAINING_FONT.family, display: 'flex', alignItems: 'center',
        }}>
          解答
        </div>
        <div style={{
          flex: 1, padding: '10px 20px', background: '#fff',
          display: 'flex', alignItems: 'center', minHeight: 44,
        }}>
          {showAnswer && (
            <span style={{
              color: ANSWER_BAR.answerText, fontWeight: 'bold',
              fontSize: 17, fontFamily: TRAINING_FONT.family,
            }}>
              {answer}
            </span>
          )}
        </div>
        <div style={{
          padding: '10px 16px', background: '#fff', display: 'flex',
          alignItems: 'center', borderLeft: '1px solid #eee',
          fontSize: 13, color: '#666', whiteSpace: 'nowrap',
        }}>
          {count}問目
        </div>
      </div>

      {/* 文字表示エリア */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', borderRadius: 8,
        minHeight: DISPLAY_AREA.minHeight, padding: DISPLAY_AREA.padding,
      }}>
        {showText ? (
          <TextDisplay text={text} type={displayType} />
        ) : (
          <span style={{ color: '#ccc', fontSize: 16 }}>
            表示された言葉を思い出してください
          </span>
        )}
      </div>

      {/* 操作ボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
        {showRetryBtn && (
          <button type="button" onClick={handleRetry} style={btnOutline()}>
            もう一度
          </button>
        )}
        {showAnswerBtn && (
          <button type="button" onClick={handleAnswer} style={btnRed()}>
            解答
          </button>
        )}
        {showNextBtn && (
          <button type="button" onClick={handleNext} style={btnYellow()}>
            次の問題へ →
          </button>
        )}
      </div>
    </div>
  )
}

// ===== ボタンスタイル =====
function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 32px', borderRadius: 24,
    border: '2px solid #999', background: '#fff',
    color: '#333', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
  }
}
function btnRed(): React.CSSProperties {
  return {
    padding: '10px 32px', borderRadius: 24,
    border: `2px solid ${ANSWER_BAR.border}`, background: ANSWER_BAR.labelBg,
    color: '#fff', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
  }
}
function btnYellow(): React.CSSProperties {
  return {
    padding: '10px 40px', borderRadius: 24,
    border: '2px solid #E6C200',
    background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
    color: '#333', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
  }
}

// ===== テキスト表示 =====
function TextDisplay({ text, type }: { text: string; type: string }) {
  const font = TRAINING_FONT.family
  const weight = TRAINING_FONT.weight
  switch (type) {
    case 'barabara': return <Barabara text={text} font={font} weight={weight} />
    case 'tate_1line': return <Tate1 text={text} font={font} weight={weight} />
    case 'tate_2line': return <Tate2 text={text} font={font} weight={weight} />
    case 'yoko_1line': return <Yoko1 text={text} font={font} weight={weight} />
    case 'yoko_2line': return <Yoko2 text={text} font={font} weight={weight} />
    default: return <Tate1 text={text} font={font} weight={weight} />
  }
}

function Barabara({ text, font, weight }: { text: string; font: string; weight: number }) {
  const chars = text.split('')
  const posRef = useRef(makeCirclePositions(chars.length))
  const sq = DISPLAY_AREA.minHeight - DISPLAY_AREA.padding * 2
  return (
    <div style={{ position: 'relative', width: sq, height: sq, margin: '0 auto' }}>
      {chars.map((c, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${posRef.current[i].x}%`, top: `${posRef.current[i].y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: FONT_SIZES.barabara, fontFamily: font, fontWeight: weight,
          color: '#000', lineHeight: 1, userSelect: 'none',
        }}>{c}</span>
      ))}
    </div>
  )
}

function Tate1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return <div style={{
    writingMode: 'vertical-rl', textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_1line, fontFamily: font, fontWeight: weight,
    color: '#000', lineHeight: 1.4, letterSpacing: '0.05em', userSelect: 'none',
  }}>{text}</div>
}

function Tate2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    writingMode: 'vertical-rl', textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_2line, fontFamily: font, fontWeight: weight,
    color: '#000', lineHeight: 1.4, letterSpacing: '0.05em', userSelect: 'none',
  }
  return <div style={{ display: 'flex', gap: 48 }}>
    <div style={s}>{text.slice(0, mid)}</div>
    <div style={s}>{text.slice(mid)}</div>
  </div>
}

function Yoko1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return <span style={{
    fontSize: FONT_SIZES.yoko_1line, fontFamily: font, fontWeight: weight,
    color: '#000', letterSpacing: '0.15em', userSelect: 'none',
  }}>{text}</span>
}

function Yoko2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    fontSize: FONT_SIZES.yoko_2line, fontFamily: font, fontWeight: weight,
    color: '#000', letterSpacing: '0.12em', userSelect: 'none',
  }
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <span style={s}>{text.slice(0, mid)}</span>
    <span style={s}>{text.slice(mid)}</span>
  </div>
}

function makeCirclePositions(count: number) {
  const cx = 50, cy = 50, r = BARABARA_CONFIG.radius
  return Array.from({ length: count }, (_, i) => ({
    x: cx + r * Math.cos((i / count) * 2 * Math.PI - Math.PI / 2),
    y: cy + r * Math.sin((i / count) * 2 * Math.PI - Math.PI / 2),
  }))
}
