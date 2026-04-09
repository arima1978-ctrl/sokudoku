'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { BLOCK_CONFIG } from '@/lib/trainingConfig'

/**
 * たてブロックよみ（高速読みトレーニング）
 *
 * 元サイト https://new.100mil-sokudoku.com/Training/fast の画面構成を忠実に再現:
 *   <section.bg_training.start>
 *     <div.el_time>      ← 上部タイマーバー + 進行ゲージ
 *     <div.content_box.vertical>
 *       <p#content_body.el_txt_body> ← 縦書き本文(<p>各行)
 *       <div.maker_box>              ← 11×cond2 グリッドのマーカーオーバーレイ
 *       <small#page_number>          ← "1 / 17"
 *     </div>
 *   </section>
 *   <div.side.training>
 *     <div.el_speed>      ← 読書スピード表示
 *     <div.el_count__side>← カウントの速さ + 自動/手動
 *   </div>
 *
 * 追加仕様（会議決定）:
 *   - 8カウントごとに CPM を +1（青天井）
 *   - 初期CPM: 24h以内=前回×0.8 / 24h超=前回×0.6 / 初回=60
 *   - 各tickで「ピッ」音（WebAudio合成）
 */

const MAX_ROW = 11
const BEATS_PER_STEP = 8
const CPM_STEP = 1
const SET_DURATION_SEC = 120 // 1セット = 2分

/** トレーニングモード */
export type ReadingMode = '3point' | '2point' | '1line' | '2line'

/** モード別 1行あたりカウント数（C_line） */
const C_LINE: Record<ReadingMode, number> = {
  '3point': 3,
  '2point': 2,
  '1line': 1,
  '2line': 0.5,
}

/** モード別 ブロック数（1行を何分割するか） */
const BLOCKS_PER_ROW: Record<ReadingMode, number> = {
  '3point': 3,
  '2point': 2,
  '1line': 1,
  '2line': 1,
}

/** モード別 1tickで進む行数 */
const LINES_PER_STEP: Record<ReadingMode, number> = {
  '3point': 1,
  '2point': 1,
  '1line': 1,
  '2line': 2,
}

/** モード表示名 */
const MODE_LABEL: Record<ReadingMode, string> = {
  '3point': '3点読み',
  '2point': '2点読み',
  '1line': '1行読み',
  '2line': '2行読み',
}

/** WPM (字/分) からモードを自動選定 */
function selectModeByWpm(wpm: number): ReadingMode {
  if (wpm < 1500) return '3point'
  if (wpm < 3000) return '2point'
  if (wpm < 5000) return '1line'
  return '2line'
}

/** WPM 計算: cpm / C_line × 1行文字数 */
function calcWpm(cpm: number, mode: ReadingMode, charsPerLine: number): number {
  return Math.round((cpm / C_LINE[mode]) * charsPerLine)
}

export interface VerticalBlockReaderProps {
  title: string
  body: string
  durationSec: number
  initialCpm: number
  /** 初期モード（保存済みの current_mode、初回は '3point'） */
  initialMode?: ReadingMode
  onComplete: (result: {
    maxCpm: number
    finalCpm: number
    finalMode: ReadingMode
    maxWpm: number
  }) => void
}

/** 元 training.js の splitByChunk 移植 */
function splitByChunk(str: string, size: number): string[] {
  const cleaned = str.replace(/ +/g, '')
  const chunks: string[] = []
  const numChunks = Math.ceil(cleaned.length / size)
  let x = 0
  for (let i = 0; i < numChunks; i++) {
    const tail = cleaned.substr(x, size + 1).slice(-1)
    if (tail === '。' || tail === '、' || tail === '」') {
      chunks.push(cleaned.substr(x, size + 1))
      x += size + 1
    } else {
      chunks.push(cleaned.substr(x, size))
      x += size
    }
  }
  return chunks
}

function sliceByNumber<T>(array: T[], n: number): T[][] {
  const len = Math.ceil(array.length / n)
  return Array.from({ length: len }, (_, i) => array.slice(i * n, (i + 1) * n))
}

