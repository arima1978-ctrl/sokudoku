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

/** @deprecated 経過時間ベースに移行済み。後方互換のため残す */
const FREQUENCY_MULTIPLIER: Record<TrainingFrequency, number> = {
  1: 0.6,
  2: 0.7,
  3: 0.8,
}

const DEFAULT_START_WPM = 300

/**
 * 前回トレーニングからの経過時間に応じた倍率
 * - 48時間以内: 80%（記憶が新鮮）
 * - 49〜96時間: 70%（やや忘れている）
 * - 97時間以上: 60%（かなり忘れている）
 */
export function getMultiplierByElapsedHours(elapsedHours: number): number {
  if (elapsedHours <= 48) return 0.8
  if (elapsedHours <= 96) return 0.7
  return 0.6
}

/**
 * 経過時間ベースでスタート速度を計算する
 */
export function calculateStartSpeedByTime(
  previousPreWpm: number | null,
  lastTrainingAt: string | null,
): number {
  if (previousPreWpm === null || previousPreWpm <= 0) {
    return DEFAULT_START_WPM
  }
  if (!lastTrainingAt) {
    return DEFAULT_START_WPM
  }

  const elapsedMs = Date.now() - new Date(lastTrainingAt).getTime()
  const elapsedHours = elapsedMs / (1000 * 60 * 60)
  const multiplier = getMultiplierByElapsedHours(elapsedHours)

  return Math.floor(previousPreWpm * multiplier)
}

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

/** ステージアップに必要な達成回数 */
export const REQUIRED_CLEARS = 5

/**
 * ステージアップ可能か判定
 * 条件1: 最低セッション数以上
 * 条件2: ブロック読みで240カウント突破が5回以上
 * 条件3: ブロック読みで正答率90%以上が5回以上
 */
export function canStageUp(
  stageSessionCount: number,
  block240Count: number,
  blockAccuracy90Count: number,
  minSessions: number,
): boolean {
  return stageSessionCount >= minSessions
    && block240Count >= REQUIRED_CLEARS
    && blockAccuracy90Count >= REQUIRED_CLEARS
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

// ========== 動的メニュー生成 ==========

interface MenuGenerationParams {
  durationMin: DurationMin
  stageNumber: CoachStageNumber
  direction: Direction
  stageSessionCount: number
}

type SegmentEntry = {
  segKey: string
  durationSec: number
  hasTest: boolean
  skippable: boolean
}

/**
 * ステージ・時間別のメニュー定義テーブル。
 * ガイド（/guide/index.html）と完全に一致させること。
 *
 * 10分: たて/よこ交互、Stage2は1行/2行交互
 * 20分: 毎回全種目、Stage2は1行+2行両方
 * 30分: 毎回全種目、Stage1-2は視点移動追加、Stage3-5は高速読み・視点移動・本読み均等
 */
function getMenuDefinition(
  durationMin: DurationMin,
  stageNumber: CoachStageNumber,
  stageSessionCount: number,
): SegmentEntry[] {
  switch (durationMin) {
    case 10: return getMenu10(stageNumber, stageSessionCount)
    case 20: return getMenu20(stageNumber)
    case 30: return getMenu30(stageNumber)
  }
}

function getMenu10(stage: CoachStageNumber, sessionCount: number): SegmentEntry[] {
  switch (stage) {
    case 1: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 120, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 120, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 270, hasTest: true, skippable: false },
    ]
    case 2: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: '1line_or_2line', durationSec: 120, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 270, hasTest: true, skippable: false },
    ]
    case 3: return [
      { segKey: '1line', durationSec: 120, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 120, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 120, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 120, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 120, hasTest: false, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 180, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 150, hasTest: false, skippable: false },
    ]
    case 5: return [
      { segKey: 'block', durationSec: 210, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 210, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 180, hasTest: false, skippable: false },
    ]
  }
}

