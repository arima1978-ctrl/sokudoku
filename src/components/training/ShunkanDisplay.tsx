'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  paused?: boolean
}

export default function ShunkanDisplay({
  words,
  displayType,
  onFlash,
  paused = false,
}: ShunkanDisplayProps) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const nextTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const word = words[idx]
  const text = word?.body ?? ''
  const answer = word?.answer ?? text

  const advance = useCallback(() => {
    if (paused || words.length === 0) return
    setShowAnswer(false)
    setVisible(true)
    setIdx(i => (i + 1) % words.length)
  }, [paused, words.length])

  useEffect(() => {
    if (paused || words.length === 0) return
    setVisible(true)
    onFlash?.(text)

    hideTimer.current = setTimeout(() => setVisible(false), FLASH_TIMING.showMs)
    nextTimer.current = setTimeout(advance, FLASH_TIMING.intervalMs)

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (nextTimer.current) clearTimeout(nextTimer.current)
    }
  }, [idx, paused, words.length, text, onFlash, advance])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* ===== 解答バー ===== */}
      <div style={{
        display: 'flex',
        border: `2px solid ${ANSWER_BAR.border}`,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <button type="button" onClick={() => setShowAnswer(v => !v)} style={{
          background: ANSWER_BAR.labelBg,
          color: ANSWER_BAR.labelText,
          fontWeight: 'bold',
          fontSize: 15,
          padding: '10px 24px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          fontFamily: TRAINING_FONT.family,
        }}>
          解答
        </button>
        <div style={{
          flex: 1, padding: '10px 20px', background: '#fff',
          display: 'flex', alignItems: 'center', minHeight: 44,
        }}>
          {showAnswer && (
            <span style={{
              color: ANSWER_BAR.answerText,
              fontWeight: 'bold',
              fontSize: 17,
              fontFamily: TRAINING_FONT.family,
            }}>
              {answer}
            </span>
          )}
        </div>
      </div>

      {/* ===== 文字表示エリア ===== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: 8,
        minHeight: DISPLAY_AREA.minHeight,
        padding: DISPLAY_AREA.padding,
        position: 'relative',
      }}>
        {visible ? (
          <TextDisplay text={text} type={displayType} />
        ) : (
          <span style={{ color: '#ddd', fontSize: 60, userSelect: 'none' }}>・</span>
        )}
      </div>
    </div>
  )
}

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

/** ========== ばらばら ========== */
function Barabara({ text, font, weight }: { text: string; font: string; weight: number }) {
  const chars = text.split('')
  const size = FONT_SIZES.barabara
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(makeCirclePositions(chars.length))
  useEffect(() => { posRef.current = makeCirclePositions(chars.length) }, [chars.length])
  const pos = posRef.current

  // 正方形コンテナにして、円が歪まないようにする
  const squareSize = DISPLAY_AREA.minHeight - DISPLAY_AREA.padding * 2

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: squareSize,
        height: squareSize,
        margin: '0 auto',
      }}
    >
      {chars.map((c, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${pos[i].x}%`,
          top: `${pos[i].y}%`,
          transform: `translate(-50%, -50%) rotate(${pos[i].r}deg)`,
          fontSize: size,
          fontFamily: font,
          fontWeight: weight,
          color: '#000',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {c}
        </span>
      ))}
    </div>
  )
}

/** ========== たて1行 ========== */
function Tate1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return (
    <div style={{
      writingMode: 'vertical-rl',
      textOrientation: 'upright',
      fontSize: FONT_SIZES.tate_1line,
      fontFamily: font,
      fontWeight: weight,
      color: '#000',
      lineHeight: 1.4,
      letterSpacing: '0.05em',
      userSelect: 'none',
    }}>
      {text}
    </div>
  )
}

/** ========== たて2行 ========== */
function Tate2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const style: React.CSSProperties = {
    writingMode: 'vertical-rl',
    textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_2line,
    fontFamily: font,
    fontWeight: weight,
    color: '#000',
    lineHeight: 1.4,
    letterSpacing: '0.05em',
    userSelect: 'none',
  }
  return (
    <div style={{ display: 'flex', gap: 48 }}>
      <div style={style}>{text.slice(0, mid)}</div>
      <div style={style}>{text.slice(mid)}</div>
    </div>
  )
}

/** ========== よこ1行 ========== */
function Yoko1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return (
    <span style={{
      fontSize: FONT_SIZES.yoko_1line,
      fontFamily: font,
      fontWeight: weight,
      color: '#000',
      letterSpacing: '0.15em',
      userSelect: 'none',
    }}>
      {text}
    </span>
  )
}

/** ========== よこ2行 ========== */
function Yoko2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    fontSize: FONT_SIZES.yoko_2line,
    fontFamily: font,
    fontWeight: weight,
    color: '#000',
    letterSpacing: '0.12em',
    userSelect: 'none',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <span style={s}>{text.slice(0, mid)}</span>
      <span style={s}>{text.slice(mid)}</span>
    </div>
  )
}

/** 円形散布座標 */
function makeCirclePositions(count: number) {
  const cx = 50, cy = 50
  const r = BARABARA_CONFIG.radius
  const range = BARABARA_CONFIG.rotationRange
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      r: Math.round((Math.random() - 0.5) * range * 2),
    }
  })
}
