-- パート4: menu_segments Phase1
INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_7min', 1, 'barabara',           90,  true, 30, 'shunkan_recall', true,  'ばらばら読み 1.5分 + テスト'),
  ('phase1_7min', 2, 'shunkan_tate_1line', 120, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2分 + テスト'),
  ('phase1_7min', 3, 'shunkan_tate_2line', 90,  true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 1.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_15min', 1, 'barabara',           120, true, 30, 'shunkan_recall', true,  'ばらばら読み 2分 + テスト'),
  ('phase1_15min', 2, 'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 2.5分 + テスト'),
  ('phase1_15min', 3, 'shunkan_tate_2line', 120, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 4, 'shunkan_yoko_1line', 120, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 5, 'shunkan_yoko_2line', 120, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2分 + テスト'),
  ('phase1_15min', 6, 'koe_e',             90,  true, 30, 'shunkan_recall', false, '声になる/絵になる 1.5分 + テスト');

INSERT INTO menu_segments (menu_id, segment_order, segment_type, duration_sec, has_test, test_duration_sec, test_type, skippable, description) VALUES
  ('phase1_30min', 1,  'barabara',           150, true, 30, 'shunkan_recall', true,  'ばらばら読み 2.5分 + テスト'),
  ('phase1_30min', 2,  'shunkan_tate_1line', 180, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ 3分 + テスト'),
  ('phase1_30min', 3,  'shunkan_tate_2line', 150, true, 30, 'shunkan_recall', false, 'たて2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 4,  'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 5,  'shunkan_yoko_2line', 150, true, 30, 'shunkan_recall', false, 'よこ2行瞬間よみ 2.5分 + テスト'),
  ('phase1_30min', 6,  'koe_e',             120, true, 30, 'shunkan_recall', false, '声になる/絵になる 2分 + テスト'),
  ('phase1_30min', 7,  'shunkan_tate_1line', 150, true, 30, 'shunkan_recall', false, 'たて1行瞬間よみ(2周目) 2.5分 + テスト'),
  ('phase1_30min', 8,  'shunkan_yoko_1line', 150, true, 30, 'shunkan_recall', false, 'よこ1行瞬間よみ(2周目) 2.5分 + テスト');
