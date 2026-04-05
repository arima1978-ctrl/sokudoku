-- ============================================================
-- コンテンツシードデータ
-- 学年×ジャンル別に瞬間よみ用短文 + 長文 + 4択クイズ
-- ============================================================

-- ========== 瞬���よみ用短文（2〜8文字、char_count <= 30） ==========
-- difficulty 1 = かんたん（2〜4文字）
-- difficulty 2 = ふつう（4〜6文字）
-- difficulty 3 = むずかしい（6〜8文字）

-- 幼児〜小2: ひらがな中心
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
  -- 幼児
  ('preschool', 'story', 1, 'いぬ', 'いぬ', 2, true),
  ('preschool', 'story', 1, 'ねこ', 'ねこ', 2, true),
  ('preschool', 'story', 1, 'さかな', 'さかな', 3, true),
  ('preschool', 'story', 1, 'くるま', 'くるま', 3, true),
  ('preschool', 'story', 1, 'おはな', 'おはな', 3, true),
  ('preschool', 'story', 2, 'おひさま', 'おひさま', 4, true),
  ('preschool', 'story', 2, 'ちょうちょ', 'ちょうちょ', 5, true),
  ('preschool', 'story', 2, 'かたつむり', 'かたつむり', 5, true),
  ('preschool', 'story', 2, 'うさぎさん', 'うさぎさん', 5, true),
  ('preschool', 'story', 3, 'おともだち', 'おともだち', 5, true),
  -- 小1
  ('g1', 'story', 1, 'そら', 'そら', 2, true),
  ('g1', 'story', 1, 'やま', 'やま', 2, true),
  ('g1', 'story', 1, 'かわ', 'かわ', 2, true),
  ('g1', 'story', 1, 'はな', 'はな', 2, true),
  ('g1', 'story', 2, 'たんぽぽ', 'たん��ぽ', 4, true),
  ('g1', 'story', 2, 'ひまわり', 'ひまわり', 4, true),
  ('g1', 'story', 2, 'あさがお', 'あさがお', 4, true),
  ('g1', 'story', 3, 'ともだちと', 'ともだちと', 5, true),
  ('g1', 'story', 3, 'がっこうへ', 'がっこうへ', 5, true),
  ('g1', 'story', 3, 'きょうしつ', 'きょうしつ', 5, true),
  -- 小2
  ('g2', 'story', 1, '春の風', '春の風', 3, true),
  ('g2', 'story', 1, '夏の空', '夏の空', 3, true),
  ('g2', 'story', 2, '大きな木', '大きな木', 4, true),
  ('g2', 'story', 2, '小さな花', '小さな花', 4, true),
  ('g2', 'story', 2, '赤い鳥', '赤い鳥', 3, true),
  ('g2', 'story', 3, '雨あがり', '雨あがり', 4, true),
  ('g2', 'story', 3, '夕やけこやけ', '夕やけこやけ', 6, true),
  ('g2', 'story', 3, '友だちの手', '友だちの手', 5, true);

-- 小3〜小4: 漢字混じり
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
  ('g3', 'story', 1, '青い海', '青い海', 3, true),
  ('g3', 'story', 1, '白い雲', '白い雲', 3, true),
  ('g3', 'story', 2, '秋の夕暮れ', '秋の夕暮れ', 5, true),
  ('g3', 'story', 2, '春の小川', '春の小川', 4, true),
  ('g3', 'story', 3, '冬の朝の光', '冬の朝の光', 5, true),
  ('g3', 'story', 3, '花がさいた庭', '花がさいた庭', 6, true),
  ('g3', 'science', 1, '月の光', '月の光', 3, true),
  ('g3', 'science', 2, '星の名前', '星の名前', 4, true),
  ('g3', 'science', 3, '地球は回る', '地球は回る', 5, true),
  ('g3', 'trivia', 2, '日本の祭り', '日本の祭り', 5, true),
  ('g4', 'story', 1, '夢の中', '夢の中', 3, true),
  ('g4', 'story', 2, '新しい朝', '新しい朝', 4, true),
  ('g4', 'story', 2, '静かな森', '静かな森', 4, true),
  ('g4', 'story', 3, '遠い記憶の声', '遠い記憶の声', 6, true),
  ('g4', 'story', 3, '光と影の道', '光と影の道', 5, true),
  ('g4', 'science', 1, '水の力', '水の力', 3, true),
  ('g4', 'science', 2, '電気の流れ', '電気の流れ', 5, true),
  ('g4', 'science', 3, '植物の成長', '植物の成長', 5, true),
  ('g4', 'social', 2, '日本の地理', '日本の地理', 5, true),
  ('g4', 'social', 3, '歴史の教科書', '歴史の教科書', 6, true);

