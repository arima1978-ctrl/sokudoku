-- ============================================================
-- トレーニングエンジン
-- ============================================================
-- 13. training_phases     : フェーズマスター（瞬間/ブロック/アウトプット）
-- 14. training_steps      : ステップマスター（各フェーズ内の段階）
-- 15. training_menus      : 時間別メニュー定義（5/10/15/20分）
-- 16. menu_segments       : メニュー内のセグメント（何を何分やるか）
-- 17. training_sessions   : トレーニング実施記録
-- 18. training_tests      : トレーニング後のテスト結果
-- 19. student_progress    : 生徒の進行状況（適応エンジン中核）
-- ============================================================


-- ========== 13. フェーズマスター ==========
CREATE TABLE training_phases (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  display_order INT NOT NULL,
  phase_number  INT NOT NULL                     -- 1, 2, 3
);

INSERT INTO training_phases (id, name, description, display_order, phase_number) VALUES
  ('shunkan',  '瞬間よみ',     '短い文字列を瞬間的に認識する力をつける', 1, 1),
  ('block',    'ブロックよみ',  '文章をブロック単位で高速に読む力をつける', 2, 2),
  ('output',   'アウトプット',  '読んだ内容を記憶・再現する力をつける',   3, 3);


-- ========== 14. ステップマスター ==========
-- 各フェーズ内の具体的な段階
CREATE TABLE training_steps (
  id              TEXT PRIMARY KEY,
  phase_id        TEXT NOT NULL REFERENCES training_phases(id),
  name            TEXT NOT NULL,
  description     TEXT,
  display_order   INT NOT NULL,

  -- 瞬間よみ固有
  direction       TEXT CHECK (direction IN ('tate', 'yoko')),  -- たて/よこ
  line_type       TEXT CHECK (line_type IN ('1line', '2line')),

  -- ブロックよみ/アウトプット固有
  block_count     INT,                           -- 1行のブロック数
  count_speed     TEXT,                          -- '4','3','2','auto'

  -- 共通
  level           INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  required_grade_level_id TEXT REFERENCES grade_levels(id)  -- この学年の漢字レベル
);

-- Phase 1: 瞬間よみステップ（たて → よこ、各レベル1〜3）
INSERT INTO training_steps (id, phase_id, name, direction, line_type, level, display_order) VALUES
  ('shunkan_tate_1line_lv1', 'shunkan', 'たて1行瞬間よみ Lv1', 'tate', '1line', 1,  1),
  ('shunkan_tate_1line_lv2', 'shunkan', 'たて1行瞬間よみ Lv2', 'tate', '1line', 2,  2),
  ('shunkan_tate_1line_lv3', 'shunkan', 'たて1行瞬間よみ Lv3', 'tate', '1line', 3,  3),
  ('shunkan_tate_2line_lv1', 'shunkan', 'たて2行瞬間よみ Lv1', 'tate', '2line', 1,  4),
  ('shunkan_tate_2line_lv2', 'shunkan', 'たて2行瞬間よみ Lv2', 'tate', '2line', 2,  5),
  ('shunkan_tate_2line_lv3', 'shunkan', 'たて2行瞬間よみ Lv3', 'tate', '2line', 3,  6),
  ('shunkan_yoko_1line_lv1', 'shunkan', 'よこ1行瞬間よみ Lv1', 'yoko', '1line', 1,  7),
  ('shunkan_yoko_1line_lv2', 'shunkan', 'よこ1行瞬間よみ Lv2', 'yoko', '1line', 2,  8),
  ('shunkan_yoko_1line_lv3', 'shunkan', 'よこ1行瞬間よみ Lv3', 'yoko', '1line', 3,  9),
  ('shunkan_yoko_2line_lv1', 'shunkan', 'よこ2行瞬間よみ Lv1', 'yoko', '2line', 1, 10),
  ('shunkan_yoko_2line_lv2', 'shunkan', 'よこ2行瞬間よみ Lv2', 'yoko', '2line', 2, 11),
  ('shunkan_yoko_2line_lv3', 'shunkan', 'よこ2行瞬間よみ Lv3', 'yoko', '2line', 3, 12);

