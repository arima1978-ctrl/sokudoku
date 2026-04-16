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
 * スタート速度の倍率（統一: 80%）
 * 当日のトレーニング前の測定値に対して固定で掛ける
 */
export const START_SPEED_MULTIPLIER = 0.8

/**
 * @deprecated 経過時間に関わらず80%統一に変更。互換のため残すが常に0.8を返す。
 */
export function getMultiplierByElapsedHours(_elapsedHours: number): number {
  return START_SPEED_MULTIPLIER
}

/**
 * スタート速度を計算する（当日の測定（前）×80%）
 * todaysPreWpm: その日のトレーニング開始時に測定した読書スピード（前）
 */
export function calculateStartSpeed(todaysPreWpm: number | null): number {
  if (todaysPreWpm === null || todaysPreWpm <= 0) {
    return DEFAULT_START_WPM
  }
  return Math.floor(todaysPreWpm * START_SPEED_MULTIPLIER)
}

/**
 * @deprecated 旧シグネチャ互換。当日測定値のみで計算するように変更。
 * lastTrainingAt は使用しません（経過時間倍率を廃止したため）。
 */
export function calculateStartSpeedByTime(
  todaysPreWpm: number | null,
  _lastTrainingAt: string | null,
): number {
  return calculateStartSpeed(todaysPreWpm)
}

/**
 * カウント上限 = スタート速度の3倍
 */
export function getCountCap(startWpm: number): number {
  return startWpm * 3
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

/**
 * Excel仕様のステージ構成（視点移動・本読み削除、Stage 3にばらばら復活）
 * Stage 1: ばらばら + 1行瞬間 + 2行瞬間 + 3点高速読み
 * Stage 2: ばらばら + 1行or2行(交互) + 2点高速読み
 * Stage 3: ばらばら + 1行or2行(交互) + 1行高速読み
 * Stage 4: ばらばら + 2行高速読み
 * Stage 5: ばらばら + ブロック高速読み
 */
const STAGE_CONFIGS: Record<CoachStageNumber, StageConfig> = {
  1: { minSessions: 6, segments: ['barabara', '1line', '2line', 'block'] },
  2: { minSessions: 8, segments: ['barabara', '1line_or_2line', 'block'] },
  3: { minSessions: 8, segments: ['barabara', '1line_or_2line', 'block'] },
  4: { minSessions: 8, segments: ['barabara', 'block'] },
  5: { minSessions: 8, segments: ['barabara', 'block'] },
}

// ========== 純粋関数 ==========

/** 頻度に応じた倍率を返す */
export function getFrequencyMultiplier(frequency: TrainingFrequency): number {
  return FREQUENCY_MULTIPLIER[frequency]
}

/**
 * @deprecated 頻度ベースは廃止。当日測定×80%に統一。
 * calculateStartSpeed(todaysPreWpm) を使用してください。
 */
export function calculateStartSpeedLegacy(
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
 * 新仕様: 「縦 → 縦 → 横」の3回サイクル
 * 1回目=たて, 2回目=たて, 3回目=よこ, 4回目=たて, 5回目=たて, 6回目=よこ, ...
 * sessionNumber は 1-indexed（次に実施するセッション番号）
 */
export function getDirectionBySession(sessionNumber: number): Direction {
  const mod = ((sessionNumber - 1) % 3) + 1
  return mod === 3 ? 'yoko' : 'tate'
}

/** @deprecated 縦縦横サイクルに移行したため使用非推奨 */
export function getNextDirection(lastDirection: Direction): Direction {
  return lastDirection === 'tate' ? 'yoko' : 'tate'
}

/**
 * ステージ修了テスト合格のための正答数閾値（6問中4問以上=2問間違いまでOK）
 */
export const FINAL_TEST_PASS_THRESHOLD = 4
export const FINAL_TEST_TOTAL_QUESTIONS = 6

/**
 * 学年別の目標カウント
 */
export const GRADE_TARGET_COUNT: Record<string, number> = {
  'preschool': 200,
  'g1': 200,
  'g2': 200,
  'g3': 200,
  'g4': 220,
  'g5': 220,
  'g6': 220,
  'jh1': 240,
  'jh2': 240,
  'jh3': 240,
  'hs': 240,
  'adult': 240,
}

/**
 * grade_level_id から目標カウントを取得（未知の学年は240をデフォルト）
 */
export function getTargetCount(gradeLevelId: string | null | undefined): number {
  if (!gradeLevelId) return 240
  return GRADE_TARGET_COUNT[gradeLevelId] ?? 240
}

/**
 * 修了テストに挑戦可能か判定
 * 条件: 最低セッション数 + 追加必要回数 を消化していること
 */
export function isEligibleForFinalTest(
  stageSessionCount: number,
  minSessions: number,
  extraSessionsRequired: number = 0,
): boolean {
  return stageSessionCount >= minSessions + extraSessionsRequired
}

/**
 * 修了テストの合否判定
 * 目標カウント以上 かつ 正答数が閾値以上 なら合格
 */
export function isFinalTestPassed(
  achievedCount: number,
  targetCount: number,
  correctCount: number,
): boolean {
  return achievedCount >= targetCount && correctCount >= FINAL_TEST_PASS_THRESHOLD
}

/**
 * @deprecated v2互換のため残す。新仕様では isEligibleForFinalTest + 修了テスト合格フラグ で判定
 */
export const REQUIRED_CLEARS = 5

/**
 * @deprecated v2互換。新仕様は修了テスト制に移行
 */
export function canStageUp(
  stageSessionCount: number,
  _block240Count: number,
  _blockAccuracy90Count: number,
  minSessions: number,
): boolean {
  return stageSessionCount >= minSessions
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

/**
 * Excel仕様の10分コースメニュー
 * Stage 1: ばらばら1.5 + 1行瞬間2 + 2行瞬間2 + 3点高速4.5 = 10分
 * Stage 2: ばらばら1.5 + 1行or2行2 + 2点高速6.5 = 10分
 * Stage 3: ばらばら1.5 + 1行or2行1.5 + 1行高速7 = 10分
 * Stage 4: ばらばら1.5 + 2行高速8.5 = 10分
 * Stage 5: ばらばら1.5 + ブロック高速8.5 = 10分
 */
function getMenu10(stage: CoachStageNumber, _sessionCount: number): SegmentEntry[] {
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
      { segKey: 'block', durationSec: 390, hasTest: true, skippable: false },
    ]
    case 3: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: '1line_or_2line', durationSec: 90, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 420, hasTest: true, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 510, hasTest: true, skippable: false },
    ]
    case 5: return [
      { segKey: 'barabara', durationSec: 90, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 510, hasTest: true, skippable: false },
    ]
  }
}

