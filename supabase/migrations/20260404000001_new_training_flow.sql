-- ============================================================
-- 新トレーニングフロー対応マイグレーション
-- ============================================================
-- 変更点:
-- 1. students に preferred_subject_id (学習ジャンル) 追加
-- 2. training_menus を 7/15/30分 に変更
-- 3. menu_segments を新フローに合わせて再構成
-- 4. speed_measurements テーブル追加 (トレーニング前後の速度計測)
-- 5. daily_sessions テーブル追加 (1日のトレーニング単位)
-- 6. parent_notifications テーブル追加
-- 7. students に parent_email / parent_line_id 追加
-- ============================================================


-- ========== 1. students に学習ジャンル・保護者連絡先追加 ==========
ALTER TABLE students ADD COLUMN IF NOT EXISTS preferred_subject_id TEXT REFERENCES subjects(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_line_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;


-- ========== 2. 1日のトレーニング単位 ==========
-- 速度計測(前) → トレーニング → 速度計測(後) を1つのdaily_sessionとして管理
CREATE TABLE daily_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min    INT NOT NULL CHECK (duration_min IN (7, 15, 30)),

  -- トレーニング前の速度計測
  pre_speed_id    UUID,                    -- speed_measurements.id
  -- トレーニング後の速度計測
  post_speed_id   UUID,                    -- speed_measurements.id

  -- トレーニングセッション
  training_session_id UUID,                -- training_sessions.id

  -- 状態
  status          TEXT NOT NULL DEFAULT 'pre_speed'
                  CHECK (status IN (
                    'pre_speed',           -- 速度計測(前)待ち
                    'training',            -- トレーニング中
                    'post_speed',          -- 速度計測(後)待ち
                    'completed'            -- 完了
                  )),

  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_sessions_student ON daily_sessions (student_id, date DESC);


-- ========== 3. 速度計測テーブル ==========
CREATE TABLE speed_measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_session_id UUID NOT NULL REFERENCES daily_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content_id      UUID NOT NULL REFERENCES contents(id),
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('pre', 'post')),

  -- 計測結果
  char_count      INT NOT NULL,            -- 読んだ文字数
  reading_time_sec NUMERIC(8,2) NOT NULL,  -- 読了時間（秒、小数点2桁）
  wpm             INT NOT NULL,            -- 文字/分

  -- テスト結果（読後の4択テスト）
  quiz_total      INT,
  quiz_correct    INT,
  quiz_accuracy   NUMERIC(5,2),

  measured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_speed_measurements_student ON speed_measurements (student_id, measured_at DESC);
CREATE INDEX idx_speed_measurements_daily ON speed_measurements (daily_session_id);

-- daily_sessions のFK設定
ALTER TABLE daily_sessions
  ADD CONSTRAINT fk_daily_pre_speed FOREIGN KEY (pre_speed_id) REFERENCES speed_measurements(id),
  ADD CONSTRAINT fk_daily_post_speed FOREIGN KEY (post_speed_id) REFERENCES speed_measurements(id);


-- ========== 4. training_menus を 7/15/30分 に変更 ==========

-- 既存メニューデータを削除（セグメントはCASCADEで消える）
DELETE FROM menu_segments;
DELETE FROM training_menus;

-- Phase 1: 瞬間よみメニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase1_7min',  'shunkan', 7,  '瞬間よみ 7分',  'ばらばら + たて1行 + テスト'),
  ('phase1_15min', 'shunkan', 15, '瞬間よみ 15分', '全瞬間よみ種目 + テスト'),
  ('phase1_30min', 'shunkan', 30, '瞬間よみ 30分', '全瞬間よみ種目 + 繰り返し + テスト');

