-- パート7c: 4択クイズ

-- ふしぎな森のぼうけん
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = 'ふしぎな森のぼうけん' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, 'ゆうきが森で最初に出会ったのは誰ですか？', '妖精のルミ', 'うさぎ', 'りす', '大きな木', 'A'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼうけん' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, 'この森が見えるのはどんな子どもですか？', '勇気がある子ども', 'やさしい心を持った子ども', '魔法が使える子ども', '森に住んでいる子ども', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼうけん' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, 'ゆうきがルミからもらったものは何ですか？', '花', '石', 'どんぐり', '葉っぱ', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼうけん' AND q.pattern = 'A';

-- 太陽と月のひみつ
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '太陽と月のひみつ' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '月は約何日で満ち欠けを繰り返しますか？', '約7日', '約15日', '約29日', '約60日', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽と月のひみつ' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '月がいつも同じ面を地球に向けている理由は？', '月は回転していないから', '地球の引力で固定されているから', '公転と自転の周期が同じだから', '月が平らだから', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽と月のひみつ' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '日食が起こるのはなぜですか？', '地球が太陽を隠すから', '月が太陽を隠すから', '雲が太陽を隠すから', '星が太陽を隠すから', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽と月のひみつ' AND q.pattern = 'A';

-- 時計塔の秘密
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '時計塔の秘密' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '時計塔の壁に彫られていた模様は何ですか？', '動物の絵', '花の模様', '星座の形', '数字', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, 'あおいが歯車をはめた後、何が起きましたか？', '地震が起きた', '時計塔が壊れた', '鐘が鳴り、虹がかかった', '何も起きなかった', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, 'あおいは毎週、時計塔で何をするようになりましたか？', '友だちと遊ぶ', '掃除をする', '本を読む', '絵を描く', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';

-- 日本の四季と暮らし
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '日本の四季と暮らし' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '田植えの準備が始まる季節はいつですか？', '春', '夏', '秋', '冬', 'A'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と暮らし' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '稲刈りが行われる季節はいつですか？', '春', '夏', '秋', '冬', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と暮らし' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '暑い夏に涼をとるための日本の習慣は何ですか？', '焚き火', '打ち水', 'お餅つき', '豆まき', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と暮らし' AND q.pattern = 'A';

-- 野口英世の生涯
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '野口英世の生涯' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '野口英世が左手にやけどを負った原因は？', 'ストーブに触った', '囲炉裏に落ちた', '火遊びをした', '熱湯をかぶった', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '野口英世の生涯' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '野口英世はどこの研究所で研究をしましたか？', 'パスツール研究所', 'ロックフェラー研究所', '東京大学', 'コッホ研究所', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '野口英世の生涯' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '野口英世はアフリカで何の研究中に亡くなりましたか？', 'マラリア', 'コレラ', '黄熱病', 'ペスト', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '野口英世の生涯' AND q.pattern = 'A';

-- 水の不思議な性質
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '水の不思議な性質' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '水が氷になると体積はどうなりますか？', '減る', '増える', '変わらない', 'なくなる', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '水の不思議な性質' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '「比熱が大きい」とはどういう意味ですか？', '温まりやすく冷めやすい', '温まりにくく冷めにくい', '温度が変わらない', '常に熱い', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '水の不思議な性質' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '水が「万能の溶媒」と呼ばれる理由は？', '何にでも変化するから', '多くの物質を溶かすから', '温度が一定だから', '透明だから', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '水の不思議な性質' AND q.pattern = 'A';

-- 色が人に与える影響
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '色が人に与える影響' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '飲食店が赤色を多く使う理由は？', '安く見えるから', '食欲を刺激するから', '清潔に見えるから', '目立つから', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与える影響' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '手術室の壁が緑色なのはなぜですか？', 'リラックス効果のため', '清潔に見えるため', '赤の補色残像を和らげるため', '明るく見えるため', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与える影響' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '注意を引く力が最も強い色は何色ですか？', '赤', '青', '黄', '緑', 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与える影響' AND q.pattern = 'A';

-- 最後の手紙
INSERT INTO quizzes (content_id, pattern) SELECT id, 'A' FROM contents WHERE title = '最後の手紙' LIMIT 1;
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '祖父が戦後に始めた仕事は何ですか？', 'レストラン', '本屋', '花屋', '銀行', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '最後の手紙' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '最初の客の少女は後に誰になりましたか？', '近所のおばさん', '祖母', '先生', '友人', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '最後の手紙' AND q.pattern = 'A';
INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '祖父が「人生で大切なこと」として伝えたのは？', '何を持っているか', '誰と歩くか', 'どこに住むか', 'いくら稼ぐか', 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '最後の手紙' AND q.pattern = 'A';
