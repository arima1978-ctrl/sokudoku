'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  TRAINING_FONT,
  QUESTION_FONT,
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
  onHidden?: () => void
  hideButtons?: boolean
}

type Phase = 'countdown' | 'flash' | 'hidden' | 'answer'

/**
 * 瞬間読みトレーニング（元システム準拠）
 *
 * カウントダウンON: 3→2→1 (各1秒) → 0.3秒フラッシュ → 消える
 * カウントダウンOFF: 即0.3秒フラッシュ → 消える
 * フラッシュ音: s_flash.mp3
 * ボタン: 「もう一度」(黒) / 「解答を見る」(赤) → 正解表示 →「次の問題へ」(黄)
 */
export default function ShunkanDisplay({
  words,
  displayType,
  onFlash,
  onHidden,
  hideButtons = false,
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

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); clearInterval(timerRef.current) }
  }, [])

  const doFlash = useCallback((flashText: string) => {
    setPhase('flash')
    onFlash?.(flashText)
    // フラッシュ音
    try { new Audio('/sounds/s_flash.mp3').play().catch(() => {}) } catch { /* no audio */ }
    timerRef.current = setTimeout(() => {
      setPhase('hidden')
      onHidden?.()
    }, FLASH_TIMING.showMs)
  }, [onFlash, onHidden])

  const runCountdown = useCallback((flashText: string) => {
    setPhase('countdown')
    setCountNum(3)
    let n = 3
    timerRef.current = setInterval(() => {
      n--
      if (n > 0) {
        setCountNum(n)
      } else {
        clearTimer()
        doFlash(flashText)
      }
    }, FLASH_TIMING.countdownStepMs)
  }, [clearTimer, doFlash])

  // 初回起動
  useEffect(() => {
    if (initialized.current || words.length === 0) return
    initialized.current = true
    if (countdownOn) {
      runCountdown(text)
    } else {
      doFlash(text)
    }
    return clearTimer
  }, [words]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer() {
    setPhase('answer')
  }

  function handleNext() {
    clearTimer()
    const nextIdx = (idx + 1) % words.length
    const nextText = words[nextIdx]?.body ?? ''
    setIdx(nextIdx)
    setQuestionNo(q => q + 1)
    if (countdownOn) runCountdown(nextText)
    else doFlash(nextText)
  }

  function handleRetry() {
    clearTimer()
    if (countdownOn) runCountdown(text)
    else doFlash(text)
  }

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
              fontSize: 17, fontFamily: QUESTION_FONT.family,
            }}>
              {answer}
            </span>
          )}
        </div>
      </div>

      {/* メイン: 文字表示エリア + ボタン */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', borderRadius: 8,
          width: '100%', aspectRatio: '1 / 1', maxHeight: 'calc(100vh - 220px)',
          padding: DISPLAY_AREA.padding,
          opacity: (phase === 'hidden') ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}>
          {showCountdown && (
            <span style={{ fontSize: 140, fontWeight: 'bold', color: '#0084E8', userSelect: 'none' }}>
              {countNum}
            </span>
          )}
          {showText && <TextDisplay text={text} type={displayType} />}
          {phase === 'hidden' && (
            <span style={{ color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
              答えが頭にひらめいたら「解答を見る」<br />
              わからなかった場合は「もう一度」で何度でも見れます。
            </span>
          )}
        </div>

        {/* ボタン（右側に重ねて表示） */}
        {showButtons && !hideButtons && (
          <div style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: 12, minWidth: 130,
          }}>
            {phase === 'hidden' && (
              <>
                <SideButton onClick={handleRetry} bg="rgba(255,255,255,0.95)" color="#333" border="#999" icon="icon_reset_white.svg">
                  もう一度
                </SideButton>
                <SideButton onClick={handleAnswer} bg={ANSWER_BAR.labelBg} color="#fff" border={ANSWER_BAR.border} icon="icon_complete_white.svg">
                  解答を見る
                </SideButton>
              </>
            )}
            {phase === 'answer' && (
              <SideButton onClick={handleNext} bg="linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)" color="#333" border="#E6C200" icon="icon_btn_next_yellow.svg">
                次の問題へ
              </SideButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== ボタンコンポーネント =====
function SideButton({ onClick, bg, color, border, icon, children }: {
  onClick: () => void; bg: string; color: string; border: string; icon?: string; children: React.ReactNode
}) {
  const isGradient = bg.includes('gradient')
  return (
    <button type="button" onClick={onClick} style={{
      padding: '12px 16px', borderRadius: 28, width: '100%',
      border: `2px solid ${border}`,
      background: isGradient ? bg : undefined,
      backgroundColor: isGradient ? undefined : bg,
      color, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      {children}
    </button>
  )
}

// ===== テキスト表示 =====
function TextDisplay({ text, type }: { text: string; type: string }) {
  const f = QUESTION_FONT.family
  const w = QUESTION_FONT.weight
  switch (type) {
    case 'barabara': return <BarabaraCircle text={text} />
    case 'tate_1line': return <Tate1 text={text} font={f} weight={w} />
    case 'tate_2line': return <Tate2 text={text} font={f} weight={w} />
    case 'yoko_1line': return <Yoko1 text={text} font={f} weight={w} />
    case 'yoko_2line': return <Yoko2 text={text} font={f} weight={w} />
    default: return <Tate1 text={text} font={f} weight={w} />
  }
}

/**
 * ばらばら表示（元システム circleText() 準拠）
 * - 文字を円形に等間隔配置
 * - 各文字に回転角度を付与（中心向きに回転 + 反転して正立に近い見え方）
 * - 配置順をシャッフル
 */
function BarabaraCircle({ text }: { text: string }) {
  const chars = text.split('')
  const count = chars.length
  const angleStep = 360 / count

  // 配置位置の角度をシャッフル
  const indices = Array.from({ length: count }, (_, i) => i)
  const shuffled = [...indices].sort(() => Math.random() - 0.5)

  return (
    <div style={{
      position: 'relative', width: '100%', maxWidth: 500,
      aspectRatio: '1/1', margin: '0 auto',
    }}>
      {chars.map((c, i) => {
        const slotIndex = shuffled[i]
        const angleDeg = slotIndex * angleStep - angleStep * Math.floor(count / 2)
        const angleRad = (angleDeg * Math.PI) / 180
        // 円形配置: 中心から radiusPx 離す
        const r = BARABARA_CONFIG.radiusPx
        return (
          <span key={`${text}-${i}`} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transformOrigin: 'left top',
            transform: `rotate(${angleDeg}deg) translate(0%, 40%) translate(0, -${r}px) translate(-50%, -50%)`,
            display: 'inline-block',
            fontFamily: QUESTION_FONT.family,
            fontSize: `${BARABARA_CONFIG.fontSizeRem}rem`,
            lineHeight: 1,
            color: '#000',
            userSelect: 'none',
          }}>
            <span style={{
              display: 'inline-block',
              transformOrigin: 'center',
              transform: `rotate(${-angleDeg}deg)`,
            }}>
              {c}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function Tate1({ text, font, weight }: { text: string; font: string; weight: number }) {
  return <div style={{
    writingMode: 'vertical-rl', textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_1line, fontFamily: font, fontWeight: weight,
    color: '#000', lineHeight: 1.5, userSelect: 'none',
  }}>{text}</div>
}

function Tate2({ text, font, weight }: { text: string; font: string; weight: number }) {
  const mid = Math.ceil(text.length / 2)
  const s: React.CSSProperties = {
    writingMode: 'vertical-rl', textOrientation: 'upright',
    fontSize: FONT_SIZES.tate_2line, fontFamily: font, fontWeight: weight,
    color: '#000', lineHeight: '150%', textAlign: 'left', userSelect: 'none',
  }
  return <div style={{ display: 'flex', gap: 0 }}>
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
    color: '#000', letterSpacing: '0.12em', lineHeight: '150%', textAlign: 'left', userSelect: 'none',
  }
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <span style={s}>{text.slice(0, mid)}</span>
    <span style={s}>{text.slice(mid)}</span>
  </div>
}
