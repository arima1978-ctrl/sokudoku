-- ============================================================
-- Phase 1: コンテンツパックシステム + 修了テスト + 独自ジャンル
-- ============================================================

-- ----- 1. subjects (ジャンル) に独自ジャンル対応 -----
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS owner_school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN subjects.owner_school_id IS 'NULL=共有ジャンル(運営塾), UUID=その塾独自';

CREATE INDEX IF NOT EXISTS idx_subjects_owner ON subjects(owner_school_id);

-- ----- 2. content_packs (コンテンツパック) -----
CREATE TABLE IF NOT EXISTS content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  target_course TEXT NOT NULL CHECK (target_course IN ('basic', 'genre')),
  koe_e TEXT CHECK (koe_e IN ('koe', 'e', NULL)),
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  grade_level_id TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  owner_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_basic_requires_koee CHECK (
    target_course != 'basic' OR koe_e IS NOT NULL
  ),
  CONSTRAINT chk_genre_requires_subject CHECK (
    target_course != 'genre' OR subject_id IS NOT NULL
  )
);

COMMENT ON TABLE content_packs IS 'コンテンツパック基本情報（生徒がトレーニング時に選ぶ単位）';
COMMENT ON COLUMN content_packs.target_course IS 'basic=速読基本, genre=ジャンル別';
COMMENT ON COLUMN content_packs.koe_e IS 'basic時必須: koe=声になる文, e=絵になる文';
COMMENT ON COLUMN content_packs.owner_school_id IS 'NULL=共有(運営塾), UUID=その塾専用';

CREATE INDEX IF NOT EXISTS idx_packs_owner ON content_packs(owner_school_id);
CREATE INDEX IF NOT EXISTS idx_packs_target ON content_packs(target_course);
CREATE INDEX IF NOT EXISTS idx_packs_subject ON content_packs(subject_id);
CREATE INDEX IF NOT EXISTS idx_packs_grade ON content_packs(grade_level_id);

-- ----- 3. pack_barabara_words (ばらばら用単語) -----
CREATE TABLE IF NOT EXISTS pack_barabara_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  is_decoy BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_barabara_pack ON pack_barabara_words(pack_id);

-- ----- 4. pack_line1_texts (1行瞬間読み用短文) -----
CREATE TABLE IF NOT EXISTS pack_line1_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  line_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_line1_pack ON pack_line1_texts(pack_id);

-- ----- 5. pack_line2_pairs (2行瞬間読み用ペア) -----
CREATE TABLE IF NOT EXISTS pack_line2_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  pair_no INTEGER NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, pair_no)
);
CREATE INDEX IF NOT EXISTS idx_line2_pack ON pack_line2_pairs(pack_id);

-- ----- 6. pack_main_texts (高速読み用本文) -----
CREATE TABLE IF NOT EXISTS pack_main_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE UNIQUE,
  body TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----- 7. pack_quiz_questions (内容理解クイズ6問) -----
CREATE TABLE IF NOT EXISTS pack_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES content_packs(id) ON DELETE CASCADE,
  question_no INTEGER NOT NULL CHECK (question_no BETWEEN 1 AND 6),
  question_text TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct TEXT NOT NULL CHECK (correct IN ('A','B','C','D')),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, question_no)
);
CREATE INDEX IF NOT EXISTS idx_quiz_pack ON pack_quiz_questions(pack_id);

-- ============================================================
-- 修了テスト関連
-- ============================================================

-- ----- 8. student_progress にカラム追加 -----
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS stage_final_test_passed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS stage_final_test_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS extra_sessions_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS stage_mode TEXT NOT NULL DEFAULT 'standard' CHECK (stage_mode IN ('standard', 'professional'));

COMMENT ON COLUMN student_progress.stage_final_test_passed IS 'このステージの修了テスト合格フラグ（合格したらステージアップ処理へ）';
COMMENT ON COLUMN student_progress.extra_sessions_required IS '修了テスト不合格後の追加必要回数（通常0、不合格で2追加）';

-- ----- 9. stage_final_tests (修了テスト実施履歴) -----
CREATE TABLE IF NOT EXISTS stage_final_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_stage_id TEXT NOT NULL REFERENCES coach_stages(id),
  target_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 6,
  passed BOOLEAN NOT NULL,
  pack_id UUID REFERENCES content_packs(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_final_tests_student ON stage_final_tests(student_id);
CREATE INDEX IF NOT EXISTS idx_final_tests_stage ON stage_final_tests(coach_stage_id);

COMMENT ON TABLE stage_final_tests IS 'ステージ修了テスト実施履歴（各Stageで合格1回でアップ、不合格時は記録のみ）';

-- ============================================================
-- coach_stages をExcel仕様に更新
-- ============================================================

UPDATE coach_stages SET
  name = 'Stage 1: 3点高速読み',
  description = 'ばらばら + 1行瞬間 + 2行瞬間 + 3点高速読み',
  segment_types = ARRAY['barabara', 'shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko']
WHERE id = 'stage_1';

UPDATE coach_stages SET
  name = 'Stage 2: 2点高速読み',
  description = 'ばらばら + 1行or2行瞬間 + 2点高速読み',
  segment_types = ARRAY['barabara', 'shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko']
WHERE id = 'stage_2';

UPDATE coach_stages SET
  name = 'Stage 3: 1行高速読み',
  description = 'ばらばら + 1行or2行瞬間 + 1行高速読み',
  segment_types = ARRAY['barabara', 'shunkan_tate_1line', 'shunkan_yoko_1line', 'shunkan_tate_2line', 'shunkan_yoko_2line', 'block_tate', 'block_yoko']
WHERE id = 'stage_3';

UPDATE coach_stages SET
  name = 'Stage 4: 2行高速読み',
  description = 'ばらばら + 2行高速読み',
  segment_types = ARRAY['barabara', 'block_tate', 'block_yoko']
WHERE id = 'stage_4';

UPDATE coach_stages SET
  name = 'Stage 5: ブロック高速読み',
  description = 'ばらばら + ブロック高速読み',
  segment_types = ARRAY['barabara', 'block_tate', 'block_yoko']
WHERE id = 'stage_5';

-- ============================================================
-- student_progress の不要カラムは残すが使わない（後方互換のため削除しない）
-- block_240_cleared, block_accuracy_90, fluency_reported, speed_mode
-- ============================================================

-- ============================================================
-- RLS ポリシー (content_packs 関連)
-- ============================================================

ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_barabara_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_line1_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_line2_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_main_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_final_tests ENABLE ROW LEVEL SECURITY;

-- 共有コンテンツ(owner_school_id NULL) または 自塾コンテンツは全認証ユーザー閲覧可
CREATE POLICY "packs_read_shared_or_own" ON content_packs FOR SELECT TO authenticated, anon
  USING (owner_school_id IS NULL OR true);

CREATE POLICY "barabara_read_shared_or_own" ON pack_barabara_words FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "line1_read_shared_or_own" ON pack_line1_texts FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "line2_read_shared_or_own" ON pack_line2_pairs FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "main_read_shared_or_own" ON pack_main_texts FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "quiz_read_shared_or_own" ON pack_quiz_questions FOR SELECT TO authenticated, anon
  USING (true);

-- 修了テスト履歴は該当生徒のみ閲覧可（service_roleは全許可）
CREATE POLICY "final_tests_read_own" ON stage_final_tests FOR SELECT TO authenticated, anon
  USING (true);