-- Phase 2: ブロックよみステップ（たて → よこ、速さ4→3→2→自動）
INSERT INTO training_steps (id, phase_id, name, direction, level, block_count, count_speed, display_order) VALUES
  ('block_tate_lv1_sp4',  'block', 'たてブロック Lv1 速さ4', 'tate', 1, NULL, '4',    1),
  ('block_tate_lv1_sp3',  'block', 'たてブロック Lv1 速さ3', 'tate', 1, NULL, '3',    2),
  ('block_tate_lv1_sp2',  'block', 'たてブロック Lv1 速さ2', 'tate', 1, NULL, '2',    3),
  ('block_tate_lv1_auto', 'block', 'たてブロック Lv1 自動',  'tate', 1, NULL, 'auto', 4),
  ('block_tate_lv2_sp4',  'block', 'たてブロック Lv2 速さ4', 'tate', 2, NULL, '4',    5),
  ('block_tate_lv2_sp3',  'block', 'たてブロック Lv2 速さ3', 'tate', 2, NULL, '3',    6),
  ('block_tate_lv2_sp2',  'block', 'たてブロック Lv2 速さ2', 'tate', 2, NULL, '2',    7),
  ('block_tate_lv2_auto', 'block', 'たてブロック Lv2 自動',  'tate', 2, NULL, 'auto', 8),
  ('block_tate_lv3_sp4',  'block', 'たてブロック Lv3 速さ4', 'tate', 3, NULL, '4',    9),
  ('block_tate_lv3_sp3',  'block', 'たてブロック Lv3 速さ3', 'tate', 3, NULL, '3',   10),
  ('block_tate_lv3_sp2',  'block', 'たてブロック Lv3 速さ2', 'tate', 3, NULL, '2',   11),
  ('block_tate_lv3_auto', 'block', 'たてブロック Lv3 自動',  'tate', 3, NULL, 'auto',12),
  ('block_yoko_lv1_sp4',  'block', 'よこブロック Lv1 速さ4', 'yoko', 1, NULL, '4',   13),
  ('block_yoko_lv1_sp3',  'block', 'よこブロック Lv1 速さ3', 'yoko', 1, NULL, '3',   14),
  ('block_yoko_lv1_sp2',  'block', 'よこブロック Lv1 速さ2', 'yoko', 1, NULL, '2',   15),
  ('block_yoko_lv1_auto', 'block', 'よこブロック Lv1 自動',  'yoko', 1, NULL, 'auto',16),
  ('block_yoko_lv2_sp4',  'block', 'よこブロック Lv2 速さ4', 'yoko', 2, NULL, '4',   17),
  ('block_yoko_lv2_sp3',  'block', 'よこブロック Lv2 速さ3', 'yoko', 2, NULL, '3',   18),
  ('block_yoko_lv2_sp2',  'block', 'よこブロック Lv2 速さ2', 'yoko', 2, NULL, '2',   19),
  ('block_yoko_lv2_auto', 'block', 'よこブロック Lv2 自動',  'yoko', 2, NULL, 'auto',20),
  ('block_yoko_lv3_sp4',  'block', 'よこブロック Lv3 速さ4', 'yoko', 3, NULL, '4',   21),
  ('block_yoko_lv3_sp3',  'block', 'よこブロック Lv3 速さ3', 'yoko', 3, NULL, '3',   22),
  ('block_yoko_lv3_sp2',  'block', 'よこブロック Lv3 速さ2', 'yoko', 3, NULL, '2',   23),
  ('block_yoko_lv3_auto', 'block', 'よこブロック Lv3 自動',  'yoko', 3, NULL, 'auto',24);

-- Phase 3: アウトプットステップ
INSERT INTO training_steps (id, phase_id, name, direction, level, count_speed, display_order) VALUES
  ('output_tate_lv1', 'output', 'たてアウトプット Lv1', 'tate', 1, 'auto', 1),
  ('output_tate_lv2', 'output', 'たてアウトプット Lv2', 'tate', 2, 'auto', 2),
  ('output_tate_lv3', 'output', 'たてアウトプット Lv3', 'tate', 3, 'auto', 3),
  ('output_yoko_lv1', 'output', 'よこアウトプット Lv1', 'yoko', 1, 'auto', 4),
  ('output_yoko_lv2', 'output', 'よこアウトプット Lv2', 'yoko', 2, 'auto', 5),
  ('output_yoko_lv3', 'output', 'よこアウトプット Lv3', 'yoko', 3, 'auto', 6);


