/**
 * コーチロジック（純粋関数）
 *
 * - スタート速度の計算（頻度ベース）
 * - 方向の自動切替（たて↔よこ）
 * - ステージアップ判定（回数 + 流暢性報告）
 * - 動的メニュー生成（10/20/30分）
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

// ステージごとのメインセグメントタイプ
const STAGE_MAIN_SEGMENTS: Record<CoachStageNumber, { tate: string; yoko: string }> = {
  1: { tate: 'barabara', yoko: 'barabara' },
  2: { tate: 'shunkan_tate_1line', yoko: 'shunkan_yoko_1line' },
  3: { tate: 'shunkan_tate_2line', yoko: 'shunkan_yoko_2line' },
  4: { tate: 'block_tate', yoko: 'block_yoko' },
  5: { tate: 'output_tate', yoko: 'output_yoko' },
}

// ステージごとのテストタイプ
const STAGE_TEST_TYPE: Record<CoachStageNumber, string> = {
  1: 'shunkan_recall',
  2: 'shunkan_recall',
  3: 'shunkan_recall',
  4: 'content_comprehension',
  5: 'vocab_check',
}

// ステージ名
const STAGE_NAMES: Record<CoachStageNumber, string> = {
  1: '3点読み',
  2: '2点読み',
  3: '1行読み',
  4: '2行読み',
  5: 'ブロック読み',
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

/** 前回と反対の方向を返す */
export function getNextDirection(lastDirection: Direction): Direction {
  return lastDirection === 'tate' ? 'yoko' : 'tate'
}

/**
 * ステージアップ可能か判定
 * 条件1: 最低セッション数以上
 * 条件2: 「240カウントまでスムーズに読めた」を報告済み
 */
export function canStageUp(
  stageSessionCount: number,
  fluencyReported: boolean,
  minSessions: number,
): boolean {
  return stageSessionCount >= minSessions && fluencyReported
}

/** ステージ名を取得 */
export function getStageName(stageNumber: CoachStageNumber): string {
  return STAGE_NAMES[stageNumber]
}

// ========== 動的メニュー生成 ==========

interface MenuGenerationParams {
  durationMin: DurationMin
  stageNumber: CoachStageNumber
  direction: Direction
  stageSessionCount: number
}

/**
 * 時間・ステージ・方向に基づいてトレーニングメニューを動的生成する。
 *
 * 構成（コーチ仕様）:
 * - 共通: 読書スピード測定(前) → 高速読みトレーニング → 読書スピード測定(後)
 *   ※ 測定(前/後)は daily_session フローで処理するため、ここではセグメントに含めない
 * - 20/30分: 高速読みと測定(後)の間に 視点移動 → 本読み → めくりよみ を挿入
 * - ステージ実施3回超: 本読みの比重を増やす
 */
