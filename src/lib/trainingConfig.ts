/**
 * トレーニング表示設定
 * 既存「100万人の速読」システム準拠
 *
 * フォント: Noto Sans JP（既存システムのGoogle Fonts設定）
 * カラー: --color-primary: #0084E8, --color-danger: #dd4b39
 * ヘッダー: グラデーション #1478C3 → #00345B
 * たてブロック1行最大文字数: 24（training.js L26）
 * よこブロック1行最大文字数: 30（training.js L27）
 */

export const TRAINING_FONT = {
  /** メインフォント（既存システム: Noto Sans JP） */
  family: '"Noto Sans JP", "Yu Gothic", "游ゴシック", sans-serif',
  /** 太さ */
  weight: 500,
}

/** 種目別の文字サイズ（px）- スクリーンショットから計測 */
export const FONT_SIZES = {
  /** ばらばら: 各文字が大きく散布（画面幅の約13%） */
  barabara: 96,
  /** たて1行: 縦書き大文字 */
  tate_1line: 72,
  /** たて2行: 2列なのでやや小さく */
  tate_2line: 48,
  /** よこ1行 */
  yoko_1line: 56,
  /** よこ2行 */
  yoko_2line: 40,
} as const

/** 表示エリア設定 */
export const DISPLAY_AREA = {
  /** 最小高さ（px） */
  minHeight: 480,
  /** アスペクト比に近い正方形 */
  aspectRatio: '4 / 3',
  /** 内部パディング */
  padding: 32,
} as const

/** フラッシュ設定 */
export const FLASH_TIMING = {
  /** 表示時間（ms） */
  showMs: 800,
  /** 表示間隔（ms）- 表示→非表示→次の表示 */
  intervalMs: 2500,
} as const

/** 解答バーの色（既存システム: --color-danger: #dd4b39） */
export const ANSWER_BAR = {
  labelBg: '#dd4b39',
  labelText: '#FFFFFF',
  answerText: '#dd4b39',
  border: '#dd4b39',
} as const

/** 画面カラー（既存システムCSS変数から） */
export const SCREEN_COLORS = {
  /** 全体背景（水色） */
  bgGradient: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)',
  /** 表示エリア背景 */
  displayBg: '#FFFFFF',
  /** ヘッダーグラデーション */
  headerGradient: 'linear-gradient(90deg, #1478C3 0%, #00345B 100%)',
  /** プライマリカラー */
  primary: '#0084E8',
  /** テキストカラー */
  text: '#2A3944',
} as const

/** ばらばら配置の設定 */
export const BARABARA_CONFIG = {
  /** 散布半径（表示エリアの%）- 文字数に関係なく固定 */
  radius: 32,
  /** 文字の回転角度範囲（±度）- 0で全文字正立 */
  rotationRange: 0,
} as const

/** たてブロック設定（training.js由来） */
export const BLOCK_CONFIG = {
  /** たて1行最大文字数 */
  verticalSplitWord: 24,
  /** よこ1行最大文字数 */
  horizontalSplitWord: 30,
  /** カウント初期値 */
  countMin: 60,
  /** カウント最大値 */
  countMax: 260,
  /** カウント増減値 */
  countSpan: 20,
} as const
