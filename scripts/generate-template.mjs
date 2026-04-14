import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const OUT_DIR = 'public/guide/templates';

// 共通スタイル
const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1478C3' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  },
};

const noteStyle = {
  font: { italic: true, color: { argb: 'FF888888' }, size: 10 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } },
};

async function createXlsx() {
  const wb = new ExcelJS.Workbook();
  wb.creator = '100万人の速読';
  wb.created = new Date();

  // ===== 📘 Packs シート =====
  const packs = wb.addWorksheet('📘 Packs', { properties: { tabColor: { argb: 'FF1478C3' } } });
  packs.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'title', key: 'title', width: 32 },
    { header: 'target_course', key: 'target_course', width: 14 },
    { header: 'koe_e', key: 'koe_e', width: 10 },
    { header: 'genre_id', key: 'genre_id', width: 15 },
    { header: 'grade_level', key: 'grade_level', width: 14 },
    { header: 'difficulty', key: 'difficulty', width: 10 },
    { header: 'is_active', key: 'is_active', width: 10 },
  ];
  packs.getRow(1).eachCell(c => Object.assign(c, headerStyle));

  // 説明行
  packs.addRow({
    pack_id: '【必須・一意】',
    title: '【必須】生徒が選ぶパック名',
    target_course: '【必須】basic / genre',
    koe_e: 'basic時必須: koe / e',
    genre_id: 'genre時必須',
    grade_level: 'preschool-g3 / g4-g6 / jh-plus',
    difficulty: '1 / 2 / 3',
    is_active: 'TRUE / FALSE',
  });
  packs.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  // サンプル行
  packs.addRow({ pack_id: 'PACK_001', title: '走れメロス 〜友情のお話〜', target_course: 'basic', koe_e: 'koe', genre_id: '', grade_level: 'g4-g6', difficulty: 2, is_active: 'TRUE' });
  packs.addRow({ pack_id: 'PACK_002', title: '雨の日の図書館', target_course: 'basic', koe_e: 'e', genre_id: '', grade_level: 'g4-g6', difficulty: 1, is_active: 'TRUE' });
  packs.addRow({ pack_id: 'PACK_003', title: '桃太郎', target_course: 'genre', koe_e: '', genre_id: 'story', grade_level: 'preschool-g3', difficulty: 1, is_active: 'TRUE' });
  packs.addRow({ pack_id: 'PACK_004', title: '宇宙のはじまり', target_course: 'genre', koe_e: '', genre_id: 'science', grade_level: 'jh-plus', difficulty: 3, is_active: 'TRUE' });

  // ===== ① Barabara シート =====
  const barabara = wb.addWorksheet('① Barabara', { properties: { tabColor: { argb: 'FFFFC107' } } });
  barabara.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'word', key: 'word', width: 30 },
    { header: 'decoy (任意)', key: 'decoy', width: 30 },
  ];
  barabara.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  barabara.addRow({ pack_id: '【必須】', word: '【必須】ばらばら配置する単語', decoy: 'クイズのダミー選択肢（任意）' });
  barabara.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  const barabaraWords = ['りんご', 'みかん', 'ぶどう', 'いちご', 'もも', 'なし', 'バナナ', 'すいか', 'メロン', 'キウイ', 'パイナップル', 'マンゴー', 'さくらんぼ', 'グレープフルーツ', 'ラズベリー'];
  const decoys = ['トマト', 'きゅうり', 'にんじん', 'じゃがいも', 'たまねぎ'];
  for (const w of barabaraWords) {
    barabara.addRow({ pack_id: 'PACK_001', word: w, decoy: '' });
  }
  for (const d of decoys) {
    barabara.addRow({ pack_id: 'PACK_001', word: '', decoy: d });
  }

  // ===== ② Line1 シート =====
  const line1 = wb.addWorksheet('② Line1', { properties: { tabColor: { argb: 'FF74B9FF' } } });
  line1.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'line_text', key: 'line_text', width: 50 },
  ];
  line1.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  line1.addRow({ pack_id: '【必須】', line_text: '【必須】1行瞬間読み用の短文（30字以内）' });
  line1.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  const line1Texts = [
    'メロスは激怒した。',
    '邪智暴虐の王を除かねばならぬ。',
    'メロスには政治がわからぬ。',
    'メロスは村の牧人である。',
    '笛を吹き、羊と遊んで暮らしてきた。',
    'けれども邪悪には敏感であった。',
    '今日未明メロスは村を出発した。',
    '野を越え山越え、十里離れた町にやってきた。',
    'メロスには父も母もない。',
    '女房もない。',
  ];
  for (const t of line1Texts) {
    line1.addRow({ pack_id: 'PACK_001', line_text: t });
  }

  // ===== ③ Line2 シート =====
  const line2 = wb.addWorksheet('③ Line2', { properties: { tabColor: { argb: 'FF00B894' } } });
  line2.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'pair_no', key: 'pair_no', width: 10 },
    { header: 'line1', key: 'line1', width: 40 },
    { header: 'line2', key: 'line2', width: 40 },
  ];
  line2.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  line2.addRow({ pack_id: '【必須】', pair_no: '【必須】連番', line1: '【必須】1行目（30字以内）', line2: '【必須】2行目（30字以内）' });
  line2.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  const line2Pairs = [
    ['メロスは激怒した。必ず、', 'かの邪智暴虐の王を除かねばならぬ。'],
    ['メロスには政治がわからぬ。', 'メロスは村の牧人である。'],
    ['笛を吹き、羊と遊んで暮らしてきた。', 'けれども邪悪には敏感であった。'],
    ['今日未明メロスは村を出発した。', '十里離れた町にやってきた。'],
    ['メロスには父も母もない。', '女房もない。十六の内気な妹と二人暮し。'],
  ];
  line2Pairs.forEach((p, i) => {
    line2.addRow({ pack_id: 'PACK_001', pair_no: i + 1, line1: p[0], line2: p[1] });
  });

  // ===== ④ Main シート =====
  const main = wb.addWorksheet('④ Main', { properties: { tabColor: { argb: 'FFFD79A8' } } });
  main.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'body', key: 'body', width: 100 },
    { header: 'char_count', key: 'char_count', width: 12 },
  ];
  main.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  main.addRow({ pack_id: '【必須】', body: '【必須】高速読み用本文（5,000〜20,000字推奨・セル内改行OK）', char_count: '自動計算' });
  main.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  const sampleMain = `メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。メロスには政治がわからぬ。メロスは、村の牧人である。笛を吹き、羊と遊んで暮して来た。けれども邪悪に対しては、人一倍に敏感であった。きょう未明メロスは村を出発し、野を越え山越え、十里はなれた此のシラクスの市にやって来た。メロスには父も、母も無い。女房も無い。十六の、内気な妹と二人暮しだ。この妹は、村のある律気な一牧人を、近々、花婿として迎える事になっていた。結婚式も間近かなのである。メロスは、それゆえ、花嫁の衣裳やら祝宴の御馳走やらを買いに、はるばる市にやって来たのだ。先ず、その品々を買い集め、それから都の大路をぶらぶら歩いた。メロスには竹馬の友があった。セリヌンティウスである。今は此のシラクスの市で、石工をしている。その友を、これから訪ねてみるつもりなのだ。…（以下5000字以上続く）`;
  main.addRow({ pack_id: 'PACK_001', body: sampleMain, char_count: sampleMain.length });
  main.getCell(3, 2).alignment = { wrapText: true, vertical: 'top' };

  // ===== 🎯 Quizzes シート =====
  const quizzes = wb.addWorksheet('🎯 Quizzes', { properties: { tabColor: { argb: 'FFE84393' } } });
  quizzes.columns = [
    { header: 'pack_id', key: 'pack_id', width: 20 },
    { header: 'q_no', key: 'q_no', width: 8 },
    { header: 'question', key: 'question', width: 40 },
    { header: 'choice_a', key: 'choice_a', width: 20 },
    { header: 'choice_b', key: 'choice_b', width: 20 },
    { header: 'choice_c', key: 'choice_c', width: 20 },
    { header: 'choice_d', key: 'choice_d', width: 20 },
    { header: 'correct', key: 'correct', width: 10 },
    { header: 'explanation', key: 'explanation', width: 40 },
  ];
  quizzes.getRow(1).eachCell(c => Object.assign(c, headerStyle));
  quizzes.addRow({ pack_id: '【必須】', q_no: '1〜5', question: '【必須】', choice_a: '【必須】', choice_b: '【必須】', choice_c: '【必須】', choice_d: '【必須】', correct: 'A/B/C/D', explanation: '（任意）' });
  quizzes.getRow(2).eachCell(c => Object.assign(c, noteStyle));

  const quizData = [
    ['PACK_001', 1, '主人公の名前は？', 'メロス', 'セリヌンティウス', 'ディオニス王', '妹', 'A', '物語の冒頭で登場する激怒する人物'],
    ['PACK_001', 2, 'メロスの職業は？', '商人', '牧人', '石工', '兵士', 'B', '羊と遊んで暮らしていた'],
    ['PACK_001', 3, 'メロスがシラクスに来た目的は？', '王に会うため', '石を買うため', '妹の結婚の準備', '旅行', 'C', '妹の花嫁衣裳や祝宴の御馳走を買いに来た'],
    ['PACK_001', 4, 'メロスの竹馬の友は？', 'セリヌンティウス', 'ディオニス', 'フィロストラトス', '妹', 'A', 'シラクスで石工をしている友人'],
    ['PACK_001', 5, 'メロスの家族構成は？', '両親と妹', '妹と二人暮らし', '一人暮らし', '妻と子供', 'B', '父母なく、十六の妹と二人暮らし'],
  ];
  for (const q of quizData) {
    quizzes.addRow({
      pack_id: q[0], q_no: q[1], question: q[2],
      choice_a: q[3], choice_b: q[4], choice_c: q[5], choice_d: q[6],
      correct: q[7], explanation: q[8],
    });
  }

  // ===== 📖 README シート =====
  const readme = wb.addWorksheet('📖 README', { properties: { tabColor: { argb: 'FF888888' } } });
  readme.columns = [{ header: '', key: 'col', width: 120 }];
  const readmeRows = [
    ['📖 100万人の速読 - コンテンツパック一括インポート テンプレート'],
    [''],
    ['【使い方】'],
    ['1. 各シートに必要な情報を入力します'],
    ['2. pack_id は全シートで一貫させてください（例: PACK_001, PACK_002, ...）'],
    ['3. 完了したらこのファイルをシステムにアップロード'],
    [''],
    ['【各シートの説明】'],
    ['📘 Packs: パック基本情報（1行=1パック）'],
    ['  - target_course: basic（速読基本トレーニング用）または genre（ジャンル別コース用）'],
    ['  - koe_e: basic時のみ必須。koe（声になる文）または e（絵になる文）'],
    ['  - genre_id: genre時のみ必須。story/moral/trivia/biography/social/science/+塾独自ID'],
    ['  - grade_level: preschool-g3 / g4-g6 / jh-plus'],
    ['  - difficulty: 1（やさしい）/ 2（ふつう）/ 3（むずかしい）'],
    [''],
    ['① Barabara: ばらばら瞬間読み用の単語（50個以上推奨・シャッフル出題）'],
    ['  - decoy: クイズのダミー選択肢（任意）'],
    [''],
    ['② Line1: 1行瞬間読み用の短文（50問以上推奨・シャッフル出題）'],
    ['  - line_text: 1行の文章（たて24字/よこ30字以内）'],
    [''],
    ['③ Line2: 2行瞬間読み用の文章ペア（50ペア以上推奨・シャッフル出題）'],
    ['  - line1: 1行目（30字以内）'],
    ['  - line2: 2行目（30字以内）'],
    [''],
    ['④ Main: 高速読み用本文（1行=1パック、5,000〜20,000字推奨）'],
    ['  - body: 長文。セル内改行可。長いほどランダム出題で飽きずに学習できます'],
    [''],
    ['🎯 Quizzes: 内容理解クイズ（5問/パック・固定）'],
    ['  - correct: A / B / C / D のいずれか'],
    [''],
    ['【注意事項】'],
    ['- pack_id は英数字とアンダースコアのみ使用してください'],
    ['- 必須項目が欠落している行はインポート時に警告されます'],
    ['- 既存のpack_idと重複する場合、インポート時に「上書き / スキップ」を選択できます'],
    [''],
    ['お問い合わせ: 名大SKY運営事務局'],
  ];
  for (const r of readmeRows) {
    const row = readme.addRow({ col: r[0] });
    if (r[0].startsWith('【')) {
      row.font = { bold: true, size: 12, color: { argb: 'FF1478C3' } };
    } else if (r[0].startsWith('📖')) {
      row.font = { bold: true, size: 14, color: { argb: 'FF00345B' } };
    }
  }

  const xlsxPath = path.join(OUT_DIR, 'sokudoku_content_template.xlsx');
  await wb.xlsx.writeFile(xlsxPath);
  console.log('✓ Generated:', xlsxPath);
}

