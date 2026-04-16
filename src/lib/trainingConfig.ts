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
  /** UIフォント */
  family: '"Noto Sans JP", "Yu Gothic", "游ゴシック", sans-serif',
  /** 太さ */
  weight: 500,
}

/** 問題文用フォント（元システム: HG教科書体） */
export const QUESTION_FONT = {
  family: '"HG教科書体", "UD デジタル 教科書体 NK-R", "Noto Sans JP", serif',
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
  /** 表示時間（ms）- 元システム: 300ms */
  showMs: 300,
  /** カウントダウン1ステップ（ms）- 元システム: 1000ms */
  countdownStepMs: 1000,
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
  /** 散布半径（px）- 元システム: translate(0, -200px) */
  radiusPx: 200,
  /** 文字サイズ（rem）- 元システム: 12rem */
  fontSizeRem: 12,
} as const

/** ブロックよみ設定（元システム training.js 由来） */
export const BLOCK_CONFIG = {
  /** たて1行最大文字数 */
  verticalSplitWord: 24,
  /** よこ1行最大文字数 */
  horizontalSplitWord: 30,
  /** たて最大行数 */
  verticalMaxRow: 11,
  /** よこ最大行数 */
  horizontalMaxRow: 9,
  /** カウント初期値 */
  countMin: 60 as number,
}

/**
 * カウント自動上昇ルール
 * 8カウントごとに+1ずつ緩やかに上昇する。
 * 60 →(8回)→ 61 →(8回)→ 62 → ... → スタート速度×3（上限）
 * 上限に達したらそのスピードを維持する。
 */
export const COUNT_AUTO = {
  /** 何カウントで次の速度に上がるか */
  beatsPerStep: 8,
  /** 1回の上昇幅 */
  stepSize: 1,
  /** 上限倍率（スタート速度 × この値） */
  capMultiplier: 3,
} as const

/**
 * カウント上限を計算する
 * startWpm: トレーニング開始時のスタート速度
 */
export function getCountCap(startWpm: number): number {
  return Math.floor(startWpm * COUNT_AUTO.capMultiplier)
}

/**
 * 学年別カウント目標（ステージアップ条件）
 * 幼児〜小3: 200カウント
 * 小4〜小6: 220カウント
 * 中学生以上: 240カウント
 */
export function getCountTarget(gradeLevelId: string | null): number {
  switch (gradeLevelId) {
    case 'preschool':
    case 'g1':
    case 'g2':
    case 'g3':
      return 200
    case 'g4':
    case 'g5':
    case 'g6':
      return 220
    case 'jh':
    case 'hs':
    default:
      return 240
  }
}

/** マーカーハイライト色 */
export const MARKER_HIGHLIGHT = '#ffe5e5' as const
