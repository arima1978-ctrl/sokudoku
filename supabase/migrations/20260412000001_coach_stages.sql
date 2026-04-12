-- ============================================================
-- コーチステージシステム
-- ============================================================
-- 変更点:
-- 1. coach_stages マスターテーブル（Stage 1-5）
-- 2. students に training_frequency 追加（週1/2/3）
-- 3. student_progress にコーチ用カラム追加
-- 4. evaluate_coach_stage_up() 関数
-- 5. menu_segments に新セグメントタイプ追加
-- 6. initialize_student_progress() 更新
-- ============================================================


-- ========== 1. コーチステージマスター ==========
CREATE TABLE coach_stages (
  id            TEXT PRIMARY KEY,           -- 'stage_1' .. 'stage_5'
  name          TEXT NOT NULL,              -- '3点読み', '2点読み', etc.
  stage_number  INT NOT NULL UNIQUE,        -- 1..5
  description   TEXT,
  segment_types TEXT[] NOT NULL,            -- このステージで使うセグメントタイプ
  min_sessions  INT NOT NULL DEFAULT 5      -- ステージアップに必要な最低セッション数
);

INSERT INTO coach_stages (id, name, stage_number, description, segment_types, min_sessions) VALUES
  ('stage_1', '3点読み',     1, 'ばらばら読みで3つの点を素早く認識する',
    ARRAY['barabara'], 5),
  ('stage_2', '2点読み',     2, '1行の文字列を2つの固視点で読む',
    ARRAY['shunkan_tate_1line', 'shunkan_yoko_1line'], 5),
  ('stage_3', '1行読み',     3, '1行の文字列を一度に読む',
    ARRAY['shunkan_tate_2line', 'shunkan_yoko_2line'], 5),
  ('stage_4', '2行読み',     4, '2行分の文字列をブロックで読む',
    ARRAY['block_tate', 'block_yoko'], 5),
  ('stage_5', 'ブロック読み', 5, '複数行をブロック単位で高速に読む',
    ARRAY['output_tate', 'output_yoko'], 5);


-- ========== 2. students に training_frequency 追加 ==========
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS training_frequency INT NOT NULL DEFAULT 2;

-- CHECK制約を追加（週1/2/3のみ）
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_training_frequency_check;
ALTER TABLE students
  ADD CONSTRAINT students_training_frequency_check
  CHECK (training_frequency IN (1, 2, 3));


-- ========== 3. student_progress にコーチ用カラム追加 ==========
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS coach_stage_id TEXT
    REFERENCES coach_stages(id) DEFAULT 'stage_1';

ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS stage_session_count INT NOT NULL DEFAULT 0;

ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS stage_direction_last TEXT DEFAULT 'yoko';

ALTER TABLE student_progress
  DROP CONSTRAINT IF EXISTS student_progress_stage_direction_check;
ALTER TABLE student_progress
  ADD CONSTRAINT student_progress_stage_direction_check
  CHECK (stage_direction_last IN ('tate', 'yoko'));

ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS fluency_reported BOOLEAN NOT NULL DEFAULT false;


-- ========== 4. menu_segments に新セグメントタイプ追加 ==========
-- 視点移動 / 本読み / めくりよみ をコーチメニューで使用
ALTER TABLE menu_segments DROP CONSTRAINT IF EXISTS menu_segments_segment_type_check;
ALTER TABLE menu_segments ADD CONSTRAINT menu_segments_segment_type_check
  CHECK (segment_type IN (
    'barabara',
    'shunkan_tate_1line', 'shunkan_tate_2line',
    'shunkan_yoko_1line', 'shunkan_yoko_2line',
    'koe_e',
    'block_tate', 'block_yoko',
    'output_tate', 'output_yoko',
    'reading_speed',
    -- 新規: コーチメニュー用
    'shiten_ido',       -- 視点移動トレーニング
    'hon_yomi',         -- 本読み（読書練習）
    'mekuri_yomi'       -- めくりよみ（ページ送り速読）
  ));


-- ========== 5. コーチステージアップ判定関数 ==========
CREATE OR REPLACE FUNCTION evaluate_coach_stage_up(
  p_student_id UUID,
  p_direction TEXT        -- 今回のトレーニング方向 ('tate' or 'yoko')
) RETURNS JSONB AS $$
DECLARE
  v_progress RECORD;
  v_stage RECORD;
  v_next_stage RECORD;
  v_action TEXT := 'maintain';
  v_new_stage_id TEXT;
BEGIN
  -- 現在の進行状況を取得
  SELECT coach_stage_id, stage_session_count, stage_direction_last, fluency_reported
    INTO v_progress
    FROM student_progress
   WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  -- 現在のステージ情報を取得
  SELECT * INTO v_stage FROM coach_stages WHERE id = v_progress.coach_stage_id;

  -- セッションカウント+1、方向を更新
  v_new_stage_id := v_progress.coach_stage_id;

  UPDATE student_progress SET
    stage_session_count = stage_session_count + 1,
    stage_direction_last = p_direction,
    updated_at = now()
  WHERE student_id = p_student_id;

  -- ステージアップ判定:
  -- 条件1: 最低セッション数を満たしている（+1後なので current+1 >= min_sessions）
  -- 条件2: 流暢性が報告されている
  IF (v_progress.stage_session_count + 1) >= v_stage.min_sessions
     AND v_progress.fluency_reported = true THEN

    -- 次のステージを探す
    SELECT * INTO v_next_stage FROM coach_stages
     WHERE stage_number > v_stage.stage_number
     ORDER BY stage_number LIMIT 1;

    IF FOUND THEN
      v_new_stage_id := v_next_stage.id;
      v_action := 'stage_up';

      -- ステージアップ: カウンターリセット
      UPDATE student_progress SET
        coach_stage_id = v_new_stage_id,
        stage_session_count = 0,
        fluency_reported = false,
        updated_at = now()
      WHERE student_id = p_student_id;
    ELSE
      -- 最終ステージ到達済み
      v_action := 'max_stage';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'action', v_action,
    'previous_stage', v_progress.coach_stage_id,
    'new_stage', v_new_stage_id,
    'stage_name', CASE WHEN v_action = 'stage_up' THEN v_next_stage.name ELSE v_stage.name END,
    'session_count', v_progress.stage_session_count + 1,
    'min_sessions', v_stage.min_sessions,
    'fluency_reported', v_progress.fluency_reported
  );
END;
$$ LANGUAGE plpgsql;


-- ========== 6. initialize_student_progress 更新 ==========
CREATE OR REPLACE FUNCTION initialize_student_progress(
  p_student_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (
    student_id, current_phase_id, current_step_id,
    coach_stage_id, stage_session_count, stage_direction_last, fluency_reported
  )
  VALUES (
    p_student_id, 'shunkan', 'shunkan_tate_1line_lv1',
    'stage_1', 0, 'yoko', false
  )
  ON CONFLICT (student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ========== 7. RLS ==========
ALTER TABLE coach_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "マスターデータは全員閲覧可" ON coach_stages
  FOR SELECT TO authenticated USING (true);