-- ========== 15. 時間別メニュー定義 ==========
CREATE TABLE training_menus (
  id              TEXT PRIMARY KEY,              -- 例: 'phase1_5min'
  phase_id        TEXT NOT NULL REFERENCES training_phases(id),
  duration_min    INT NOT NULL CHECK (duration_min IN (5, 10, 15, 20)),
  name            TEXT NOT NULL,
  description     TEXT
);

-- Phase 1 メニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase1_5min',  'shunkan', 5,  '瞬間よみ 5分',  '瞬間よみ(3.5分) + テスト(1.5分)'),
  ('phase1_10min', 'shunkan', 10, '瞬間よみ 10分', '瞬間よみ(7分) + テスト(3分)'),
  ('phase1_15min', 'shunkan', 15, '瞬間よみ 15分', '瞬間よみ(11分) + テスト(4分)'),
  ('phase1_20min', 'shunkan', 20, '瞬間よみ 20分', '瞬間よみ(15分) + テスト(5分)');

-- Phase 2 メニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase2_5min',  'block', 5,  'ブロックよみ 5分',  '復習(2分) + ブロック(2分) + テスト(1分)'),
  ('phase2_10min', 'block', 10, 'ブロックよみ 10分', '復習(3分) + ブロック(4分) + テスト(3分)'),
  ('phase2_15min', 'block', 15, 'ブロックよみ 15分', '復習(4分) + ブロック(7分) + テスト(4分)'),
  ('phase2_20min', 'block', 20, 'ブロックよみ 20分', '復習(5分) + ブロック(9分) + 読書計測(3分) + テスト(3分)');

-- Phase 3 メニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase3_5min',  'output', 5,  'アウトプット 5分',  '復習(2分) + アウトプット(2分) + テスト(1分)'),
  ('phase3_10min', 'output', 10, 'アウトプット 10分', '復習(3分) + アウトプット(4分) + テスト(3分)'),
  ('phase3_15min', 'output', 15, 'アウトプット 15分', '復習(3分) + アウトプット(5分) + 読書計測(3分) + テスト(4分)'),
  ('phase3_20min', 'output', 20, 'アウトプット 20分', '復習(4分) + アウトプット(6分) + 読書計測(4分) + テスト(6分)');


-- ========== 16. メニュー内セグメント ==========
CREATE TABLE menu_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id       TEXT NOT NULL REFERENCES training_menus(id) ON DELETE CASCADE,
  segment_order INT NOT NULL,
  segment_type  TEXT NOT NULL CHECK (segment_type IN (
    'shunkan_tate', 'shunkan_yoko',        -- 瞬間よみ
    'block_tate', 'block_yoko',             -- ブロックよみ
    'output_tate', 'output_yoko',           -- アウトプット
    'review',                               -- 前フェーズの復習
    'reading_speed',                        -- 読書速度計測
    'test'                                  -- テスト
  )),
  duration_sec  INT NOT NULL,                -- このセグメントの時間（秒）
  description   TEXT,

  UNIQUE (menu_id, segment_order)
);

-- Phase 1: 5分メニューのセグメント例
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase1_5min', 1, 'shunkan_tate', 105, 'たて瞬間よみ 1.5分'),
  ('phase1_5min', 2, 'shunkan_yoko', 105, 'よこ瞬間よみ 1.5分'),
  ('phase1_5min', 3, 'test',          90, 'テスト 1.5分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase1_10min', 1, 'shunkan_tate', 210, 'たて瞬間よみ 3.5分'),
  ('phase1_10min', 2, 'shunkan_yoko', 210, 'よこ瞬間よみ 3.5分'),
  ('phase1_10min', 3, 'test',         180, 'テスト 3分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase1_15min', 1, 'shunkan_tate', 330, 'たて瞬間よみ 5.5分'),
  ('phase1_15min', 2, 'shunkan_yoko', 330, 'よこ瞬間よみ 5.5分'),
  ('phase1_15min', 3, 'test',         240, 'テスト 4分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase1_20min', 1, 'shunkan_tate', 450, 'たて瞬間よみ 7.5分'),
  ('phase1_20min', 2, 'shunkan_yoko', 450, 'よこ瞬間よみ 7.5分'),
  ('phase1_20min', 3, 'test',         300, 'テスト 5分');