/** 元 splitSentence: 段落→24文字分割→11行ごとページ化 */
function splitSentence(body: string, size: number, maxRow: number): string[][] {
  const paragraphs = body.split(/\n/)
  const collected: string[] = []
  for (const p of paragraphs) {
    if (!p) continue
    const chunks = splitByChunk(p, size)
    for (const item of chunks) collected.push(item)
  }
  return sliceByNumber(collected, maxRow)
}

export default function VerticalBlockReader({
  title,
  body,
  durationSec,
  initialCpm,
  initialMode = '3point',
  onComplete,
}: VerticalBlockReaderProps) {
  const pages = useMemo(
    () => splitSentence(body, BLOCK_CONFIG.verticalSplitWord, MAX_ROW),
    [body]
  )

  const [pageIndex, setPageIndex] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)
  const [blockIndex, setBlockIndex] = useState(0)
  const [cpm, setCpm] = useState(initialCpm)
  const [maxCpm, setMaxCpm] = useState(initialCpm)
  const [maxWpm, setMaxWpm] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [mode, setMode] = useState<ReadingMode>(initialMode)
  const [setIndex, setSetIndex] = useState(0) // 現在の2分セット番号
  const [pendingMode, setPendingMode] = useState<ReadingMode | null>(null) // 次セットで切替予定

  const cpmRef = useRef(initialCpm)
  const beatRef = useRef(0)
  const lineRef = useRef(0)
  const blockRef = useRef(0)
  const pageRef = useRef(0)
  const modeRef = useRef<ReadingMode>(initialMode)
  const setIndexRef = useRef(0)
  const setStartElapsedRef = useRef(0) // 現在セットの開始経過秒
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const completedRef = useRef(false)

  // WebAudio: ピッ音合成
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playTick = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 1000
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.06)
    } catch {
      /* ignore */
    }
  }, [])

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    const finalMax = cpmRef.current > maxCpm ? cpmRef.current : maxCpm
    const finalWpm = calcWpm(cpmRef.current, modeRef.current, BLOCK_CONFIG.verticalSplitWord)
    onComplete({
      maxCpm: finalMax,
      finalCpm: cpmRef.current,
      finalMode: modeRef.current,
      maxWpm: Math.max(maxWpm, finalWpm),
    })
  }, [maxCpm, maxWpm, onComplete])

  const tick = useCallback(() => {
    playTick()

    const curMode = modeRef.current
    const bpr = BLOCKS_PER_ROW[curMode]
    const lps = LINES_PER_STEP[curMode]

    // ブロック進行
    let nextBlock = blockRef.current + 1
    let nextLine = lineRef.current
    let nextPage = pageRef.current
    if (nextBlock >= bpr) {
      nextBlock = 0
      nextLine += lps
      const curPageLen = pages[nextPage]?.length ?? 0
      if (nextLine >= MAX_ROW || nextLine >= curPageLen) {
        nextLine = 0
        nextPage = nextPage + 1 < pages.length ? nextPage + 1 : 0
      }
    }
    blockRef.current = nextBlock
    lineRef.current = nextLine
    pageRef.current = nextPage
    setBlockIndex(nextBlock)
    setLineIndex(nextLine)
    setPageIndex(nextPage)

    // 8カウントで +1 CPM
    beatRef.current += 1
    if (beatRef.current >= BEATS_PER_STEP) {
      beatRef.current = 0
      cpmRef.current = cpmRef.current + CPM_STEP
      setCpm(cpmRef.current)
      setMaxCpm(prev => (cpmRef.current > prev ? cpmRef.current : prev))
    }

    // 現在WPMを計算して maxWpm 更新 & 閾値越えチェック（次セットで切替予定）
    const wpmNow = calcWpm(cpmRef.current, curMode, BLOCK_CONFIG.verticalSplitWord)
    setMaxWpm(prev => (wpmNow > prev ? wpmNow : prev))
    const recommended = selectModeByWpm(wpmNow)
    if (recommended !== curMode) {
      setPendingMode(recommended)
    }

    if (!completedRef.current) {
      const intervalMs = Math.max(50, Math.round(60000 / cpmRef.current))
      tickTimerRef.current = setTimeout(tick, intervalMs)
    }
  }, [pages, playTick])

  useEffect(() => {
    startTimeRef.current = Date.now()
    cpmRef.current = initialCpm
    setCpm(initialCpm)
    setMaxCpm(initialCpm)

    try {
      const Ctor =
        typeof window !== 'undefined'
          ? (window.AudioContext ??
             (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          : undefined
      if (Ctor) {
        const ctx = new Ctor()
        audioCtxRef.current = ctx
        if (ctx.state === 'suspended') void ctx.resume()
      }
    } catch {
      /* ignore */
    }

    elapsedTimerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedSec(e)
      if (e >= durationSec) {
        finish()
        return
      }
      // セット境界: 2分ごとに cpm・beat をリセット。閾値超過の pending モードがあれば切替
      const expectedSetIndex = Math.floor(e / SET_DURATION_SEC)
      if (expectedSetIndex !== setIndexRef.current) {
        setIndexRef.current = expectedSetIndex
        setSetIndex(expectedSetIndex)
        // cpm を初期値にリセット
        cpmRef.current = initialCpm
        setCpm(initialCpm)
        beatRef.current = 0
        setStartElapsedRef.current = e
        // マーカーも先頭に戻す
        blockRef.current = 0
        lineRef.current = 0
        pageRef.current = 0
        setBlockIndex(0)
        setLineIndex(0)
        setPageIndex(0)
        // pending モードがあれば切替
        setPendingMode(prev => {
          if (prev) {
            modeRef.current = prev
            setMode(prev)
            return null
          }
          return prev
        })
      }
    }, 250)

    const firstInterval = Math.max(50, Math.round(60000 / initialCpm))
    tickTimerRef.current = setTimeout(tick, firstInterval)

    return () => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      const ctx = audioCtxRef.current
      if (ctx) void ctx.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remainSec = Math.max(0, durationSec - elapsedSec)
  const progressPct = Math.min(100, (elapsedSec / durationSec) * 100)
  const currentPage = pages[pageIndex] ?? []
  const mmss = `${String(Math.floor(remainSec / 60)).padStart(2, '0')}:${String(remainSec % 60).padStart(2, '0')}`

  // 読書スピード推定値: 文字/分 = cpm / C_line × 1行文字数
  const wpmEstimate = calcWpm(cpm, mode, BLOCK_CONFIG.verticalSplitWord)
  const blocksPerRow = BLOCKS_PER_ROW[mode]
  const linesPerStep = LINES_PER_STEP[mode]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* メインエリア: 左=本文 右=サイドバー */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: 24,
          padding: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* ===== 左: 本文エリア ===== */}
        <section
          style={{
            flex: 1,
            background: '#fff',
            borderRadius: 8,
            padding: '16px 24px',
            position: 'relative',
            minHeight: 600,
          }}
        >
          {/* 上部: タイマーバー（元 .el_time） */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 8,
                background: '#e5e7eb',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#1478C3',
                  width: `${progressPct}%`,
                  transition: 'width 0.25s linear',
                }}
              />
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              あと
              <span
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#1478C3',
                  marginLeft: 4,
                }}
              >
                {mmss}
              </span>
            </div>
          </div>

          {/* タイトル */}
          <div
            style={{
              fontSize: 13,
              color: '#888',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {title}
          </div>

          {/* content_box.vertical: 本文 + マーカーオーバーレイ */}
          <div
            className="content_box vertical"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              writingMode: 'vertical-rl',
              width: 812,
              height: 520,
              maxWidth: '100%',
              margin: '0 auto',
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 20,
              color: '#2A2A2A',
            }}
          >
            {/* #content_body.el_txt_body: 各行を<p>として配置 */}
            <div
              id="content_body"
              className="el_txt_body"
              style={{
                display: 'flex',
                width: 726,
                height: 470,
                padding: '15px 0',
                fontFamily: '"Yu Mincho", "游明朝", serif',
                fontSize: 19,
                lineHeight: '64.8px',
                fontWeight: 600,
                color: '#2A2A2A',
                margin: 0,
              }}
            >
              {currentPage.map((line, i) => (
                <p
                  key={`${pageIndex}-${i}`}
                  style={{
                    width: '6.6rem',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* .maker_box: 11行×cond2列 グリッドオーバーレイ */}
            <div
              className="maker_box"
              style={{
                position: 'absolute',
                width: 726,
                height: 470,
                display: 'grid',
                gridTemplateRows: 'repeat(11, 66px)',
                gridTemplateColumns: `repeat(${blocksPerRow}, 1fr)`,
                gridAutoFlow: 'row',
                padding: 0,
                pointerEvents: 'none',
              }}
            >
              {Array.from({ length: MAX_ROW * blocksPerRow }).map((_, idx) => {
                const i = Math.floor(idx / blocksPerRow)
                const j = idx % blocksPerRow
                // 2行読みは lineIndex から linesPerStep 行ぶん同時ハイライト
                const active =
                  j === blockIndex && i >= lineIndex && i < lineIndex + linesPerStep
                return (
                  <div
                    key={idx}
                    id={`${i + 1}_${j + 1}`}
                    style={
                      active
                        ? {
                            backgroundColor: '#ffe5e5',
                            height: '140%',
                            position: 'relative',
                            top: '-20%',
                          }
                        : {
                            backgroundColor: 'transparent',
                            height: 'auto',
                            position: 'relative',
                            top: '0%',
                          }
                    }
                  />
                )
              })}
            </div>

            {/* #page_number */}
            <small
              id="page_number"
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: 0,
                right: 0,
                writingMode: 'horizontal-tb',
                textAlign: 'center',
                fontSize: 12,
                color: '#888',
              }}
            >
              {pageIndex + 1} / {pages.length || 1}
            </small>
          </div>
        </section>

        {/* ===== 右: サイドバー ===== */}
        <aside
          className="side training"
          style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* 読書スピード */}
          <div
            className="el_speed"
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 20,
              textAlign: 'center',
              border: '2px solid #1478C3',
            }}
          >
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              読書スピード
              <small style={{ fontSize: 11, marginLeft: 4 }}>（字/分）</small>
            </p>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: 'bold',
                color: '#ee5a24',
              }}
            >
              {MODE_LABEL[mode]}（セット{setIndex + 1}）
              {pendingMode && (
                <span style={{ marginLeft: 6, color: '#27ae60' }}>
                  → 次セットで {MODE_LABEL[pendingMode]}
                </span>
              )}
            </div>
            <h4
              className="hp_font__arial"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 42,
                fontWeight: 'bold',
                color: '#1478C3',
                margin: '8px 0 0',
                lineHeight: 1,
              }}
            >
              {wpmEstimate.toLocaleString()}
            </h4>
          </div>

          {/* カウントの速さ */}
          <div
            className="el_count__side"
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <h4
              style={{
                fontSize: 14,
                margin: '0 0 12px',
                color: '#333',
                fontWeight: 'bold',
              }}
            >
              カウントの速さ
            </h4>

            {/* 自動/手動(表示のみ) */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  padding: '4px 16px',
                  borderRadius: 12,
                  background: '#FFD700',
                  color: '#333',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              >
                自動
              </span>
              <span
                style={{
                  padding: '4px 16px',
                  borderRadius: 12,
                  background: '#e5e7eb',
                  color: '#999',
                  fontSize: 12,
                }}
              >
                手動
              </span>
            </div>

            {/* 現在カウント */}
            <div style={{ marginBottom: 8 }}>
              <span
                className="hp_font__arial"
                id="count"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 48,
                  fontWeight: 'bold',
                  color: '#2A2A2A',
                }}
              >
                {cpm}
              </span>
              <span style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>
                回/分
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#888' }}>
              カウントが徐々に速くなります
            </div>
            <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>
              最大 {maxCpm}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
