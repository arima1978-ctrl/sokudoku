-- ============================================================
-- メニューセグメント構造の修正
-- 各種目に個別テストを紐付ける（種目→テストのペア構成）
-- テスト正答率90%で次に進む
-- 慣れたらばらばらカット→たて1行からスタート
-- ============================================================

-- 既存セグメントデータをクリア（マスターデータ再投入）
DELETE FROM menu_segments;

-- セグメントにテスト紐付け列を追加
ALTER TABLE menu_segments ADD COLUMN has_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menu_segments ADD COLUMN test_duration_sec INT DEFAULT 0;
ALTER TABLE menu_segments ADD COLUMN test_type TEXT CHECK (test_type IN (
  'shunkan_recall',         -- 瞬間よみ: 表示された文字列を4択で回答
  'content_comprehension',  -- 長文理解: 内容理解4択
  'vocab_check'             -- 語句チェック: 本文にあった言葉を選ぶ
));
-- この種目はスキップ可能か（慣れたら省略される種目）
ALTER TABLE menu_segments ADD COLUMN skippable BOOLEAN NOT NULL DEFAULT false;

-- segment_typeにばらばら読み等を追加
ALTER TABLE menu_segments DROP CONSTRAINT menu_segments_segment_type_check;
ALTER TABLE menu_segments ADD CONSTRAINT menu_segments_segment_type_check
  CHECK (segment_type IN (
    'barabara',                             -- ばらばら読み
    'shunkan_tate_1line', 'shunkan_tate_2line',  -- たて瞬間よみ
    'shunkan_yoko_1line', 'shunkan_yoko_2line',  -- よこ瞬間よみ
    'koe_e',                                -- 声になる/絵になる
    'block_tate', 'block_yoko',             -- ブロックよみ
    'output_tate', 'output_yoko',           -- アウトプット
    'reading_speed'                         -- 読書速度計測
  ));


-- ================================================================
-- Phase 1: 瞬間よみメニュー
-- ================================================================

-- 5分コース: ばらばら→たて1行→たて2行（各+テスト）
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_5min', 1, 'barabara',           90, true, 30, 'shunkan_recall', true,  'ばらばら読み 1.5分 + テスト'),
  ('phase1_5min', 2, 'shunkan_tate_1line', 90, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 1.5分 + テスト'),
  ('phase1_5min', 3, 'shunkan_tate_2line', 30, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 0.5分 + テスト');

-- 10分コース
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_10min', 1, 'barabara',           120, true, 30, 'shunkan_recall', true,  'ばらばら読み 2分 + テスト'),
  ('phase1_10min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2分 + テスト'),
  ('phase1_10min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_10min', 4, 'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト');

-- 15分コース
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_15min', 1, 'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_15min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_15min', 3, 'shunkan_tate_2line', 150, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2.5分 + テスト'),
  ('phase1_15min', 4, 'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2.5分 + テスト'),
  ('phase1_15min', 5, 'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト');

-- 20分コース: 全種目
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_20min', 1, 'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_20min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 3, 'shunkan_tate_2line', 150, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 4, 'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 5, 'shunkan_yoko_2line', 150, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2.5分 + テスト'),
  ('phase1_20min', 6, 'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト');


-- ================================================================
-- Phase 2: ブロックよみメニュー
-- ================================================================

-- 5分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_5min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase2_5min', 2, 'block_tate',         120, true, 40, 'content_comprehension', false, 'たてブロック 2分 + テスト');

-- 10分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_10min', 1, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_10min', 2, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_10min', 3, 'block_tate',         120, true, 60, 'content_comprehension', false, 'たてブロック 2分 + テスト'),
  ('phase2_10min', 4, 'block_yoko',         120, true, 60, 'content_comprehension', false, 'よこブロック 2分 + テスト');

-- 15分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_15min', 1, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_15min', 2, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_15min', 3, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_15min', 4, 'block_yoko',         150, true, 60, 'content_comprehension', false, 'よこブロック 2.5分 + テスト'),
  ('phase2_15min', 5, 'reading_speed',      120, false, 0, NULL,                    false, '読書速度計測 2分');

-- 20分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_20min', 1, 'barabara',           90,  true, 30, 'shunkan_recall',       true,  '復習: ばらばら 1.5分 + テスト'),
  ('phase2_20min', 2, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_20min', 3, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_20min', 4, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_20min', 5, 'block_yoko',         150, true, 60, 'content_comprehension', false, 'よこブロック 2.5分 + テスト'),
  ('phase2_20min', 6, 'reading_speed',      150, false, 0, NULL,                    false, '読書速度計測 2.5分');


-- ================================================================
-- Phase 3: アウトプットメニュー
-- ================================================================

-- 5分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_5min', 1, 'block_tate',   60,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1分 + テスト'),
  ('phase3_5min', 2, 'output_tate', 120,  true, 60, 'vocab_check',           false, 'たてアウトプット 2分 + テスト');

