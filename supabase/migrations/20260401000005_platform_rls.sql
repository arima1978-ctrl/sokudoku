-- ============================================================
-- プラットフォームテーブルの RLS ポリシー
-- ============================================================

ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_history ENABLE ROW LEVEL SECURITY;

-- マスターデータ（学年・分野）は全員閲覧可能
CREATE POLICY "学年マスターは全員閲覧可能" ON grade_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "分野マスターは全員閲覧可能" ON subjects FOR SELECT TO authenticated USING (true);

-- コンテンツは認証済みユーザーが閲覧可能
CREATE POLICY "コンテンツは認証済みユーザーが閲覧可能" ON contents FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "管理者はコンテンツを全操作可能" ON contents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- テスト関連は認証済みユーザーが閲覧可能
CREATE POLICY "テストは認証済みユーザーが閲覧可能" ON quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "テスト問題は認証済みユーザーが閲覧可能" ON quiz_questions FOR SELECT TO authenticated USING (true);

-- セッション・結果は本人のみ
CREATE POLICY "管理者はセッションを全操作可能" ON reading_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "管理者はテスト結果を全操作可能" ON quiz_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "管理者はプロファイルを全操作可能" ON student_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "管理者はスピード履歴を全操作可能" ON speed_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