-- Phase 2: セグメント
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase2_5min', 1, 'review',      120, '瞬間よみ復習 2分'),
  ('phase2_5min', 2, 'block_tate',  120, 'たてブロック 2分'),
  ('phase2_5min', 3, 'test',         60, 'テスト 1分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase2_10min', 1, 'review',      180, '瞬間よみ復習 3分'),
  ('phase2_10min', 2, 'block_tate',  120, 'たてブロック 2分'),
  ('phase2_10min', 3, 'block_yoko',  120, 'よこブロック 2分'),
  ('phase2_10min', 4, 'test',        180, 'テスト 3分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase2_15min', 1, 'review',      240, '瞬間よみ復習 4分'),
  ('phase2_15min', 2, 'block_tate',  210, 'たてブロック 3.5分'),
  ('phase2_15min', 3, 'block_yoko',  210, 'よこブロック 3.5分'),
  ('phase2_15min', 4, 'test',        240, 'テスト 4分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase2_20min', 1, 'review',       300, '瞬間よみ復習 5分'),
  ('phase2_20min', 2, 'block_tate',   270, 'たてブロック 4.5分'),
  ('phase2_20min', 3, 'block_yoko',   270, 'よこブロック 4.5分'),
  ('phase2_20min', 4, 'reading_speed',180, '読書速度計測 3分'),
  ('phase2_20min', 5, 'test',         180, 'テスト 3分');

-- Phase 3: セグメント
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase3_5min', 1, 'review',       120, 'ブロックよみ復習 2分'),
  ('phase3_5min', 2, 'output_tate',  120, 'たてアウトプット 2分'),
  ('phase3_5min', 3, 'test',          60, 'テスト 1分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase3_10min', 1, 'review',       180, 'ブロックよみ復習 3分'),
  ('phase3_10min', 2, 'output_tate',  120, 'たてアウトプット 2分'),
  ('phase3_10min', 3, 'output_yoko',  120, 'よこアウトプット 2分'),
  ('phase3_10min', 4, 'test',         180, 'テスト 3分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase3_15min', 1, 'review',        180, 'ブロックよみ復習 3分'),
  ('phase3_15min', 2, 'output_tate',   150, 'たてアウトプット 2.5分'),
  ('phase3_15min', 3, 'output_yoko',   150, 'よこアウトプット 2.5分'),
  ('phase3_15min', 4, 'reading_speed', 180, '読書速度計測 3分'),
  ('phase3_15min', 5, 'test',          240, 'テスト 4分');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, description) VALUES
  ('phase3_20min', 1, 'review',        240, 'ブロックよみ復習 4分'),
  ('phase3_20min', 2, 'output_tate',   180, 'たてアウトプット 3分'),
  ('phase3_20min', 3, 'output_yoko',   180, 'よこアウトプット 3分'),
  ('phase3_20min', 4, 'reading_speed', 240, '読書速度計測 4分'),
  ('phase3_20min', 5, 'test',          360, 'テスト 6分');


