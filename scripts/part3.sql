-- パート3: メニュー再構成（7/15/30分）
-- 既存の制約を先に外す
ALTER TABLE training_menus DROP CONSTRAINT IF EXISTS training_menus_duration_min_check;

-- 既存の参照データを削除
DELETE FROM training_tests;
DELETE FROM training_sessions;
DELETE FROM menu_segments;
DELETE FROM training_menus;

INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase1_7min',  'shunkan', 7,  '瞬間よみ 7分',  'ばらばら + たて1行 + テスト'),
  ('phase1_15min', 'shunkan', 15, '瞬間よみ 15分', '全瞬間よみ種目 + テスト'),
  ('phase1_30min', 'shunkan', 30, '瞬間よみ 30分', '全瞬間よみ種目 + 繰り返し + テスト');

INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase2_7min',  'block', 7,  '高速よみ 7分',  '瞬間復習 + ブロックよみ + テスト'),
  ('phase2_15min', 'block', 15, '高速よみ 15分', '瞬間復習 + ブロックよみ + テスト'),
  ('phase2_30min', 'block', 30, '高速よみ 30分', '瞬間復習 + ブロックよみ + アウトプット + テスト');

INSERT INTO training_menus (id, phase_id, duration_min, name, description) VALUES
  ('phase3_7min',  'output', 7,  'アウトプット 7分',  'ブロック復習 + アウトプット + テスト'),
  ('phase3_15min', 'output', 15, 'アウトプット 15分', 'ブロック復習 + アウトプット + テスト'),
  ('phase3_30min', 'output', 30, 'アウトプット 30分', 'ブロック復習 + アウトプット + 繰り返し + テスト');

ALTER TABLE training_menus ADD CONSTRAINT training_menus_duration_min_check CHECK (duration_min IN (7, 15, 30));
