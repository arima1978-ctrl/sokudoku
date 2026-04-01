'use client'

import { useState, useRef, useCallback } from 'react'
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

type Phase = 'flash' | 'hidden' | 'answer'

export default function ShunkanDisplay({
  words,
  displayType,
  onFlash,
  paused = false,
}: ShunkanDisplayProps) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('flash')
  const [questionNo, setQuestionNo] = useState(1)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const word = words[idx]
  const text = word?.body ?? ''
  const answer = word?.answer ?? text

  // フラッシュ開始
  const startFlash = useCallback(() => {
    setPhase('flash')
    onFlash?.(text)
    // 一定時間後に非表示
    hideTimer.current = setTimeout(() => {
      setPhase('hidden')
    }, FLASH_TIMING.showMs)
  }, [text, onFlash])

  // 初回フラッシュ
  useState(() => {
    onFlash?.(text)
    hideTimer.current = setTimeout(() => setPhase('hidden'), FLASH_TIMING.showMs)
  })

  // 解答表示
  const showAnswer = () => {
    if (phase === 'hidden') {
      setPhase('answer')
    }
  }

  // 次の問題
  const nextQuestion = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const nextIdx = (idx + 1) % words.length
    setIdx(nextIdx)
    setQuestionNo(q => q + 1)
    setPhase('flash')
    onFlash?.(words[nextIdx]?.body ?? '')
    hideTimer.current = setTimeout(() => setPhase('hidden'), FLASH_TIMING.showMs)
  }

  // もう一度表示
  const retry = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setPhase('flash')
    onFlash?.(text)
    hideTimer.current = setTimeout(() => setPhase('hidden'), FLASH_TIMING.showMs)
  }

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
        <div style={{
          background: ANSWER_BAR.labelBg,
          color: ANSWER_BAR.labelText,
          fontWeight: 'bold',
          fontSize: 15,
          padding: '10px 24px',
          flexShrink: 0,
          fontFamily: TRAINING_FONT.family,
          display: 'flex',
          alignItems: 'center',
        }}>
          解答
        </div>
        <div style={{
          flex: 1, padding: '10px 20px', background: '#fff',
          display: 'flex', alignItems: 'center', minHeight: 44,
        }}>
          {phase === 'answer' && (
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
        {/* 問題数カウンター */}
        <div style={{
          padding: '10px 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          borderLeft: '1px solid #eee',
          fontSize: 13,
          color: '#666',
          whiteSpace: 'nowrap',
        }}>
          {questionNo}問目
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
        {phase === 'flash' ? (
          <TextDisplay text={text} type={displayType} />
        ) : phase === 'answer' ? (
          <TextDisplay text={text} type={displayType} />
        ) : (
          <span style={{ color: '#ddd', fontSize: 48, userSelect: 'none' }}>
            表示された言葉を思い出してください
          </span>
        )}
      </div>

      {/* ===== 操作ボタン ===== */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
      }}>
        {phase === 'hidden' && (
          <>
            <button type="button" onClick={retry} style={{
              padding: '10px 28px', borderRadius: 24,
              border: '2px solid #999', background: '#fff',
              color: '#333', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
            }}>
              もう一度
            </button>
            <button type="button" onClick={showAnswer} style={{
              padding: '10px 28px', borderRadius: 24,
              border: `2px solid ${ANSWER_BAR.border}`, background: ANSWER_BAR.labelBg,
              color: '#fff', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
            }}>
              解答を見る
            </button>
          </>
        )}
        {phase === 'answer' && (
          <button type="button" onClick={nextQuestion} style={{
            padding: '10px 36px', borderRadius: 24,
            border: '2px solid #E6C200',
            background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
            color: '#333', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
          }}>
            次の問題へ →
          </button>
        )}
        {phase === 'flash' && (
          <span style={{ color: '#999', fontSize: 14 }}>表示中...</span>
        )}
      </div>
    </div>
  )
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
  const size = FONT_SIZES.barabara
  const posRef = useRef(makeCirclePositions(chars.length))
  const squareSize = DISPLAY_AREA.minHeight - DISPLAY_AREA.padding * 2

  return (
    <div style={{ position: 'relative', width: squareSize, height: squareSize, margin: '0 auto' }}>
      {chars.map((c, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${posRef.current[i].x}%`,
          top: `${posRef.current[i].y}%`,
          transform: `translate(-50%, -50%) rotate(${posRef.current[i].r}deg)`,
          fontSize: size, fontFamily: font, fontWeight: weight,
          color: '#000', lineHeight: 1, userSelect: 'none',
        }}>
          {c}
        </span>
      ))}
    </div>
  )
}

function Tate1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return (
    <div style={{
      writingMode: 'vertical-rl', textOrientation: 'upright',
      fontSize: FONT_SIZES.tate_1line, fontFamily: font, fontWeight: weight,
      color: '#000', lineHeight: 1.4, letterSpacing: '0.05em', userSelect: 'none',
    }}>
      {text}
    </div>
  )
}

function Tate2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    writingMode: 'vertical-rl', textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_2line, fontFamily: font, fontWeight: weight,
    color: '#000', lineHeight: 1.4, letterSpacing: '0.05em', userSelect: 'none',
  }
  return (
    <div style={{ display: 'flex', gap: 48 }}>
      <div style={s}>{text.slice(0, mid)}</div>
      <div style={s}>{text.slice(mid)}</div>
    </div>
  )
}

function Yoko1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return (
    <span style={{
      fontSize: FONT_SIZES.yoko_1line, fontFamily: font, fontWeight: weight,
      color: '#000', letterSpacing: '0.15em', userSelect: 'none',
    }}>
      {text}
    </span>
  )
}

function Yoko2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    fontSize: FONT_SIZES.yoko_2line, fontFamily: font, fontWeight: weight,
    color: '#000', letterSpacing: '0.12em', userSelect: 'none',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <span style={s}>{text.slice(0, mid)}</span>
      <span style={s}>{text.slice(mid)}</span>
    </div>
  )
}

function makeCirclePositions(count: number) {
  const cx = 50, cy = 50
  const r = BARABARA_CONFIG.radius
  const range = BARABARA_CONFIG.rotationRange
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      r: range === 0 ? 0 : Math.round((Math.random() - 0.5) * range * 2),
    }
  })
}