-- 小5〜小6: より複雑な語彙
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
  ('g5', 'story', 1, '未来への扉', '未来への扉', 5, true),
  ('g5', 'story', 2, '勇気ある決断', '勇気ある決断', 6, true),
  ('g5', 'story', 3, '希望の光が差す', '希望の光が���す', 7, true),
  ('g5', 'science', 2, '宇宙の不思議', '宇宙の不思議', 6, true),
  ('g5', 'science', 3, '生命の進化論', '生命の進化論', 6, true),
  ('g5', 'biography', 2, '偉人の名言', '偉人の名言', 5, true),
  ('g5', 'social', 2, '世界の文化', '世界の文化', 5, true),
  ('g5', 'social', 3, '国際社会の課題', '国際社会の課題', 7, true),
  ('g6', 'story', 1, '朝焼けの空', '朝焼けの空', 5, true),
  ('g6', 'story', 2, '風に乗る種子', '風に乗る種子', 6, true),
  ('g6', 'story', 3, '時を超えた約束', '時を超えた���束', 7, true),
  ('g6', 'science', 2, '化学反応の仕組', '化学反応の仕組', 7, true),
  ('g6', 'science', 3, '天体観測の歴史', '天体観測の歴史', 7, true),
  ('g6', 'biography', 2, '発明家の挑戦', '発明家の挑戦', 6, true),
  ('g6', 'social', 2, '民主主義の原理', '民主主義の原理', 7, true);

-- 中学〜大人
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
  ('jh', 'story', 1, '静寂の庭園', '静寂の庭園', 5, true),
  ('jh', 'story', 2, '運命の分岐点', '運命の分岐点', 6, true),
  ('jh', 'story', 3, '時代を動かす力', '時代を動かす力', 7, true),
  ('jh', 'science', 2, '遺伝子の暗号', '遺伝子の暗号', 6, true),
  ('jh', 'science', 3, '量子力学の基礎', '量子力学の基礎', 7, true),
  ('jh', 'biography', 2, '革命家の信念', '革命家の信念', 6, true),
  ('hs', 'story', 2, '哲学的問いかけ', '哲学的問いかけ', 7, true),
  ('hs', 'story', 3, '存在の根源を探る', '存在の根源を探る', 8, true),
  ('hs', 'science', 3, '相対性理論の世界', '相対性理論の世界', 8, true),
  ('adult', 'story', 2, '人生の岐路に立つ', '人生の岐路に立つ', 8, true),
  ('adult', 'story', 3, '文明の興亡を辿る旅', '文明の興亡を辿る旅', 9, true),
  ('adult', 'trivia', 2, '経済学の基本原理', '経済学の基本原理', 8, true),
  ('adult', 'biography', 3, '偉大なる指導者達', '偉大���る指導者達', 8, true);


-- ========== 長文コンテンツ（速度計測 + ブロックよみ用） ==========

-- 小3: 物語
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g3', 'story', 1, 'ふしぎな森のぼうけん',
'ある日、ゆうきは学校の帰り道にふしぎな小道を見つけました。その小道は大きな木の根もとから始まっていて、見たこともない花がさいていました。

