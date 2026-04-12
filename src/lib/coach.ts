/**
 * コーチロジック v2（純粋関数）
 *
 * ステージ別のセグメント構成・進級ルールを厳格に管理。
 * - Stage 1: ばらばら → 1行 → 2行 → ブロック (最低6回)
 * - Stage 2: ばらばら → 1行or2行(交互) → ブロック (最低8回)
 * - Stage 3: 1行 → 2行 → ブロック (最低8回)
 * - Stage 4: ばらばら → ブロック → 視点移動 (最低8回)
 * - Stage 5: ブロック → 視点移動 (最低8回)
 *
 * 方向: 奇数回=たて、偶数回=よこ
 * ステージアップ: 最低回数 + ブロック読み240カウント突破 + 正答率90%
 */

// ========== Types ==========

export type TrainingFrequency = 1 | 2 | 3
export type Direction = 'tate' | 'yoko'
export type DurationMin = 10 | 20 | 30
export type CoachStageNumber = 1 | 2 | 3 | 4 | 5

export interface CoachStage {
  id: string
  name: string
  stage_number: CoachStageNumber
  description: string
  segment_types: string[]
  min_sessions: number
}

export interface DynamicSegment {
  segment_order: number
  segment_type: string
  duration_sec: number
  has_test: boolean
  test_duration_sec: number
  test_type: string | null
  skippable: boolean
  description: string
}

export interface CoachSessionConfig {
  segments: DynamicSegment[]
  direction: Direction
  stageName: string
  stageNumber: CoachStageNumber
  startWpm: number
  sessionNumber: number
}

// ========== 定数 ==========

const FREQUENCY_MULTIPLIER: Record<TrainingFrequency, number> = {
  1: 0.6,
  2: 0.7,
  3: 0.8,
}

const DEFAULT_START_WPM = 300

const STAGE_NAMES: Record<CoachStageNumber, string> = {
  1: '3点読み',
  2: '2点読み',
  3: '1行読み',
  4: '2行読み',
  5: 'ブロック読み',
}

/** ステージごとのセグメント構成キー */
interface StageConfig {
  minSessions: number
  /** セグメントキー: 'barabara', '1line', '2line', 'block', 'viewpoint', '1line_or_2line' */
  segments: string[]
}

const STAGE_CONFIGS: Record<CoachStageNumber, StageConfig> = {
  1: { minSessions: 6, segments: ['barabara', '1line', '2line', 'block'] },
  2: { minSessions: 8, segments: ['barabara', '1line_or_2line', 'block'] },
  3: { minSessions: 8, segments: ['1line', '2line', 'block'] },
  4: { minSessions: 8, segments: ['barabara', 'block', 'viewpoint'] },
  5: { minSessions: 8, segments: ['block', 'viewpoint'] },
}

// ========== 純粋関数 ==========

/** 頻度に応じた倍率を返す */
export function getFrequencyMultiplier(frequency: TrainingFrequency): number {
  return FREQUENCY_MULTIPLIER[frequency]
}

/**
 * スタート速度を計算する
 * 前回の事前計測値 × 頻度倍率
 */
export function calculateStartSpeed(
  previousPreWpm: number | null,
  frequency: TrainingFrequency,
): number {
  if (previousPreWpm === null || previousPreWpm <= 0) {
    return DEFAULT_START_WPM
  }
  return Math.floor(previousPreWpm * FREQUENCY_MULTIPLIER[frequency])
}

/**
 * セッション回数から方向を決定する。
 * 奇数回(1,3,5...)=たて、偶数回(2,4,6...)=よこ
 * sessionNumber は 1-indexed（次に実施するセッション番号）
 */
export function getDirectionBySession(sessionNumber: number): Direction {
  return sessionNumber % 2 === 1 ? 'tate' : 'yoko'
}

/** 後方互換: 前回と反対の方向を返す */
export function getNextDirection(lastDirection: Direction): Direction {
  return lastDirection === 'tate' ? 'yoko' : 'tate'
}

/**
 * ステージアップ可能か判定
 * 条件1: 最低セッション数以上
 * 条件2: ブロック読みで240カウント突破
 * 条件3: ブロック読みで正答率90%以上
 */
export function canStageUp(
  stageSessionCount: number,
  block240Cleared: boolean,
  blockAccuracy90: boolean,
  minSessions: number,
): boolean {
  return stageSessionCount >= minSessions && block240Cleared && blockAccuracy90
}

/** ステージ名を取得 */
export function getStageName(stageNumber: CoachStageNumber): string {
  return STAGE_NAMES[stageNumber]
}

/** ステージの最低セッション数を取得 */
export function getMinSessions(stageNumber: CoachStageNumber): number {
  return STAGE_CONFIGS[stageNumber].minSessions
}

// ========== セグメントキー → 実際のセグメントタイプ変換 ==========

/**
 * セグメントキーを方向付きの実セグメントタイプに変換する
 */
function resolveSegmentType(
  segKey: string,
  direction: Direction,
  stageSessionCount: number,
): string {
  switch (segKey) {
    case 'barabara':
      return 'barabara'
    case '1line':
      return direction === 'tate' ? 'shunkan_tate_1line' : 'shunkan_yoko_1line'
    case '2line':
      return direction === 'tate' ? 'shunkan_tate_2line' : 'shunkan_yoko_2line'
    case 'block':
      return direction === 'tate' ? 'block_tate' : 'block_yoko'
    case 'viewpoint':
      return 'shiten_ido'
    case '1line_or_2line': {
      // Stage 2 特有: 1,2回目→1行、3,4回目→2行、5,6回目→1行...
      const subType = (stageSessionCount % 4 < 2) ? '1line' : '2line'
      return resolveSegmentType(subType, direction, stageSessionCount)
    }
    default:
      return segKey
  }
}