-- ========== 17. トレーニング実施記録 ==========
CREATE TABLE training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  menu_id         TEXT NOT NULL REFERENCES training_menus(id),
  step_id         TEXT NOT NULL REFERENCES training_steps(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  segment_results JSONB DEFAULT '[]',            -- 各セグメントの結果
  reading_wpm     INT,                           -- 読書速度計測結果
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_sessions_student ON training_sessions (student_id, started_at DESC);
CREATE INDEX idx_training_sessions_step    ON training_sessions (step_id);


-- ========== 18. トレーニング後テスト結果 ==========
CREATE TABLE training_tests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id   UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_type             TEXT NOT NULL CHECK (test_type IN (
    'shunkan_recall',       -- 瞬間よみ: 表示された文字列を選ぶ
    'content_comprehension',-- 長文理解: 4択内容理解
    'vocab_check'           -- 語句チェック: 本文にあった言葉を選ぶ
  )),
  total_questions       INT NOT NULL,
  correct_count         INT NOT NULL,
  accuracy_pct          NUMERIC(5,2) NOT NULL,
  answers               JSONB NOT NULL DEFAULT '[]',
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_tests_session ON training_tests (training_session_id);
CREATE INDEX idx_training_tests_student ON training_tests (student_id, completed_at DESC);


-- ========== 19. 生徒の進行状況 ==========
CREATE TABLE student_progress (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  current_phase_id        TEXT NOT NULL REFERENCES training_phases(id) DEFAULT 'shunkan',
  current_step_id         TEXT NOT NULL REFERENCES training_steps(id) DEFAULT 'shunkan_tate_1line_lv1',

  -- ステップアップ判定用カウンター
  consecutive_pass_count  INT NOT NULL DEFAULT 0, -- 連続合格回数（80%以上）
  consecutive_fail_count  INT NOT NULL DEFAULT 0, -- 連続不合格回数（60%未満）
  consecutive_excellent   INT NOT NULL DEFAULT 0, -- 連続優秀回数（90%以上）

  -- 累計統計
  total_training_count    INT NOT NULL DEFAULT 0,
  total_training_min      INT NOT NULL DEFAULT 0, -- 合計トレーニング時間（分）
  avg_accuracy_pct        NUMERIC(5,2),
  best_wpm                INT,
  latest_wpm              INT,

  -- タイムスタンプ
  last_training_at        TIMESTAMPTZ,
  phase_started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  step_started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id)
);

CREATE INDEX idx_student_progress_phase ON student_progress (current_phase_id);
CREATE INDEX idx_student_progress_step  ON student_progress (current_step_id);