-- 10分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_10min', 1, 'block_tate',   90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_10min', 2, 'block_yoko',   90,  true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_10min', 3, 'output_tate', 120,  true, 60, 'vocab_check',           false, 'たてアウトプット 2分 + テスト'),
  ('phase3_10min', 4, 'output_yoko', 120,  true, 60, 'vocab_check',           false, 'よこアウトプット 2分 + テスト');

-- 15分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_15min', 1, 'block_tate',    90, true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_15min', 2, 'block_yoko',    90, true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_15min', 3, 'output_tate',  120, true, 60, 'vocab_check',           false, 'たてアウトプット 2分 + テスト'),
  ('phase3_15min', 4, 'output_yoko',  120, true, 60, 'vocab_check',           false, 'よこアウトプット 2分 + テスト'),
  ('phase3_15min', 5, 'reading_speed',150, false, 0, NULL,                    false, '読書速度計測 2.5分');

-- 20分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_20min', 1, 'shunkan_tate_1line', 60, true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase3_20min', 2, 'block_tate',         90, true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_20min', 3, 'block_yoko',         90, true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_20min', 4, 'output_tate',       150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_20min', 5, 'output_yoko',       150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト'),
  ('phase3_20min', 6, 'reading_speed',     180, false, 0, NULL,                    false, '読書速度計測 3分');


-- ================================================================
-- training_testsにセグメント紐付けを追加
-- ================================================================
ALTER TABLE training_tests ADD COLUMN segment_id UUID REFERENCES menu_segments(id);
ALTER TABLE training_tests ADD COLUMN segment_type TEXT;


-- ================================================================
-- ステップアップ判定を90%基準に変更
-- + スキップ可能種目の自動判定
-- ================================================================
CREATE OR REPLACE FUNCTION evaluate_step_up(
  p_student_id UUID,
  p_accuracy_pct NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_progress student_progress%ROWTYPE;
  v_current_step training_steps%ROWTYPE;
  v_next_step training_steps%ROWTYPE;
  v_next_phase_step training_steps%ROWTYPE;
  v_action TEXT := 'maintain';
  v_new_step_id TEXT;
  v_new_phase_id TEXT;
BEGIN
  SELECT * INTO v_progress FROM student_progress WHERE student_id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'not_found');
  END IF;

  SELECT * INTO v_current_step FROM training_steps WHERE id = v_progress.current_step_id;

  -- カウンター更新（90%基準）
  IF p_accuracy_pct >= 90 THEN
    v_progress.consecutive_pass_count := v_progress.consecutive_pass_count + 1;
    v_progress.consecutive_fail_count := 0;
  ELSIF p_accuracy_pct >= 60 THEN
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_fail_count := 0;
  ELSE
    v_progress.consecutive_pass_count := 0;
    v_progress.consecutive_fail_count := v_progress.consecutive_fail_count + 1;
  END IF;

  v_new_step_id := v_progress.current_step_id;
  v_new_phase_id := v_progress.current_phase_id;

  -- 90%以上 → 次のステップへ（即時進行）
  IF p_accuracy_pct >= 90 THEN
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
    consecutive_excellent = 0,
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
    'accuracy_pct', p_accuracy_pct
  );
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- skippable種目の自動スキップ判定
-- その種目のテスト正答率が直近3回とも90%以上 → スキップ可能
-- ================================================================
CREATE OR REPLACE FUNCTION should_skip_segment(
  p_student_id UUID,
  p_segment_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_recent_accuracy NUMERIC[];
  v_all_above_90 BOOLEAN;
BEGIN
  SELECT ARRAY_AGG(accuracy_pct ORDER BY completed_at DESC)
    INTO v_recent_accuracy
    FROM (
      SELECT accuracy_pct, completed_at
        FROM training_tests
       WHERE student_id = p_student_id
         AND segment_type = p_segment_type
       ORDER BY completed_at DESC
       LIMIT 3
    ) sub;

  -- 3回未満 → スキップ不可
  IF v_recent_accuracy IS NULL OR array_length(v_recent_accuracy, 1) < 3 THEN
    RETURN false;
  END IF;

  -- 全て90%以上ならスキップ可能
  v_all_above_90 := true;
  FOR i IN 1..3 LOOP
    IF v_recent_accuracy[i] < 90 THEN
      v_all_above_90 := false;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_all_above_90;
END;
$$ LANGUAGE plpgsql;
