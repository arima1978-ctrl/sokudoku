-- ============================================================
-- パスワードハッシュ化
--   schools.password_hash          (bcrypt)
--   students.student_password_hash (bcrypt)
-- 既存の平文カラムは後方互換のため残す（rehash 完了後にアプリ側で削除判断）
-- ============================================================

ALTER TABLE schools  ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_password_hash text;
