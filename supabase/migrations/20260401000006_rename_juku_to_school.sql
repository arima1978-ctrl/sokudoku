-- ============================================================
-- 「塾」→「スクール」 リネーム
-- 学校でも使えるよう汎用的な名称に統一
-- ============================================================

-- テーブル名変更
ALTER TABLE jukus RENAME TO schools;

-- カラム名変更（schools）
ALTER TABLE schools RENAME COLUMN juku_id TO school_id;
ALTER TABLE schools RENAME COLUMN juku_name TO school_name;

-- インデックスはテーブルリネームで自動追従するが、名前を揃える
ALTER INDEX idx_jukus_juku_id RENAME TO idx_schools_school_id;
ALTER INDEX idx_jukus_juku_name RENAME TO idx_schools_school_name;
ALTER INDEX idx_jukus_status RENAME TO idx_schools_status;
ALTER INDEX idx_jukus_member_type RENAME TO idx_schools_member_type;

-- studentsテーブルのFK列名変更
ALTER TABLE students RENAME COLUMN juku_id TO school_id;
ALTER INDEX idx_students_juku RENAME TO idx_students_school;

-- login_historyテーブルのFK列名変更
ALTER TABLE login_history RENAME COLUMN juku_id TO school_id;
ALTER INDEX idx_login_history_juku RENAME TO idx_login_history_school;

-- コメント更新
COMMENT ON TABLE  schools IS '速読管理 スクールマスター';
COMMENT ON COLUMN schools.school_id IS '速読システム上のスクールID';
COMMENT ON COLUMN schools.school_name IS 'スクール名';
COMMENT ON TABLE  students IS '速読 生徒ID/PW管理';

-- student_profilesテーブルはstudents.idを参照しているので変更不要

-- トリガー名も更新
ALTER TRIGGER trg_jukus_updated_at ON schools RENAME TO trg_schools_updated_at;