/**
 * Excel仕様の20分コースメニュー（高速読みは①②のセット）
 * Stage 1: ばらばら2 + 1行3 + 2行3 + 3点高速12 = 20分
 * Stage 2: ばらばら2 + 1行3 + 2行3 + 2点高速12 = 20分
 * Stage 3: ばらばら2 + 1行or2行3 + 1行高速① 6 + 1行高速② 9 = 20分
 * Stage 4: ばらばら2 + 2行高速① 9 + 2行高速② 9 = 20分
 * Stage 5: ばらばら2 + ブロック① 9 + ブロック② 9 = 20分
 */
function getMenu20(stage: CoachStageNumber): SegmentEntry[] {
  switch (stage) {
    case 1: return [
      { segKey: 'barabara', durationSec: 120, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 720, hasTest: true, skippable: false },
    ]
    case 2: return [
      { segKey: 'barabara', durationSec: 120, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 720, hasTest: true, skippable: false },
    ]
    case 3: return [
      { segKey: 'barabara', durationSec: 120, hasTest: true, skippable: true },
      { segKey: '1line_or_2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 360, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 120, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
    ]
    case 5: return [
      { segKey: 'barabara', durationSec: 120, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 540, hasTest: true, skippable: false },
    ]
  }
}

/**
 * Excel仕様の30分コースメニュー（高速読みは①②③のセット）
 * Stage 1: ばらばら3 + 1行3 + 2行3 + 3点高速① 10 + 3点高速② 11 = 30分
 * Stage 2: ばらばら3 + 1行3 + 2行3 + 2点高速① 10 + 2点高速② 11 = 30分
 * Stage 3: ばらばら3 + 1行or2行3 + 1行高速① 12 + 1行高速② 12 = 30分
 * Stage 4: ばらばら3 + 2行高速① 8 + ② 8 + ③ 11 = 30分
 * Stage 5: ばらばら3 + ブロック① 8 + ② 8 + ③ 11 = 30分
 */
function getMenu30(stage: CoachStageNumber): SegmentEntry[] {
  switch (stage) {
    case 1: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 600, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 660, hasTest: true, skippable: false },
    ]
    case 2: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: '1line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: '2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 600, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 660, hasTest: true, skippable: false },
    ]
    case 3: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: '1line_or_2line', durationSec: 180, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 720, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 720, hasTest: true, skippable: false },
    ]
    case 4: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 480, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 480, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 660, hasTest: true, skippable: false },
    ]
    case 5: return [
      { segKey: 'barabara', durationSec: 180, hasTest: true, skippable: true },
      { segKey: 'block', durationSec: 480, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 480, hasTest: true, skippable: false },
      { segKey: 'block', durationSec: 660, hasTest: true, skippable: false },
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
 * @deprecated 本読みトレーニング（スピードモード）は廃止されました。
 * Stage 5 完了後は通常の Stage 5 メニューを継続します。
 * 後方互換のため残していますが、新しい呼び出しには使用しないでください。
 */
export function generateSpeedModeSegments(params: {
  durationMin: DurationMin
  direction: Direction
}): DynamicSegment[] {
  // Stage 5 のメニューを返して互換性を保つ
  const { durationMin, direction } = params
  return generateMenuSegments({
    durationMin,
    stageNumber: 5,
    direction,
    stageSessionCount: 1,
  })
}

/** 秒数を「○分」「○.○分」に変換 */
function formatMin(sec: number): string {
  const min = sec / 60
  if (Number.isInteger(min)) return `${min}分`
  return `${Math.round(min * 10) / 10}分`
}