// CSV生成（ZIP風に1ファイルずつ）
function createCsvs() {
  const files = {
    'packs.csv': [
      ['pack_id', 'title', 'target_course', 'koe_e', 'genre_id', 'grade_level', 'difficulty', 'is_active'],
      ['PACK_001', '走れメロス 〜友情のお話〜', 'basic', 'koe', '', 'g4-g6', '2', 'TRUE'],
      ['PACK_002', '雨の日の図書館', 'basic', 'e', '', 'g4-g6', '1', 'TRUE'],
      ['PACK_003', '桃太郎', 'genre', '', 'story', 'preschool-g3', '1', 'TRUE'],
      ['PACK_004', '宇宙のはじまり', 'genre', '', 'science', 'jh-plus', '3', 'TRUE'],
    ],
    'barabara.csv': [
      ['pack_id', 'word', 'decoy'],
      ['PACK_001', 'りんご', ''],
      ['PACK_001', 'みかん', ''],
      ['PACK_001', 'ぶどう', ''],
      ['PACK_001', 'いちご', ''],
      ['PACK_001', '', 'トマト'],
      ['PACK_001', '', 'きゅうり'],
    ],
    'line1.csv': [
      ['pack_id', 'line_text'],
      ['PACK_001', 'メロスは激怒した。'],
      ['PACK_001', '邪智暴虐の王を除かねばならぬ。'],
      ['PACK_001', 'メロスには政治がわからぬ。'],
    ],
    'line2.csv': [
      ['pack_id', 'pair_no', 'line1', 'line2'],
      ['PACK_001', '1', 'メロスは激怒した。必ず、', 'かの邪智暴虐の王を除かねばならぬ。'],
      ['PACK_001', '2', 'メロスには政治がわからぬ。', 'メロスは村の牧人である。'],
    ],
    'main.csv': [
      ['pack_id', 'body'],
      ['PACK_001', 'メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。…（5000字以上）'],
    ],
    'quizzes.csv': [
      ['pack_id', 'q_no', 'question', 'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct', 'explanation'],
      ['PACK_001', '1', '主人公の名前は？', 'メロス', 'セリヌンティウス', 'ディオニス王', '妹', 'A', ''],
      ['PACK_001', '2', 'メロスの職業は？', '商人', '牧人', '石工', '兵士', 'B', ''],
    ],
  };

  const escape = v => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  for (const [name, rows] of Object.entries(files)) {
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    // UTF-8 with BOM for Excel compatibility
    const outPath = path.join(OUT_DIR, name);
    fs.writeFileSync(outPath, '\uFEFF' + csv, 'utf8');
    console.log('✓ Generated:', outPath);
  }
}

await createXlsx();
createCsvs();
console.log('Done!');
