-- ============================================================
-- ROLLBACK: 20260409000005_rls_enable.sql
-- 問題が起きた場合、このファイル内容を Supabase SQL Editor で実行すると
-- RLS を全て無効化して元の状態に戻せる。
-- ============================================================

ALTER TABLE training_phases        DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_steps         DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_menus         DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_segments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects               DISABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels           DISABLE ROW LEVEL SECURITY;
ALTER TABLE contents               DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes                DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools                DISABLE ROW LEVEL SECURITY;
ALTER TABLE students               DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress       DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles       DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sessions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_tests         DISABLE ROW LEVEL SECURITY;
ALTER TABLE speed_measurements     DISABLE ROW LEVEL SECURITY;
ALTER TABLE speed_history          DISABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_speed     DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results           DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications   DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_history          DISABLE ROW LEVEL SECURITY;