「こんな道、前はなかったのに」

ゆうきは少しこわかったけれど、好奇心にまけて歩き始めました。小道をすすむと、どんどん木が大きくなって、空がほとんど見えなくなりました。

すると、前から小さな光が近づいてきました。よく見ると、それは手のひらほどの大きさの妖精でした。

「ようこそ、ふしぎの森へ！わたしはルミ。あなたを待っていたのよ」

妖精のルミは、ゆうきの手をひいて森の奥へ案内してくれました。そこには、動物たちが言葉を話す不思議な広場がありました。

うさぎが「いらっしゃい」と声をかけ、りすが木の実をくれました。ゆうきはびっくりしましたが、とてもうれしくなりました。

「この森は、やさしい心を持った子どもにしか見えないの」とルミが教えてくれました。

ゆうきは夕方まで森で遊んで、帰るときにルミから小さなどんぐりをもらいました。

「これを持っていれば、いつでもまた来られるよ」

次の日、ゆうきがどんぐりを見ると、小さな芽が出ていました。ゆうきはそっと学校の花だんに植えました。きっといつか、この木も大きな森への入り口になるにちがいないと思いました。',
548, true);

-- 小3: 理科
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g3', 'science', 1, '太陽と月のひみつ',
'太陽と月は、わたしたちにとって身近な天体です。でも、じつはとても不思議なことがたくさんあります。

太陽は、地球から約1億5000万キロメートルもはなれたところにある大きな星です。太陽の表面の温度は約6000度もあります。太陽がなければ、地球は凍りついた暗い星になってしまいます。

月は地球のまわりを回っている天体で、地球から約38万キロメートルのところにあります。月は自分では光らず、太陽の光を反映して光って見えます。

月は約29日かけて満ち欠けをくり返します。新月から三日月、半月、満月と形を変えていきます。これは、地球と月と太陽の位置関係が変わるためです。

おもしろいことに、月はいつも同じ面を地球に向けています。これは、月が地球のまわりを1周する時間と、月自身が1回転する時間がぴったり同じだからです。

日食は、月が太陽を隠すときに起こります。太陽は月の約400倍も大きいのに、太陽までの距離は月までの約400倍あるので、空ではほぼ同じ大きさに見えます。この偶然のおかげで、美しい日食が見られるのです。

夜空を見上げたとき、太陽と月のふしぎを思い出してみてください。',
490, true);

-- 小4: 物語
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g4', 'story', 2, '時計塔の秘密',
'町の中心にある古い時計塔は、もう何年も止まったままでした。大人たちは「古くて壊れたんだ」と言いましたが、小学四年生のあおいは違うと感じていました。

ある放課後、あおいは時計塔の扉が少しだけ開いているのに気づきました。中に入ると、螺旋階段が上へと続いていました。

階段を上るたびに、壁に不思議な模様が彫られていました。それは星座の形でした。おひつじ座、ふたご座、しし座。全部で十二の星座が、階段に沿って並んでいました。

一番上にたどり着くと、巨大な歯車の部屋がありました。歯車は錆びていましたが、よく見ると一つだけ新しい歯車が置いてありました。

「これを、はめればいいのかな」

あおいが歯車を見つけた場所にはめ込むと、カチッという音がして、すべての歯車がゆっくり動き始めました。

ゴーン、ゴーン、ゴーン。

時計塔の鐘が鳴り響きました。窓の外を見ると、町の人たちが空を見上げていました。そして、夕焼けの空に虹がかかりました。

「時計塔は、町を見守っていたんだ」

あおいは毎週、時計塔の掃除をすることにしました。歯車に油をさし、窓を磨きました。時計はそれからずっと正確に時を刻み続けました。',
504, true);

-- 小4: 社会
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g4', 'social', 1, '日本の四季と暮らし',
'日本は四季がはっきりしている国です。春夏秋冬、それぞれの季節に合わせた暮らしや文化があります。

