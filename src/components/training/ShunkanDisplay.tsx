'use client'

import { useState, useRef, useEffect } from 'react'
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

type Phase = 'countdown' | 'flash' | 'hidden' | 'answer'

/**
 * 瞬間読みトレーニング（練習モード）
 *
 * カウントダウンON: 3→2→1 → 0.4秒フラッシュ → 消える → 解答/もう一度 → 次へ
 * カウントダウンOFF: 即フラッシュ → 消える → 解答/もう一度 → 次へ
 * ボタンは画面右側に配置
 */
export default function ShunkanDisplay({
  words,
  displayType,
  onFlash,
}: ShunkanDisplayProps) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('countdown')
  const [countNum, setCountNum] = useState(3)
  const [questionNo, setQuestionNo] = useState(1)
  const [countdownOn, setCountdownOn] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null)
  const initialized = useRef(false)

  const word = words[idx]
  const text = word?.body ?? ''
  const answer = word?.answer ?? text

  // 初回起動
  useEffect(() => {
    if (initialized.current || words.length === 0) return
    initialized.current = true
    if (countdownOn) {
      runCountdown(text)
    } else {
      doFlash(text)
    }
  }, [words])  // eslint-disable-line react-hooks/exhaustive-deps

  function runCountdown(flashText: string) {
    setPhase('countdown')
    setCountNum(3)
    let n = 3
    timerRef.current = setInterval(() => {
      n--
      if (n > 0) {
        setCountNum(n)
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        doFlash(flashText)
      }
    }, 500)
  }

  function doFlash(flashText: string) {
    setPhase('flash')
    onFlash?.(flashText)
    timerRef.current = setTimeout(() => {
      setPhase('hidden')
    }, FLASH_TIMING.showMs)
  }

  function handleAnswer() {
    setPhase('answer')
  }

  function handleNext() {
    if (timerRef.current) { clearTimeout(timerRef.current); clearInterval(timerRef.current) }
    const nextIdx = (idx + 1) % words.length
    const nextText = words[nextIdx]?.body ?? ''
    setIdx(nextIdx)
    setQuestionNo(q => q + 1)
    if (countdownOn) {
      runCountdown(nextText)
    } else {
      doFlash(nextText)
    }
  }

  function handleRetry() {
    if (timerRef.current) { clearTimeout(timerRef.current); clearInterval(timerRef.current) }
    if (countdownOn) {
      runCountdown(text)
    } else {
      doFlash(text)
    }
  }

  // 表示内容の判定
  const showCountdown = phase === 'countdown'
  const showText = phase === 'flash' || phase === 'answer'
  const showAnswerText = phase === 'answer'
  const showButtons = phase === 'hidden' || phase === 'answer'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* カウントダウン ON/OFF + 問題数 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>カウントダウン</span>
          <button
            type="button"
            onClick={() => setCountdownOn(v => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: countdownOn ? '#0084E8' : '#ccc',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 2,
              left: countdownOn ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
        <span style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>
          {questionNo}{'問目'}
        </span>
      </div>

      {/* 解答バー */}
      <div style={{
        display: 'flex',
        border: `2px solid ${ANSWER_BAR.border}`,
        borderRadius: 4, overflow: 'hidden', marginBottom: 16,
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
          {showAnswerText && (
            <span style={{
              color: ANSWER_BAR.answerText, fontWeight: 'bold',
              fontSize: 17, fontFamily: TRAINING_FONT.family,
            }}>
              {answer}
            </span>
          )}
        </div>
      </div>

      {/* メイン: 文字表示エリア + 右側ボタン */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 文字表示（正方形コンテナ） */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', borderRadius: 8,
          aspectRatio: '1 / 1', maxHeight: 550, padding: DISPLAY_AREA.padding,
        }}>
          {showCountdown && (
            <span style={{ fontSize: 120, fontWeight: 'bold', color: '#0084E8', userSelect: 'none' }}>
              {countNum}
            </span>
          )}
          {showText && <TextDisplay text={text} type={displayType} />}
          {phase === 'hidden' && (
            <span style={{ color: '#ccc', fontSize: 16 }}>
              表示された言葉を思い出してください
            </span>
          )}
        </div>

        {/* 右側ボタン */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 12, minWidth: 130,
        }}>
          {showButtons && phase === 'hidden' && (
            <>
              <button type="button" onClick={handleRetry} style={btnSide('#fff', '#333', '#999')}>
                もう一度
              </button>
              <button type="button" onClick={handleAnswer} style={btnSide(ANSWER_BAR.labelBg, '#fff', ANSWER_BAR.border)}>
                解答
              </button>
            </>
          )}
          {showButtons && phase === 'answer' && (
            <button type="button" onClick={handleNext} style={btnSideYellow()}>
              次の問題へ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== ボタンスタイル =====
function btnSide(bg: string, color: string, border: string): React.CSSProperties {
  return {
    padding: '12px 16px', borderRadius: 8, width: '100%',
    border: `2px solid ${border}`, background: bg,
    color, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center',
  }
}
function btnSideYellow(): React.CSSProperties {
  return {
    padding: '12px 16px', borderRadius: 8, width: '100%',
    border: '2px solid #E6C200',
    background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
    color: '#333', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center',
  }
}

// ===== テキスト表示 =====
function TextDisplay({ text, type }: { text: string; type: string }) {
  const f = TRAINING_FONT.family, w = TRAINING_FONT.weight
  switch (type) {
    case 'barabara': return <Barabara text={text} font={f} weight={w} />
    case 'tate_1line': return <Tate1 text={text} font={f} weight={w} />
    case 'tate_2line': return <Tate2 text={text} font={f} weight={w} />
    case 'yoko_1line': return <Yoko1 text={text} font={f} weight={w} />
    case 'yoko_2line': return <Yoko2 text={text} font={f} weight={w} />
    default: return <Tate1 text={text} font={f} weight={w} />
  }
}

function Barabara({ text, font, weight }: { text: string; font: string; weight: number }) {
  const chars = text.split('')
  const positions = makeCirclePositions(chars.length)
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 500, aspectRatio: '1/1', margin: '0 auto' }}>
      {chars.map((c, i) => (
        <span key={`${text}-${i}`} style={{
          position: 'absolute',
          left: `${positions[i].x}%`, top: `${positions[i].y}%`,
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
