-- ============================================================
-- 速読トレーニングプラットフォーム
-- ============================================================
-- 4. grade_levels         : 学年マスター
-- 5. subjects             : 分野マスター
-- 6. contents             : コンテンツ（学年×分野）
-- 7. quizzes              : 4択テスト（コンテンツ紐付け）
-- 8. quiz_choices          : テスト選択肢
-- 9. reading_sessions      : 読書セッション（計測記録）
-- 10. quiz_results         : テスト結果
-- 11. student_profiles     : 生徒プロファイル（適応エンジン用）
-- 12. speed_history        : スピード推移履歴
-- ============================================================


-- ========== 4. 学年マスター ==========
CREATE TABLE grade_levels (
  id          TEXT PRIMARY KEY,                -- 'preschool','g1','g2',...,'g6','jh','hs','adult'
  name        TEXT NOT NULL,                   -- '幼児','小1','小2',...,'中学','高校','大人'
  display_order INT NOT NULL,
  max_kanji_level INT NOT NULL DEFAULT 0       -- その学年までに習う漢字の累積数目安
);

INSERT INTO grade_levels (id, name, display_order, max_kanji_level) VALUES
  ('preschool', '幼児',    1,    0),
  ('g1',        '小1',     2,   80),
  ('g2',        '小2',     3,  240),
  ('g3',        '小3',     4,  440),
  ('g4',        '小4',     5,  642),
  ('g5',        '小5',     6,  835),
  ('g6',        '小6',     7, 1026),
  ('jh',        '中学',    8, 1110),
  ('hs',        '高校',    9, 1400),
  ('adult',     '大人',   10, 2136);


-- ========== 5. 分野マスター ==========
CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,                -- 'story','moral','trivia','biography','social','science'
  name        TEXT NOT NULL,                   -- '物語','道徳','雑学','伝記','社会','理科'
  icon        TEXT,                            -- 絵文字やアイコン名
  display_order INT NOT NULL
);

INSERT INTO subjects (id, name, icon, display_order) VALUES
  ('story',     '物語',   '📖',  1),
  ('moral',     '道徳',   '🌟',  2),
  ('trivia',    '雑学',   '🔍',  3),
  ('biography', '伝記',   '👤',  4),
  ('social',    '社会',   '🌍',  5),
  ('science',   '理科',   '🔬',  6);


-- ========== 6. コンテンツ ==========
CREATE TABLE contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level_id  TEXT NOT NULL REFERENCES grade_levels(id),
  subject_id      TEXT NOT NULL REFERENCES subjects(id),
  difficulty      INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
                  -- 1=やさしい, 2=ふつう, 3=むずかしい
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,                 -- 本文テキスト
  char_count      INT NOT NULL,                  -- 文字数（自動算出用に保持）
  reading_time_sec INT,                          -- 想定読了時間（秒）
  is_active       BOOLEAN NOT NULL DEFAULT true,
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contents_grade    ON contents (grade_level_id);
CREATE INDEX idx_contents_subject  ON contents (subject_id);
CREATE INDEX idx_contents_grade_subject ON contents (grade_level_id, subject_id);
CREATE INDEX idx_contents_active   ON contents (is_active) WHERE is_active = true;

COMMENT ON TABLE contents IS '速読トレーニング用コンテンツ（学年×分野）';


-- ========== 7. 4択テスト ==========
CREATE TABLE quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id  UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  pattern     TEXT NOT NULL CHECK (pattern IN ('A', 'B', 'C')),
              -- 同一コンテンツに対してA/B/C 3パターン
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (content_id, pattern)
);

CREATE INDEX idx_quizzes_content ON quizzes (content_id);


-- ========== 8. テスト問題（選択肢） ==========
CREATE TABLE quiz_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_no   INT NOT NULL CHECK (question_no BETWEEN 1 AND 10),
  question_text TEXT NOT NULL,                   -- 問題文
  choice_a      TEXT NOT NULL,
  choice_b      TEXT NOT NULL,
  choice_c      TEXT NOT NULL,
  choice_d      TEXT NOT NULL,
  correct       TEXT NOT NULL CHECK (correct IN ('A', 'B', 'C', 'D')),
  explanation   TEXT,                            -- 解説

  UNIQUE (quiz_id, question_no)
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions (quiz_id);


-- ========== 9. 読書セッション ==========
CREATE TABLE reading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content_id      UUID NOT NULL REFERENCES contents(id) ON DELETE RESTRICT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,                   -- 読了時刻
  reading_time_sec INT,                          -- 実際の読了時間（秒）
  char_count      INT NOT NULL,                  -- 読んだ文字数
  wpm             INT,                           -- 算出した文字/分
  display_speed   NUMERIC(4,2),                  -- 表示速度倍率（例: 1.5, 2.0）
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_student  ON reading_sessions (student_id);
CREATE INDEX idx_sessions_content  ON reading_sessions (content_id);
CREATE INDEX idx_sessions_date     ON reading_sessions (started_at);
CREATE INDEX idx_sessions_student_date ON reading_sessions (student_id, started_at DESC);


-- ========== 10. テスト結果 ==========
CREATE TABLE quiz_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_session_id UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
  quiz_id           UUID NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_questions   INT NOT NULL,
  correct_count     INT NOT NULL,
  accuracy_pct      NUMERIC(5,2) NOT NULL,       -- 正答率（%）
  answers           JSONB NOT NULL DEFAULT '[]',  -- [{question_no, selected, correct, is_correct}]
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_results_session ON quiz_results (reading_session_id);
CREATE INDEX idx_quiz_results_student ON quiz_results (student_id);


-- ========== 11. 生徒プロファイル（適応エンジン） ==========
CREATE TABLE student_profiles (
  student_id          UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  grade_level_id      TEXT NOT NULL REFERENCES grade_levels(id),
  current_wpm         INT,                       -- 最新のWPM
  avg_wpm             INT,                       -- 直近10回の平均WPM
  avg_accuracy_pct    NUMERIC(5,2),              -- 直近10回の平均正答率
  recommended_speed   NUMERIC(4,2) DEFAULT 1.0,  -- おすすめ表示速度倍率
  recommended_difficulty INT DEFAULT 1,           -- おすすめ難易度(1-3)
  total_sessions      INT NOT NULL DEFAULT 0,
  total_contents_read INT NOT NULL DEFAULT 0,
  last_session_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_grade ON student_profiles (grade_level_id);


-- ========== 12. スピード推移履歴 ==========
CREATE TABLE speed_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  wpm         INT NOT NULL,
  accuracy_pct NUMERIC(5,2),
  content_id  UUID REFERENCES contents(id) ON DELETE SET NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_speed_history_student ON speed_history (student_id, measured_at DESC);


-- ========== studentsテーブルにgrade_level_id追加 ==========
ALTER TABLE students ADD COLUMN grade_level_id TEXT REFERENCES grade_levels(id);
CREATE INDEX idx_students_grade ON students (grade_level_id);


-- ========== updated_atトリガー追加 ==========
CREATE TRIGGER trg_contents_updated_at
  BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