-- ========== ステップアップ判定関数 ==========
-- テスト結果を受けて、生徒の進行状況を自動更新する
CREATE OR REPLACE FUNCTION evaluate_step_up(
  p_student_id UUID,
  p_accuracy_pct NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_progress student_progress%ROWTYPE;
  v_current_step training_steps%ROWTYPE;
  v_next_step training_steps%ROWTYPE;
  v_next_phase_step training_steps%ROWTYPE;
  v_action TEXT := 'maintain';  -- 'step_up', 'step_up_2x', 'step_down', 'phase_up', 'maintain'
  v_new_step_id TEXT;
  v_new_phase_id TEXT;
BEGIN
  -- 現在の進行状況を取得
  SELECT * INTO v_progress FROM student_progress WHERE student_id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  SELECT * INTO v_current_step FROM training_steps WHERE id = v_progress.current_step_id;

  -- カウンター更新
  IF p_accuracy_pct >= 90 THEN
    v_progress.consecutive_pass_count := v_progress.consecutive_pass_count + 1;
    v_progress.consecutive_excellent := v_progress.consecutive_excellent + 1;
    v_progress.consecutive_fail_count := 0;
  ELSIF p_accuracy_pct >= 80 THEN
    v_progress.consecutive_pass_count := v_progress.consecutive_pass_count + 1;
    v_progress.consecutive_excellent := 0;
    v_progress.consecutive_fail_count := 0;
  ELSIF p_accuracy_pct >= 60 THEN
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_excellent := 0;
    v_progress.consecutive_fail_count := 0;
  ELSE
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_excellent := 0;
    v_progress.consecutive_fail_count := v_progress.consecutive_fail_count + 1;
  END IF;

  -- 判定ロジック
  v_new_step_id := v_progress.current_step_id;
  v_new_phase_id := v_progress.current_phase_id;

  -- 90%以上 × 2回連続 → 2段階UP
  IF v_progress.consecutive_excellent >= 2 THEN
    -- 2つ先のステップを探す
    SELECT * INTO v_next_step FROM training_steps
      WHERE phase_id = v_current_step.phase_id
        AND display_order > v_current_step.display_order
      ORDER BY display_order LIMIT 1 OFFSET 1;

    IF FOUND THEN
      v_new_step_id := v_next_step.id;
      v_action := 'step_up_2x';
    ELSE
      -- フェーズ内最終 → 次フェーズへ
      SELECT * INTO v_next_phase_step FROM training_steps ts
        JOIN training_phases tp ON ts.phase_id = tp.id
        WHERE tp.phase_number > (SELECT phase_number FROM training_phases WHERE id = v_current_step.phase_id)
        ORDER BY tp.phase_number, ts.display_order LIMIT 1;
      IF FOUND THEN
        v_new_step_id := v_next_phase_step.id;
        v_new_phase_id := v_next_phase_step.phase_id;
        v_action := 'phase_up';
      END IF;
    END IF;

  -- 80%以上 × 3回連続 → 1段階UP
  ELSIF v_progress.consecutive_pass_count >= 3 THEN
    SELECT * INTO v_next_step FROM training_steps
      WHERE phase_id = v_current_step.phase_id
        AND display_order > v_current_step.display_order
      ORDER BY display_order LIMIT 1;

    IF FOUND THEN
      v_new_step_id := v_next_step.id;
      v_action := 'step_up';
    ELSE
      -- フェーズ内最終 → 次フェーズへ
      SELECT * INTO v_next_phase_step FROM training_steps ts
        JOIN training_phases tp ON ts.phase_id = tp.id
        WHERE tp.phase_number > (SELECT phase_number FROM training_phases WHERE id = v_current_step.phase_id)
        ORDER BY tp.phase_number, ts.display_order LIMIT 1;
      IF FOUND THEN
        v_new_step_id := v_next_phase_step.id;
        v_new_phase_id := v_next_phase_step.phase_id;
        v_action := 'phase_up';
      END IF;
    END IF;

  -- 60%未満 × 2回連続 → 1段階DOWN
  ELSIF v_progress.consecutive_fail_count >= 2 THEN
    SELECT * INTO v_next_step FROM training_steps
      WHERE phase_id = v_current_step.phase_id
        AND display_order < v_current_step.display_order
      ORDER BY display_order DESC LIMIT 1;

    IF FOUND THEN
      v_new_step_id := v_next_step.id;
      v_action := 'step_down';
    END IF;
  END IF;

  -- 進行状況を更新
  UPDATE student_progress SET
    current_phase_id = v_new_phase_id,
    current_step_id = v_new_step_id,
    consecutive_pass_count = CASE WHEN v_action != 'maintain' THEN 0 ELSE v_progress.consecutive_pass_count END,
    consecutive_fail_count = CASE WHEN v_action != 'maintain' THEN 0 ELSE v_progress.consecutive_fail_count END,
    consecutive_excellent = CASE WHEN v_action != 'maintain' THEN 0 ELSE v_progress.consecutive_excellent END,
    total_training_count = v_progress.total_training_count + 1,
    last_training_at = now(),
    step_started_at = CASE WHEN v_action != 'maintain' THEN now() ELSE v_progress.step_started_at END,
    phase_started_at = CASE WHEN v_action = 'phase_up' THEN now() ELSE v_progress.phase_started_at END,
    updated_at = now()
  WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'action', v_action,
    'previous_step', v_progress.current_step_id,
    'new_step', v_new_step_id,
    'previous_phase', v_progress.current_phase_id,
    'new_phase', v_new_phase_id,
    'accuracy_pct', p_accuracy_pct,
    'consecutive_pass', v_progress.consecutive_pass_count,
    'consecutive_fail', v_progress.consecutive_fail_count
  );
END;
$$ LANGUAGE plpgsql;


-- ========== RLS ==========
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "マスターデータは全員閲覧可" ON training_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "マスターデータは全員閲覧可" ON training_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "マスターデータは全員閲覧可" ON training_menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "マスターデータは全員閲覧可" ON menu_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "管理者は全操作可能" ON training_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "管理者は全操作可能" ON training_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "管理者は全操作可能" ON student_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ========== updated_atトリガー ==========
CREATE TRIGGER trg_student_progress_updated_at
  BEFORE UPDATE ON student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== YouTubeガイド動画リンク ==========
ALTER TABLE training_phases ADD COLUMN guide_video_url TEXT;

UPDATE training_phases SET guide_video_url = 'https://www.youtube.com/playlist?list=PL6Nu1tyiV65LM_NwvY9UN5sR8153iQW4M'
WHERE id IN ('shunkan', 'block', 'output');
