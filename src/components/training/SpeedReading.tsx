'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  BLOCK_CONFIG,
  COUNT_AUTO,
  MARKER_HIGHLIGHT,
  QUESTION_FONT,
} from '@/lib/trainingConfig'

interface SpeedReadingProps {
  title: string
  body: string
  charCount: number
  minReadingSec: number
  targetWpm?: number
  /** ブロックタイプ: verticalBlock / horizontalBlock (デフォルト: verticalBlock) */
  blockType?: 'verticalBlock' | 'horizontalBlock'
  /** 1行あたりのブロック数 (デフォルト: 2) */
  blockNum?: number
  onComplete: (readingTimeSec: number, wpm: number) => void
}

/**
 * 高速読みコンポーネント（元システム準拠）
 *
 * - カウント: 60〜260回/分、自動上昇テーブルで段階的に加速
 * - マーカー: ブロック単位で赤ハイライト(#ffe5e5)が移動
 * - クリック音: メトロノームのようにカウント間隔で s_tick.mp3 再生
 * - 手動/自動切替: 手動時はカウント固定、自動時は自動上昇
 * - 読書スピード: count × (1行文字数/ブロック数) で算出
 */
export default function SpeedReading({
  title,
  body,
  charCount,
  minReadingSec,
  targetWpm,
  blockType = 'verticalBlock',
  blockNum = 2,
  onComplete,
}: SpeedReadingProps) {
  const [phase, setPhase] = useState<'ready' | 'reading' | 'done'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [count, setCount] = useState(BLOCK_CONFIG.countMin)
  const [isAuto, setIsAuto] = useState(true)
  const [markerRow, setMarkerRow] = useState(1)
  const [markerCol, setMarkerCol] = useState(1)
  const [pageNum, setPageNum] = useState(0)
  const [savedSpeed, setSavedSpeed] = useState<number | null>(null)

  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const countNumberRef = useRef(0) // 現在のカウントでの刻み数
  const displayCountRef = useRef(BLOCK_CONFIG.countMin)
  const markerRef = useRef({ row: 1, col: 1 })

  const isVertical = blockType === 'verticalBlock'
  const maxWord = isVertical
    ? BLOCK_CONFIG.verticalSplitWord / blockNum
    : BLOCK_CONFIG.horizontalSplitWord / blockNum
  const maxRow = isVertical ? BLOCK_CONFIG.verticalMaxRow : BLOCK_CONFIG.horizontalMaxRow
  const splitWord = isVertical ? BLOCK_CONFIG.verticalSplitWord : BLOCK_CONFIG.horizontalSplitWord

  // テキストをページに分割
  const pages = splitTextToPages(body, splitWord, maxRow)
  const currentPage = pages[pageNum] ?? []
  const readingSpeed = Math.round(count * maxWord)

  const canFinish = elapsed >= minReadingSec

  // クリック音再生
  const playTick = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return
    try {
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBufferRef.current
      source.connect(audioContextRef.current.destination)
      source.start(0)
    } catch { /* audio error */ }
  }, [])

  // マーカー移動
  const moveMarker = useCallback(() => {
    const m = markerRef.current
    if (m.col >= blockNum) {
      m.col = 1
      m.row++
      if (m.row > maxRow || m.row > (pages[pageNum]?.length ?? 0)) {
        m.row = 1
        m.col = 1
        // 次ページ
        setPageNum(p => (pages[p + 1] ? p + 1 : 0))
      }
    } else {
      m.col++
    }
    setMarkerRow(m.row)
    setMarkerCol(m.col)
  }, [blockNum, maxRow, pages, pageNum])

  // カウント間隔処理（8カウントで+1ずつ緩やかに上昇）
  const startCountInterval = useCallback(() => {
    if (countIntervalRef.current) clearInterval(countIntervalRef.current)

    const dc = displayCountRef.current
    const intervalMs = Math.max(50, Math.round((60 / dc) * 1000))

    countIntervalRef.current = setInterval(() => {
      playTick()
      moveMarker()

      // 自動モードの場合: 8カウントで+1
      if (isAuto) {
        countNumberRef.current++

        if (countNumberRef.current >= COUNT_AUTO.beatsPerStep) {
          countNumberRef.current = 0
          const currentVal = displayCountRef.current

          if (currentVal >= BLOCK_CONFIG.countMax) {
            // 最大(260)到達→最小(60)に戻る
            displayCountRef.current = BLOCK_CONFIG.countMin
          } else {
            displayCountRef.current = currentVal + COUNT_AUTO.stepSize
          }
          setCount(displayCountRef.current)

          // 間隔変更のため再スケジュール
          if (countIntervalRef.current) clearInterval(countIntervalRef.current)
          startCountInterval()
        }
      }
    }, intervalMs)
  }, [isAuto, playTick, moveMarker])

  // 音源読み込み + 開始
  const startReading = useCallback(async () => {
    try {
      audioContextRef.current = new AudioContext()
      const response = await fetch('/sounds/s_tick.mp3')
      const arrayBuffer = await response.arrayBuffer()
      audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer)
    } catch { /* no audio */ }

    startTimeRef.current = Date.now()
    setPhase('reading')
    displayCountRef.current = BLOCK_CONFIG.countMin
    setCount(BLOCK_CONFIG.countMin)
    countNumberRef.current = 0
    markerRef.current = { row: 1, col: 1 }
    setMarkerRow(1)
    setMarkerCol(1)

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)

    startCountInterval()
  }, [startCountInterval])

  // カウント手動UP (+10ずつ)
  function handleCountUp() {
    const current = displayCountRef.current
    if (current >= BLOCK_CONFIG.countMax) return
    displayCountRef.current = Math.min(current + 10, BLOCK_CONFIG.countMax)
    setCount(displayCountRef.current)
    if (phase === 'reading') {
      countNumberRef.current = 0
      if (countIntervalRef.current) clearInterval(countIntervalRef.current)
      startCountInterval()
    }
  }

  // カウント手動DOWN (-10ずつ)
  function handleCountDown() {
    const current = displayCountRef.current
    if (current <= BLOCK_CONFIG.countMin) return
    displayCountRef.current = Math.max(current - 10, BLOCK_CONFIG.countMin)
    setCount(displayCountRef.current)
    if (phase === 'reading') {
      countNumberRef.current = 0
      if (countIntervalRef.current) clearInterval(countIntervalRef.current)
      startCountInterval()
    }
  }

  // 記録を保存
  function handleSaveSpeed() {
    const current = readingSpeed
    if (savedSpeed === null || current > savedSpeed) {
      setSavedSpeed(current)
    }
  }

  // 終了
  const finishReading = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (countIntervalRef.current) clearInterval(countIntervalRef.current)
    const timeSec = Math.round((Date.now() - startTimeRef.current) / 100) / 10
    const finalSpeed = savedSpeed ?? readingSpeed
    setPhase('done')
    onComplete(timeSec, finalSpeed)
  }, [savedSpeed, readingSpeed, onComplete])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countIntervalRef.current) clearInterval(countIntervalRef.current)
    }
  }, [])

  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60
  const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`
  const remainToMin = Math.max(0, minReadingSec - elapsed)

  // === 準備画面 ===
  if (phase === 'ready') {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 text-center">
              <span className="inline-block rounded-full bg-blue-600 px-4 py-1 text-sm font-bold text-white">
                {isVertical ? 'たてブロックよみ' : 'よこブロックよみ'}
              </span>
            </div>
            <h2 className="mb-2 text-center text-lg font-bold text-zinc-900">{title}</h2>
            <p className="mb-4 text-center text-sm text-zinc-500">
              レベル選択: 1行{blockNum}ブロック / {charCount}文字
            </p>

            {/* カウント設定 */}
            <div className="mb-4 rounded-lg border border-zinc-200 p-4">
              <h4 className="mb-2 text-sm font-bold text-zinc-700">カウントの速さ</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="mode" checked={isAuto} onChange={() => setIsAuto(true)} />
                    自動
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" name="mode" checked={!isAuto} onChange={() => setIsAuto(false)} />
                    手動
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleCountDown}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100">おそく</button>
                  <span className="min-w-[60px] text-center font-mono text-lg font-bold text-zinc-900">{count}</span>
                  <span className="text-xs text-zinc-500">回/分</span>
                  <button type="button" onClick={handleCountUp}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100">はやく</button>
                </div>
              </div>
              {isAuto && (
                <p className="mt-2 text-xs text-zinc-400">カウントが徐々に速くなります</p>
              )}
            </div>

            <div className="text-center">
              <button type="button" onClick={startReading} style={{
                padding: '14px 48px', borderRadius: 28,
                border: '2px solid #E6C200',
                background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
                color: '#333', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
              }}>
                スタート
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === 完了 ===
  if (phase === 'done') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-zinc-500">結果を処理中...</p>
        </div>
      </div>
    )
  }

  // === 読書中（2カラムレイアウト）===
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)' }}>
      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-4" style={{ height: 'calc(100vh - 16px)' }}>
        {/* 左: コンテンツエリア */}
        <div className="flex flex-1 flex-col">
          {/* タイマーバー */}
          <div className="mb-2 rounded-lg bg-white px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 min-w-[120px] overflow-hidden rounded-full bg-zinc-100">
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: canFinish ? '#27ae60' : '#3b82f6',
                    width: `${Math.min(100, (elapsed / Math.max(1, minReadingSec)) * 100)}%`,
                    transition: 'width 0.5s',
                  }} />
                </div>
                <span className="font-mono text-sm font-bold text-zinc-700">
                  あと {String(Math.floor(remainToMin / 60)).padStart(2, '0')}:{String(remainToMin % 60).padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs text-zinc-400">{elapsedStr} 経過</span>
            </div>
          </div>

          {/* テキスト表示エリア + マーカー */}
          <div className="relative flex-1 overflow-hidden rounded-lg bg-white">
            <div style={{
              padding: 20,
              writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
              fontFamily: QUESTION_FONT.family,
              fontSize: isVertical ? 20 : 18,
              lineHeight: 2,
              height: '100%',
              overflowY: 'auto',
              position: 'relative',
            }}>
              {currentPage.map((line, i) => (
                <p key={`${pageNum}-${i}`} style={{ margin: 0 }}>{line}</p>
              ))}
            </div>

            {/* マーカーグリッドオーバーレイ */}
            <div style={{
              position: 'absolute', top: 20, left: 20, right: 20, bottom: 20,
              display: 'grid',
              gridTemplateColumns: isVertical
                ? `repeat(${maxRow}, 1fr)`
                : `repeat(${blockNum}, 1fr)`,
              gridTemplateRows: isVertical
                ? `repeat(${blockNum}, 1fr)`
                : `repeat(${maxRow}, 1fr)`,
              pointerEvents: 'none',
            }}>
              {Array.from({ length: maxRow * blockNum }).map((_, i) => {
                const r = isVertical ? (i % blockNum) + 1 : Math.floor(i / blockNum) + 1
                const c = isVertical ? Math.floor(i / blockNum) + 1 : (i % blockNum) + 1
                const isActive = r === markerRow && c === markerCol
                return (
                  <div key={i} style={{
                    background: isActive ? MARKER_HIGHLIGHT : 'transparent',
                    transition: 'background 0.1s',
                    borderRadius: 2,
                  }} />
                )
              })}
            </div>

            {/* ページ番号 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-400">
              {pageNum + 1} / {pages.length}
            </div>
          </div>
        </div>

        {/* 右: サイドバー */}
        <div className="flex w-56 flex-col gap-3">
          {/* 読書スピード */}
          <div className="rounded-lg bg-white p-4 text-center">
            <div className="text-xs text-zinc-500">読書スピード<small>（字/分）</small></div>
            <div className="mt-1 font-mono text-3xl font-bold text-zinc-900">
              {readingSpeed.toLocaleString()}
            </div>
            {savedSpeed !== null && (
              <div className="mt-1 text-xs text-green-600">保存済: {savedSpeed.toLocaleString()}</div>
            )}
          </div>

          {/* カウント設定 */}
          <div className="rounded-lg bg-white p-4">
            <h4 className="mb-2 text-xs font-bold text-zinc-600">カウントの速さ</h4>
            <div className="mb-2 text-center">
              <span className="font-mono text-2xl font-bold text-zinc-900">{count}</span>
              <span className="ml-1 text-xs text-zinc-500">回/分</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleCountDown} className="flex-1 rounded-full border border-zinc-300 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
                おそく
              </button>
              <button type="button" onClick={handleCountUp} className="flex-1 rounded-full border border-zinc-300 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
                はやく
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-zinc-400">
              {isAuto ? 'カウントが徐々に速くなります' : '手動モード'}
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-auto flex flex-col gap-2">
            <button type="button" onClick={handleSaveSpeed} style={{
              padding: '10px 16px', borderRadius: 28,
              border: '2px solid #00aa6e', background: '#00aa6e',
              color: '#fff', fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
              textAlign: 'center',
            }}>
              記録を保存
            </button>
            {canFinish && (
              <button type="button" onClick={finishReading} style={{
                padding: '10px 16px', borderRadius: 28,
                border: '2px solid #E6C200',
                background: 'linear-gradient(180deg, #FFE44D 0%, #FFD700 100%)',
                color: '#333', fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
                textAlign: 'center',
              }}>
                読み終わり
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== テキスト分割ユーティリティ ==========

/** テキストをページ単位に分割（元システム splitSentence / splitByChunk 準拠） */
function splitTextToPages(text: string, lineSize: number, maxRows: number): string[][] {
  const paragraphs = text.split(/\n/g)
  const allLines: string[] = []

  for (const para of paragraphs) {
    const cleaned = para.replace(/ +/g, '')
    if (cleaned.length === 0) continue
    const chunks = splitByChunk(cleaned, lineSize)
    allLines.push(...chunks)
  }

  // maxRows ごとにページ分割
  const pages: string[][] = []
  for (let i = 0; i < allLines.length; i += maxRows) {
    pages.push(allLines.slice(i, i + maxRows))
  }

  return pages.length > 0 ? pages : [['']]
}

/** 句読点繰り上げ付きの文字数分割（元システム準拠） */
function splitByChunk(str: string, size: number): string[] {
  const result: string[] = []
  let pos = 0
  while (pos < str.length) {
    let end = pos + size
    // 次の文字が句読点なら繰り上げ
    if (end < str.length) {
      const nextChar = str[end]
      if (nextChar === '。' || nextChar === '、' || nextChar === '」') {
        end++
      }
    }
    result.push(str.slice(pos, end))
    pos = end
  }
  return result
}