-- Phase 2: 高速よみ（ブロック）メニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase2_7min',  'block', 7,  '高速よみ 7分',  '瞬間復習 + ブロックよみ + テスト'),
  ('phase2_15min', 'block', 15, '高速よみ 15分', '瞬間復習 + ブロックよみ + テスト'),
  ('phase2_30min', 'block', 30, '高速よみ 30分', '瞬間復習 + ブロックよみ + アウトプット + テスト');

-- Phase 3: アウトプットメニュー
INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase3_7min',  'output', 7,  'アウトプット 7分',  'ブロック復習 + アウトプット + テスト'),
  ('phase3_15min', 'output', 15, 'アウトプット 15分', 'ブロック復習 + アウトプット + テスト'),
  ('phase3_30min', 'output', 30, 'アウトプット 30分', 'ブロック復習 + アウトプット + 繰り返し + テスト');

-- duration_min の CHECK制約を変更
ALTER TABLE training_menus DROP CONSTRAINT IF EXISTS training_menus_duration_min_check;
ALTER TABLE training_menus ADD CONSTRAINT training_menus_duration_min_check
  CHECK (duration_min IN (7, 15, 30));


-- ========== 5. menu_segments 再構成 ==========

-- Phase 1: 瞬間よみ 7分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_7min', 1, 'barabara',           90,  true, 30, 'shunkan_recall', true,  'ばらばら読み 1.5分 + テスト'),
  ('phase1_7min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2分 + テスト'),
  ('phase1_7min', 3, 'shunkan_tate_2line', 90,  true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 1.5分 + テスト');

-- Phase 1: 瞬間よみ 15分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_15min', 1, 'barabara',           120, true, 30, 'shunkan_recall', true,  'ばらばら読み 2分 + テスト'),
  ('phase1_15min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_15min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 4, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 5, 'shunkan_yoko_2line', 120, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 6, 'koe_e',             90,  true, 30, 'shunkan_recall', false, '声になる/絵になる 1.5分 + テスト');

-- Phase 1: 瞬間よみ 30分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_30min', 1,  'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_30min', 2,  'shunkan_tate_1line', 180, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 3分 + テスト'),
  ('phase1_30min', 3,  'shunkan_tate_2line', 150, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 4,  'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 5,  'shunkan_yoko_2line', 150, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 6,  'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト'),
  ('phase1_30min', 7,  'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ(2周目) 2.5分 + テスト'),
  ('phase1_30min', 8,  'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ(2周目) 2.5分 + テスト');

-- Phase 2: 高速よみ 7分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_7min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase2_7min', 2, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_7min', 3, 'block_yoko',         90,  true, 40, 'content_comprehension', false, 'よこブロック 1.5分 + テスト');

-- Phase 2: 高速よみ 15分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_15min', 1, 'barabara',           60,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1分 + テスト'),
  ('phase2_15min', 2, 'shunkan_tate_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: たて1行 1.5分 + テスト'),
  ('phase2_15min', 3, 'shunkan_yoko_1line', 90,  true, 30, 'shunkan_recall',       true,  '復習: よこ1行 1.5分 + テスト'),
  ('phase2_15min', 4, 'block_tate',         150, true, 60, 'content_comprehension', false, 'たてブロック 2.5分 + テスト'),
  ('phase2_15min', 5, 'block_yoko',         150, true, 60, 'content_comprehension', false, 'よこブロック 2.5分 + テスト');