春は桜の季節です。三月から四月にかけて桜が咲き、日本中でお花見が行われます。新しい学年が始まるのも春です。田植えの準備もこの時期に始まります。

夏は暑い日が続きます。七月から八月は夏休みです。各地で花火大会や盆踊りなどの祭りが開催されます。海や山に出かける家族も多いです。夏には打ち水をして涼をとる習慣があります。

秋は紅葉の季節です。十月から十一月にかけて山々が赤や黄色に色づきます。運動会や文化祭が行われるのも秋です。稲刈りの時期でもあり、新米が食べられるようになります。

冬は雪が降る地域もあります。十二月にはクリスマス、お正月の準備があります。一月のお正月には初詣に行き、おせち料理を食べます。こたつやストーブで暖をとりながら過ごします。

日本人は昔から、四季の変化を楽しみながら生活してきました。季節の行事や旬の食べ物を大切にする文化は、日本のすばらしい特徴の一つです。',
454, true);

-- 小5: 伝記
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g5', 'biography', 2, '野口英世の生涯',
'野口英世は1876年、福島県の貧しい農家に生まれました。一歳のとき、囲炉裏に落ちて左手に大やけどを負います。この事故が、英世の人生を大きく変えることになりました。

小学校に入った英世は、左手のことでいじめられることもありましたが、勉強が大好きでした。ある先生が英世の才能を見抜き、「学問で身を立てなさい」と励ましてくれました。

十五歳のとき、地元の医師に手術してもらい、左手が少し動くようになりました。この経験から、英世は医学の道を志します。

その後、東京に出て猛勉強を重ね、二十歳で医師の資格を取得しました。さらにアメリカに渡り、ロックフェラー研究所で研究を始めます。

英世は細菌学の研究に没頭し、梅毒の病原体を発見するなど、数々の業績を上げました。ノーベル賞の候補にも三度挙がっています。

1928年、英世はアフリカのガーナで黄熱病の研究中に、自ら黄熱病に感染して亡くなりました。五十一歳でした。

「志を得ざれば再び此の地を踏まず」。故郷を出るとき英世が柱に刻んだこの言葉は、強い決意と努力の大切さを今も私たちに伝えています。野口英世の肖像は、現在の千円札に描かれています。',
489, true);

-- 小5: 理���
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('g5', 'science', 2, '水の不思議な性質',
'水は私たちの生活に欠かせないものですが、実はとても不思議な性質を持っています。

まず、水は温度によって姿を変えます。零度以下で氷になり、百度で水蒸気になります。これを「状態変化」と言います。

水の最も不思議な性質の一つは、氷になると体積が増えることです。ほとんどの物質は固体になると縮みますが、水は逆です。これは水分子の結晶構造に隙間ができるためです。この性質のおかげで、氷は水に浮きます。もし氷が沈んだら、湖は底から凍ってしまい、魚は生きていけません。

水は「万能の溶媒」とも呼ばれます。砂糖や塩はもちろん、空気中の酸素や二酸化炭素も水に溶けます。この性質のおかげで、魚はえら呼吸ができるのです。

また、水は温まりにくく冷めにくい性質があります。これを「比熱が大きい」と言います。海の近くの地域で気温の変化が穏やかなのは、この性質のおかげです。

さらに、水は表面張力が強い液体です。コップのふちぎりぎりまで水を入れても、少しだけ盛り上がってこぼれないのは表面張力のはたらきです。

こうした水の不思議な性質が、地球上の生命を支えているのです。',
477, true);