function getMenu20(stage: CoachStageNumber): SegmentEntry[] {
  switch (stage) {
    case 1: return [
      { segKey: 'barabara', durationSec: 150, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 510, hasTest: true, skippable: false },
    ]
    case 2: return [
      { segKey: 'barabara', durationSec: 150, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 150, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 150, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 510, hasTest: true, skippable: false },
    ]
    case 3: return [
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 300, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 300, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 240, hasTest: false, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 150, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 360, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 360, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 330, hasTest: false, skippable: false },
    ]
    case 5: return [
      { segKey: 'block', durationSec: 420, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 420, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 360, hasTest: false, skippable: false },
    ]
  }
}

function getMenu30(stage: CoachStageNumber): SegmentEntry[] {
  switch (stage) {
    case 1: return [
      { segKey: 'barabara', durationSec: 210, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 240, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 240, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 630, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 300, hasTest: false, skippable: false },
    ]
    case 2: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 660, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 300, hasTest: false, skippable: false },
    ]
    case 3: return [
      { segKey: '1line', durationSec: 240, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 240, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 450, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 450, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 420, hasTest: false, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 540, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 540, hasTest: false, skippable: false },
    ]
    case 5: return [
      { segKey: 'block', durationSec: 600, hasTest: true, skippable: false },
      { segKey: 'viewpoint', durationSec: 600, hasTest: false, skippable: false },
      { segKey: 'hon_yomi', durationSec: 600, hasTest: false, skippable: false },
    ]
  }
}

/**
 * ステージ構成に基づいてトレーニングメニューを動的生成する。
 * ガイド（/guide/index.html）の時間配分テーブルと完全一致。
 *
 * 10分: たて/よこ交互、Stage2は1行/2行交互(4回周期)
 * 20分: 毎回全種目、Stage2は1行+2行両方
 * 30分: 毎回全種目、Stage1-2は視点移動追加、Stage3-5は均等配分
 */
export function generateMenuSegments(params: MenuGenerationParams): DynamicSegment[] {
  const { durationMin, stageNumber, direction, stageSessionCount } = params
  const segments: DynamicSegment[] = []
  let order = 1

  const definition = getMenuDefinition(durationMin, stageNumber, stageSessionCount)

  for (const entry of definition) {
    const segType = resolveSegmentType(entry.segKey, direction, stageSessionCount)
    const label = getSegmentLabel(segType)
    const testType = entry.hasTest ? getTestType(segType) : null

    segments.push({
      segment_order: order++,
      segment_type: segType,
      duration_sec: entry.durationSec,
      has_test: entry.hasTest,
      test_duration_sec: entry.hasTest ? 30 : 0,
      test_type: testType,
      skippable: entry.skippable,
      description: `${label} ${formatMin(entry.durationSec)}${entry.hasTest ? ' + テスト' : ''}`,
    })
  }

  return segments
}

/**
 * スピードモード用メニュー生成（Stage 5 完了後）
 * ブロック読みと視点移動を半々でカウントを上げ続ける
 */
/**
 * スピードモード（本読みトレーニング）用メニュー生成
 * Stage 5 完了後: ブロック高速読み + 本読み（均等配分）
 */
export function generateSpeedModeSegments(params: {
  durationMin: DurationMin
  direction: Direction
}): DynamicSegment[] {
  const { durationMin, direction } = params
  const blockType = direction === 'tate' ? 'block_tate' : 'block_yoko'
  const blockLabel = direction === 'tate' ? 'たてブロック高速読み' : 'よこブロック高速読み'
  const halfTime = Math.floor((durationMin * 60) / 2)

  return [
    {
      segment_order: 1,
      segment_type: blockType,
      duration_sec: halfTime,
      has_test: true,
      test_duration_sec: 30,
      test_type: 'content_comprehension',
      skippable: false,
      description: `${blockLabel} ${formatMin(halfTime)} + テスト`,
    },
    {
      segment_order: 2,
      segment_type: 'hon_yomi',
      duration_sec: halfTime,
      has_test: false,
      test_duration_sec: 0,
      test_type: null,
      skippable: false,
      description: `本読み ${formatMin(halfTime)}`,
    },
  ]
}

/** 秒数を「○分」「○.○分」に変換 */
function formatMin(sec: number): string {
  const min = sec / 60
  if (Number.isInteger(min)) return `${min}分`
  return `${Math.round(min * 10) / 10}分`
}