-- Phase 2: 高速よみ 30分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase2_30min', 1, 'barabara',           90,  true, 20, 'shunkan_recall',       true,  '復習: ばらばら 1.5分 + テスト'),
  ('phase2_30min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: たて1行 2分 + テスト'),
  ('phase2_30min', 3, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall',       true,  '復習: よこ1行 2分 + テスト'),
  ('phase2_30min', 4, 'block_tate',         180, true, 60, 'content_comprehension', false, 'たてブロック 3分 + テスト'),
  ('phase2_30min', 5, 'block_yoko',         180, true, 60, 'content_comprehension', false, 'よこブロック 3分 + テスト'),
  ('phase2_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase2_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト');

-- Phase 3: アウトプット 7分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_7min', 1, 'block_tate',   60,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1分 + テスト'),
  ('phase3_7min', 2, 'output_tate', 150,  true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_7min', 3, 'output_yoko',  90,  true, 40, 'vocab_check',           false, 'よこアウトプット 1.5分 + テスト');

-- Phase 3: アウトプット 15分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_15min', 1, 'block_tate',   90,  true, 30, 'content_comprehension', true,  '復習: たてブロック 1.5分 + テスト'),
  ('phase3_15min', 2, 'block_yoko',   90,  true, 30, 'content_comprehension', true,  '復習: よこブロック 1.5分 + テスト'),
  ('phase3_15min', 3, 'output_tate', 150, true, 60, 'vocab_check',           false, 'たてアウトプット 2.5分 + テスト'),
  ('phase3_15min', 4, 'output_yoko', 150, true, 60, 'vocab_check',           false, 'よこアウトプット 2.5分 + テスト');

-- Phase 3: アウトプット 30分
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase3_30min', 1, 'shunkan_tate_1line', 60,  true, 20, 'shunkan_recall',       true,  '復習: たて1行 1分 + テスト'),
  ('phase3_30min', 2, 'block_tate',         120, true, 30, 'content_comprehension', true,  '復習: たてブロック 2分 + テスト'),
  ('phase3_30min', 3, 'block_yoko',         120, true, 30, 'content_comprehension', true,  '復習: よこブロック 2分 + テスト'),
  ('phase3_30min', 4, 'output_tate',        180, true, 60, 'vocab_check',           false, 'たてアウトプット 3分 + テスト'),
  ('phase3_30min', 5, 'output_yoko',        180, true, 60, 'vocab_check',           false, 'よこアウトプット 3分 + テスト'),
  ('phase3_30min', 6, 'output_tate',        150, true, 60, 'vocab_check',           false, 'たてアウトプット(2周目) 2.5分 + テスト'),
  ('phase3_30min', 7, 'output_yoko',        150, true, 60, 'vocab_check',           false, 'よこアウトプット(2周目) 2.5分 + テスト');


-- ========== 6. 保護者通知テーブル ==========
CREATE TABLE parent_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'weekly_report',       -- 週次レポート
    'monthly_report',      -- 月次レポート
    'milestone',           -- ステップアップ/フェーズアップ通知
    'streak'               -- 連続トレーニング達成通知
  )),
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'line')),
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',      -- 速度変化, 正答率, 期間 等
  is_sent         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_notifications_student ON parent_notifications (student_id, created_at DESC);
CREATE INDEX idx_parent_notifications_unsent ON parent_notifications (is_sent) WHERE is_sent = false;


-- ========== 7. training_tests の test_type CHECK制約を緩和 ==========
-- 既存の制約を外してから新しい制約を追加
ALTER TABLE training_tests DROP CONSTRAINT IF EXISTS training_tests_test_type_check;
ALTER TABLE training_tests ADD CONSTRAINT training_tests_test_type_check
  CHECK (test_type IN (
    'shunkan_recall',
    'content_comprehension',
    'vocab_check',
    'speed_quiz'               -- 速度計測後の理解度テスト
  ));


-- ========== 8. RLS ==========
ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全操作可能" ON daily_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "全操作可能" ON speed_measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "全操作可能" ON parent_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ========== 9. updated_at トリガー ==========
CREATE TRIGGER trg_daily_sessions_updated_at
  BEFORE UPDATE ON daily_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 10. student_progress 自動作成関数 ==========
-- 生徒の初回登録完了時に progress レコードを自動作成
CREATE OR REPLACE FUNCTION initialize_student_progress(
  p_student_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO student_progress (student_id, current_phase_id, current_step_id)
  VALUES (p_student_id, 'shunkan', 'shunkan_tate_1line_lv1')
  ON CONFLICT (student_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
