-- ============================================================
-- RLS: Deny-by-default + マスタテーブル公開読み取り許可
--
-- 方針:
--   - 全テーブル RLS enable
--   - service_role は RLS バイパス（サーバーアクションは従来通り動作）
--   - anon は マスタデータ (training_phases/steps/menus/menu_segments,
--     subjects, grade_levels, quizzes, quiz_questions, contents(is_active=true))
--     のみ SELECT 可能
--   - 書き込みと個別データは service_role 経由に限定
--
-- ⚠️ RLS enable は破壊的変更。失敗時は rollback ファイル参照。
-- ============================================================

-- 1. マスタテーブル
ALTER TABLE training_phases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_menus    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_segments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels      ENABLE ROW LEVEL SECURITY;

-- マスタは誰でも SELECT 可
DROP POLICY IF EXISTS "anon_select" ON training_phases;
CREATE POLICY "anon_select" ON training_phases FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select" ON training_steps;
CREATE POLICY "anon_select" ON training_steps FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select" ON training_menus;
CREATE POLICY "anon_select" ON training_menus FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select" ON menu_segments;
CREATE POLICY "anon_select" ON menu_segments FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select" ON subjects;
CREATE POLICY "anon_select" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_select" ON grade_levels;
CREATE POLICY "anon_select" ON grade_levels FOR SELECT USING (true);

-- 2. contents: is_active=true のみ anon から SELECT 可
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_active" ON contents;
CREATE POLICY "anon_select_active" ON contents FOR SELECT USING (is_active = true);

-- 3. クイズ (出題用にマスタ扱い)
ALTER TABLE quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select" ON quizzes;
CREATE POLICY "anon_select" ON quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_select" ON quiz_questions;
CREATE POLICY "anon_select" ON quiz_questions FOR SELECT USING (true);

-- 4. 個別データ: anon 不可 (service_role のみバイパス)
ALTER TABLE schools                ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_tests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_measurements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_speed     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history          ENABLE ROW LEVEL SECURITY;

-- （個別データはポリシー未定義のまま = deny-by-default for anon）
-- service_role は RLS を自動バイパスするため、サーバーアクション経由のアクセスは従来通り機能する