-- 中学: 雑学
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('jh', 'trivia', 2, '色が人に与える影響',
'私たちの身の回りにはさまざまな色があふれています。実は、色は人間の心理や行動に大きな影響を与えることが科学的に証明されています。

赤色は興奮や情熱を象徴する色です。赤い部屋にいると心拍数が上がり、時間が実際より長く感じられるという実験結果があります。飲食店が赤を多く使うのは、食欲を刺激する効果があるからです。

青色は冷静さや信頼を表します。青い環境にいると心拍数が下がり、リラックス効果が生まれます。多くの企業が青をロゴに使うのは、信頼感を与えるためです。SNSのロゴに青が多いのも偶然ではありません。

緑色は自然を連想させ、目の疲れを癒す効果があります。手術室の壁や医師の手術着が緑色なのは、赤い血を長時間見た後の補色残像を和らげるためです。

黄色は注意を引く力が最も強い色です。信号機や工事現場の標識に黄色が使われるのはこのためです。しかし、黄色い部屋に長時間いると不安感が増すという研究もあります。

面白いことに、色の感じ方は文化によって異なります。日本では白は清潔さを、西洋では純粋さを象徴しますが、中国では白は悲しみの色です。

色の力を知ることは、より良い生活環境づくりに役立つでしょう。',
490, true);

-- 大人: 物語
INSERT INTO contents (grade_level_id, subject_id, difficulty, title, body, char_count, is_active) VALUES
('adult', 'story', 2, '最後の手紙',
'引き出しの奥から、一通の手紙が出てきた。セピア色に変色した封筒には、祖父の几帳面な字で私の名前が書かれていた。

祖父が亡くなってから五年。遺品の整理をずっと後回しにしていた自分を少し恥じながら、封を切った。

「お前がこの手紙を読んでいるということは、私はもうこの世にいないのだろう。伝えたいことがある。」

祖父は戦後、焼け野原の東京で小さな本屋を始めた。最初の客は、一冊の絵本を買いに来た少女だった。お金が足りなかったその少女に、祖父は本を渡した。

「その少女が、お前のおばあちゃんだ。」

知らなかった。祖母との馴れ初めを、祖父が語ることはなかった。

手紙は続く。本屋は何度も潰れかけた。しかし、どんなときも祖母が支えてくれたという。

「人生で大切なのは、何を持っているかではない。誰と歩くかだ。お前にも、隣を歩いてくれる人がきっと見つかる。焦るな。」

最後の一行で、祖父は書いていた。

「本屋を継がなくてもいい。ただ、本を愛する心だけは忘れないでくれ。」

手紙を読み終えた私は、本棚の前に立った。祖父が大切にしていた初版本が、静かに背表紙を見せていた。私は一冊を手に取り、ページを開いた。活字のにおいが、祖父の書斎の記憶を蘇らせた。',
483, true);


-- ========== 4択クイズ（長文コンテンツに紐付け） ==========

-- 「ふしぎな森のぼうけん」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = 'ふしぎ���森のぼうけん' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, 'ゆうきが森で最初に出会ったのは誰ですか？',
  '妖精のルミ', 'うさぎ', 'りす', '大きな木'
  , 'A'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼうけん' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, 'この森が見えるのはどんな子どもですか？',
  '勇気がある子ども', 'やさしい心を持った子ども', '魔法が使える子ども', '森に住んでいる子ども'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼ���けん' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, 'ゆうきがルミからもらったものは何ですか？',
  '花', '石', 'どんぐり', '葉っ��'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = 'ふしぎな森のぼ���けん' AND q.pattern = 'A';


-- 「太陽と月のひみつ」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '太陽と月のひみつ' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '月は約何日で満ち欠けを繰り返しますか？',
  '約7日', '約15日', '約29日', '約60日'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽���月のひみつ' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '月がいつも同じ面を地球に向けている理由は何ですか？',
  '月は回転していないから', '地球の引力で固定されているから', '公転と自転の周期が同じだから', '月が平らだから'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽と月のひみ��' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '日食が起こるのはなぜですか？',
  '地球が太陽を隠すから', '月が太陽を隠すから', '雲が太陽を隠すから', '星が太陽を隠すから'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '太陽と���のひみつ' AND q.pattern = 'A';