export function generateMenuSegments(params: MenuGenerationParams): DynamicSegment[] {
  const { durationMin, stageNumber, direction, stageSessionCount } = params
  const segments: DynamicSegment[] = []
  let order = 1

  const mainType = STAGE_MAIN_SEGMENTS[stageNumber][direction]
  const testType = STAGE_TEST_TYPE[stageNumber]
  const stageName = STAGE_NAMES[stageNumber]

  // ヘルパー: セグメント追加
  const addSegment = (
    type: string,
    durationSec: number,
    hasTest: boolean,
    testDurationSec: number,
    testT: string | null,
    skippable: boolean,
    desc: string,
  ) => {
    segments.push({
      segment_order: order++,
      segment_type: type,
      duration_sec: durationSec,
      has_test: hasTest,
      test_duration_sec: testDurationSec,
      test_type: testT,
      skippable,
      description: desc,
    })
  }

  switch (durationMin) {
    case 10:
      generateMenu10min(addSegment, mainType, testType, stageName)
      break
    case 20:
      generateMenu20min(addSegment, mainType, testType, stageName, direction, stageSessionCount)
      break
    case 30:
      generateMenu30min(addSegment, mainType, testType, stageName, direction, stageSessionCount)
      break
  }

  return segments
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
 * 10分メニュー（合計 600秒）
 * ばらばら(スキップ可) → ステージメイン → 高速読み
 */
function generateMenu10min(
  add: AddSegmentFn,
  mainType: string,
  testType: string,
  stageName: string,
) {
  // 1. ばらばら読み（ウォームアップ、スキップ可能）
  add('barabara', 90, true, 30, 'shunkan_recall', true,
    'ばらばら読み 1.5分 + テスト')

  // 2. ステージメイン高速読みトレーニング（中核）
  add(mainType, 300, true, 30, testType, false,
    `${stageName} 高速読みトレーニング 5分 + テスト`)

  // 3. 高速読み仕上げ
  add('reading_speed', 120, false, 0, null, false,
    '高速読みトレーニング 2分')
}

/**
 * 20分メニュー（合計 1200秒）
 * ばらばら → ステージメイン → 視点移動 → 本読み → めくりよみ → 高速読み仕上げ
 */
function generateMenu20min(
  add: AddSegmentFn,
  mainType: string,
  testType: string,
  stageName: string,
  direction: Direction,
  stageSessionCount: number,
) {
  // 本読みの比重を調整（3回超なら増やす）
  const honYomiSec = stageSessionCount > 3 ? 300 : 180
  const mekuriSec = stageSessionCount > 3 ? 90 : 150

  // 1. ばらばら読み（ウォームアップ）
  add('barabara', 90, true, 30, 'shunkan_recall', true,
    'ばらばら読み 1.5分 + テスト')

  // 2. ステージメイン高速読みトレーニング
  add(mainType, 300, true, 30, testType, false,
    `${stageName} 高速読みトレーニング 5分 + テスト`)

  // 3. 視点移動トレーニング
  add('shiten_ido', 120, false, 0, null, false,
    '視点移動トレーニング 2分')

  // 4. 本読み（ステージ3回超で比重増）
  add('hon_yomi', honYomiSec, true, 60, 'content_comprehension', false,
    `本読み ${Math.round(honYomiSec / 60)}分 + テスト`)

  // 5. めくりよみ
  add('mekuri_yomi', mekuriSec, false, 0, null, false,
    `めくりよみ ${Math.round(mekuriSec / 60 * 10) / 10}分`)

  // 6. 高速読み仕上げ
  add('reading_speed', 120, false, 0, null, false,
    '高速読みトレーニング 2分')
}

/**
 * 30分メニュー（合計 1800秒）
 * ばらばら → ステージメイン(前半) → 視点移動 → 本読み → めくりよみ → ステージメイン(後半) → 高速読み仕上げ
 */
function generateMenu30min(
  add: AddSegmentFn,
  mainType: string,
  testType: string,
  stageName: string,
  direction: Direction,
  stageSessionCount: number,
) {
  const honYomiSec = stageSessionCount > 3 ? 360 : 240
  const mekuriSec = stageSessionCount > 3 ? 120 : 180

  // 1. ばらばら読み（ウォームアップ）
  add('barabara', 120, true, 30, 'shunkan_recall', true,
    'ばらばら読み 2分 + テスト')

  // 2. ステージメイン前半
  add(mainType, 300, true, 30, testType, false,
    `${stageName} 高速読みトレーニング(前半) 5分 + テスト`)

  // 3. 視点移動トレーニング
  add('shiten_ido', 150, false, 0, null, false,
    '視点移動トレーニング 2.5分')

  // 4. 本読み
  add('hon_yomi', honYomiSec, true, 60, 'content_comprehension', false,
    `本読み ${Math.round(honYomiSec / 60)}分 + テスト`)

  // 5. めくりよみ
  add('mekuri_yomi', mekuriSec, false, 0, null, false,
    `めくりよみ ${Math.round(mekuriSec / 60)}分`)

  // 6. ステージメイン後半
  add(mainType, 300, true, 30, testType, false,
    `${stageName} 高速読みトレーニング(後半) 5分 + テスト`)

  // 7. 高速読み仕上げ
  add('reading_speed', 180, false, 0, null, false,
    '高速読みトレーニング 3分')
}
