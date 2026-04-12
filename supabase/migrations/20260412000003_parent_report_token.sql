-- ============================================================
-- 保護者レポートトークン
-- ============================================================
-- students に parent_report_token を追加
-- トークンベースの認証で保護者が学習レポートを閲覧可能にする
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_report_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_students_parent_token
  ON students (parent_report_token) WHERE parent_report_token IS NOT NULL;