-- 「時計塔の秘密」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '時計塔の秘密' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '時計塔の壁に彫られていた模様は何ですか？',
  '動物の絵', '花の模様', '星座の形', '数字'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, 'あおいが歯車をはめた後、何が起きましたか？',
  '地震が起きた', '時計塔が壊れた', '鐘が鳴り、虹がかかった', '何も起きなかった'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, 'あおいは毎週、時計塔で何をするようになりましたか？',
  '友だちと遊ぶ', '掃除をする', '本を読む', '絵を描く'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '時計塔の秘密' AND q.pattern = 'A';


-- 「日本の四季と暮らし」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '日本の四季と暮らし' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '田植えの準備が始まる季節はいつですか？',
  '春', '夏', '秋', '冬'
  , 'A'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と暮らし' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '稲刈りが行われる季節はいつですか？',
  '春', '夏', '秋', '冬'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と��らし' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '暑い夏に涼をとるための日本の習慣は何ですか？',
  '焚き火', '打ち水', 'お餅つき', '豆まき'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '日本の四季と暮らし' AND q.pattern = 'A';


-- 「野口英世の生涯」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '野口英世の生涯' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '野口英世が左手にやけどを負った原因は何ですか？',
  'ストーブに触った', '囲炉裏に落ちた', '火遊びをした', '熱湯をかぶった'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '野口英世の生涯' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '野口英世はどこの研究所で研究をしましたか？',
  'パスツール研究所', 'ロックフェラー研究所', '東京大学', 'コッホ研究���'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '���口英世の生涯' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '野口英世はアフリカで何の研究中に亡くなりましたか？',
  'マラリア', 'コレラ', '黄熱病', 'ペスト'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '野口英世の生涯' AND q.pattern = 'A';


-- 「水の不思議な性質」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '水の不思議な性質' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '水が氷になると体積はどうなりますか？',
  '減る', '増える', '変わらない', 'なくなる'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '水の不思議な性質' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '「比熱が大きい」とはどういう意味ですか？',
  '温まりやすく冷めやすい', '温まりにくく冷めにくい', '温度が変わらない', '常に熱い'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '水の不思議な��質' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '水が「万能の溶媒」と呼ばれる理由は何ですか？',
  '何にでも変化するから', '多くの物質を溶かすから', '温度が一定だから', '透明だから'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '���の不思議な性質' AND q.pattern = 'A';


-- 「色が人に与える影響」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '色が人に与える影響' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '飲食店が赤色を多く使う理由は何ですか？',
  '安く見えるから', '食欲を刺激するから', '清潔に見えるから', '目立つから'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与える影響' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '手術室の壁が緑色なのはなぜですか？',
  'リラックス効果のため', '清潔に見えるため', '赤の補色残像を和らげるため', '明るく見えるため'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与える影響' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '注意を引く力が最も強い色は何色ですか？',
  '赤', '青', '黄', '緑'
  , 'C'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '色が人に与え��影響' AND q.pattern = 'A';


-- 「最後の手紙」のクイズ
INSERT INTO quizzes (content_id, pattern)
SELECT id, 'A' FROM contents WHERE title = '最後の手紙' LIMIT 1;

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 1, '祖父が戦後に始めた仕事は何ですか？',
  'レストラン', '本屋', '花屋', '銀行'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '���後の手紙' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 2, '最初の客の少女は後に誰になりましたか？',
  '近所のおばさん', '祖母', '先生', '友人'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '最後の手紙' AND q.pattern = 'A';

INSERT INTO quiz_questions (quiz_id, question_no, question_text, choice_a, choice_b, choice_c, choice_d, correct)
SELECT q.id, 3, '祖父が手紙で「人生で大切なこと」として伝えたのは何ですか？',
  '何を持っているか', '誰と歩くか', 'どこに住むか', 'いくら稼ぐか'
  , 'B'
FROM quizzes q JOIN contents c ON q.content_id = c.id WHERE c.title = '���後の手紙' AND q.pattern = 'A';