/** セグメントタイプからテストタイプを決定 */
function getTestType(segType: string): string {
  if (segType === 'barabara' || segType.startsWith('shunkan_')) return 'shunkan_recall'
  if (segType.startsWith('block_')) return 'content_comprehension'
  if (segType.startsWith('output_')) return 'vocab_check'
  return 'content_comprehension'
}

/** セグメントタイプから表示名を取得 */
function getSegmentLabel(segType: string): string {
  const labels: Record<string, string> = {
    barabara: 'ばらばら読み',
    shunkan_tate_1line: 'たて1行読み',
    shunkan_yoko_1line: 'よこ1行読み',
    shunkan_tate_2line: 'たて2行読み',
    shunkan_yoko_2line: 'よこ2行読み',
    block_tate: 'たてブロック読み',
    block_yoko: 'よこブロック読み',
    shiten_ido: '視点移動',
    hon_yomi: '本読み',
    reading_speed: '高速読み',
  }
  return labels[segType] ?? segType
}

// ========== 時間配分計算 ==========

/** 10分コースのセグメントごとの秒数 */
function getBaseDuration10(segKey: string): number {
  switch (segKey) {
    case 'barabara': return 90       // 1.5分
    case '1line': return 120         // 2分
    case '2line': return 120         // 2分
    case '1line_or_2line': return 120 // 2分
    case 'block': return 150         // 2.5分
    case 'viewpoint': return 90      // 1.5分
    default: return 90
  }
}

/** 20分コースの追加秒数 */
function getExtraDuration20(segKey: string): number {
  switch (segKey) {
    case 'block': return 180     // +3分
    case 'viewpoint': return 120 // +2分
    default: return 60           // +1分
  }
}

/** 30分コースの追加秒数 */
function getExtraDuration30(segKey: string): number {
  switch (segKey) {
    case 'block': return 300     // +5分
    case 'viewpoint': return 180 // +3分
    default: return 120          // +2分
  }
}

// ========== 動的メニュー生成 ==========

interface MenuGenerationParams {
  durationMin: DurationMin
  stageNumber: CoachStageNumber
  direction: Direction
  stageSessionCount: number
}

type AddSegmentFn = (
  type: string,
  durationSec: number,
  hasTest: boolean,
  testDurationSec: number,
  testType: string | null,
  skippable: boolean,
  description: string,
) => void

/**
 * ステージ構成に基づいてトレーニングメニューを動的生成する。
 *
 * 測定(前/後)は daily_session フローで処理するため、
 * ここではトレーニングセグメントのみ生成する。
 *
 * 各ステージの構成:
 * - Stage 1: ばらばら → 1行 → 2行 → ブロック
 * - Stage 2: ばらばら → 1行or2行(交互) → ブロック
 * - Stage 3: 1行 → 2行 → ブロック
 * - Stage 4: ばらばら → ブロック → 視点移動
 * - Stage 5: ブロック → 視点移動
 *
 * 時間別調整:
 * - 10分: 基本構成をタイトに
 * - 20分: ブロック+3分、視点移動+2分
 * - 30分: ブロック+5分、視点移動+3分、本読み追加
 */
export function generateMenuSegments(params: MenuGenerationParams): DynamicSegment[] {
  const { durationMin, stageNumber, direction, stageSessionCount } = params
  const segments: DynamicSegment[] = []
  let order = 1

  const config = STAGE_CONFIGS[stageNumber]

  const add: AddSegmentFn = (type, durationSec, hasTest, testDurationSec, testType, skippable, desc) => {
    segments.push({
      segment_order: order++,
      segment_type: type,
      duration_sec: durationSec,
      has_test: hasTest,
      test_duration_sec: testDurationSec,
      test_type: testType,
      skippable,
      description: desc,
    })
  }

  // ステージ定義のセグメントを順番に生成
  for (const segKey of config.segments) {
    const segType = resolveSegmentType(segKey, direction, stageSessionCount)
    const label = getSegmentLabel(segType)
    const testType = getTestType(segType)
    const hasTest = segKey !== 'viewpoint' // 視点移動はテストなし

    // 基本秒数
    let durationSec = getBaseDuration10(segKey)

    // 20分/30分の追加
    if (durationMin === 20) {
      durationSec += getExtraDuration20(segKey)
    } else if (durationMin === 30) {
      durationSec += getExtraDuration30(segKey)
    }

    const isBarabara = segKey === 'barabara'
    const testDurationSec = hasTest ? 30 : 0

    add(
      segType,
      durationSec,
      hasTest,
      testDurationSec,
      hasTest ? testType : null,
      isBarabara, // ばらばらのみスキップ可能
      `${label} ${formatMin(durationSec)}${hasTest ? ' + テスト' : ''}`,
    )
  }

  // 30分コースのみ: 本読みを追加（Stage 4以降、または全ステージ）
  if (durationMin === 30) {
    add('hon_yomi', 300, true, 60, 'content_comprehension', false,
      '本読み 5分 + テスト')
  }

  // 最後に高速読み仕上げ（全コース共通）
  const readingSpeedSec = durationMin === 30 ? 180 : 120
  add('reading_speed', readingSpeedSec, false, 0, null, false,
    `高速読み ${formatMin(readingSpeedSec)}`)

  return segments
}

/** 秒数を「○分」「○.○分」に変換 */
function formatMin(sec: number): string {
  const min = sec / 60
  if (Number.isInteger(min)) return `${min}分`
  return `${Math.round(min * 10) / 10}分`
}
