'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ContentPackDetail,
  replaceBarabaraWords,
  replaceLine1Texts,
  replaceLine2Pairs,
  replaceMainText,
  replaceQuizzes,
  deleteContentPack,
  updateContentPack,
} from '@/app/actions/contentPacks'

type Tab = 'meta' | 'barabara' | 'line1' | 'line2' | 'main' | 'quiz'

export default function PackEditor({ pack }: { pack: ContentPackDetail }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('meta')
  const [isPending, startTransition] = useTransition()

  const tabs: Array<{ key: Tab; label: string; icon: string; warn?: boolean }> = [
    { key: 'meta', label: '基本情報', icon: '📋' },
    { key: 'barabara', label: `① ばらばら (${pack.barabaraCount})`, icon: '🔡', warn: pack.barabaraCount < 50 },
    { key: 'line1', label: `② 1行 (${pack.line1Count})`, icon: '1️⃣', warn: pack.line1Count < 50 },
    { key: 'line2', label: `③ 2行 (${pack.line2Count})`, icon: '2️⃣', warn: pack.line2Count < 50 },
    { key: 'main', label: `④ 本文 (${pack.mainCharCount}字)`, icon: '📄', warn: pack.mainCharCount < 5000 },
    { key: 'quiz', label: `🎯 クイズ (${pack.quizCount}/6)`, icon: '❓', warn: pack.quizCount !== 6 },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">{pack.title}</h1>
          <div className="flex gap-2 flex-wrap">
            <Badge color={pack.targetCourse === 'basic' ? 'blue' : 'emerald'}>
              {pack.targetCourse === 'basic' ? '📘 速読基本' : '📚 ジャンル別'}
            </Badge>
            {pack.koeE && (
              <Badge color={pack.koeE === 'koe' ? 'blue' : 'orange'}>
                {pack.koeE === 'koe' ? '🔊 声' : '🎨 絵'}
              </Badge>
            )}
            {pack.subjectName && <Badge color="gray">{pack.subjectName}</Badge>}
            <Badge color="gray">{pack.gradeLevelId}</Badge>
            <Badge color="gray">難易度 {pack.difficulty}</Badge>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('このパックを削除しますか？（子データもすべて削除されます）')) {
              startTransition(async () => {
                await deleteContentPack(pack.id)
                router.push('/admin/contents')
              })
            }
          }}
          className="text-sm px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
        >
          削除
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              tab === t.key
                ? 'bg-blue-600 text-white font-bold'
                : t.warn
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-white text-zinc-700 border border-zinc-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* タブ内容 */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        {tab === 'meta' && <MetaEditor pack={pack} onSaved={() => router.refresh()} />}
        {tab === 'barabara' && <BarabaraEditor pack={pack} onSaved={() => router.refresh()} />}
        {tab === 'line1' && <Line1Editor pack={pack} onSaved={() => router.refresh()} />}
        {tab === 'line2' && <Line2Editor pack={pack} onSaved={() => router.refresh()} />}
        {tab === 'main' && <MainEditor pack={pack} onSaved={() => router.refresh()} />}
        {tab === 'quiz' && <QuizEditor pack={pack} onSaved={() => router.refresh()} />}
      </div>

      {isPending && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg">処理中...</div>}
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: 'blue' | 'emerald' | 'orange' | 'gray' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-zinc-100 text-zinc-700',
  }
  return <span className={`text-xs px-2 py-1 rounded font-bold ${colors[color]}`}>{children}</span>
}

function MetaEditor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [title, setTitle] = useState(pack.title)
  const [difficulty, setDifficulty] = useState(pack.difficulty)
  const [isActive, setIsActive] = useState(pack.isActive)
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">難易度</label>
        <select
          value={difficulty}
          onChange={e => setDifficulty(Number(e.target.value))}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl"
        >
          <option value={1}>1 (やさしい)</option>
          <option value={2}>2 (ふつう)</option>
          <option value={3}>3 (むずかしい)</option>
        </select>
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          <span className="text-sm">公開中（生徒が選択可能）</span>
        </label>
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          await updateContentPack({ packId: pack.id, title, difficulty, isActive })
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function BarabaraEditor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [words, setWords] = useState(pack.barabaraWords.map(w => w.word).join('\n'))
  const [decoys, setDecoys] = useState(pack.barabaraWords.filter(w => w.isDecoy).map(w => w.word).join('\n'))
  const [saving, setSaving] = useState(false)
  const wordList = words.split('\n').map(s => s.trim()).filter(Boolean)
  const decoyList = decoys.split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
        💡 50個以上推奨（シャッフル出題）。1行1単語で入力してください。
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">
          ばらばら用単語 <span className="text-zinc-500">({wordList.length}個)</span>
        </label>
        <textarea
          value={words}
          onChange={e => setWords(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl font-mono text-sm"
          rows={15}
          placeholder={'りんご\nみかん\nぶどう\n...'}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">
          ダミー選択肢（任意） <span className="text-zinc-500">({decoyList.length}個)</span>
        </label>
        <textarea
          value={decoys}
          onChange={e => setDecoys(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl font-mono text-sm"
          rows={5}
          placeholder={'トマト\nきゅうり\n...'}
        />
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          await replaceBarabaraWords(pack.id, [
            ...wordList.map(w => ({ word: w, isDecoy: false })),
            ...decoyList.map(w => ({ word: w, isDecoy: true })),
          ])
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function Line1Editor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [texts, setTexts] = useState(pack.line1Texts.map(t => t.lineText).join('\n'))
  const [saving, setSaving] = useState(false)
  const list = texts.split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        💡 1行24-30字以内の短文を50問以上推奨。1行1問で入力してください。
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">
          1行瞬間読み用短文 <span className="text-zinc-500">({list.length}問)</span>
        </label>
        <textarea
          value={texts}
          onChange={e => setTexts(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl font-mono text-sm"
          rows={20}
          placeholder={'メロスは激怒した。\n邪智暴虐の王を除かねばならぬ。\n...'}
        />
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          await replaceLine1Texts(pack.id, list)
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function Line2Editor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [pairs, setPairs] = useState<Array<{ line1: string; line2: string }>>(
    pack.line2Pairs.length > 0
      ? pack.line2Pairs.map(p => ({ line1: p.line1, line2: p.line2 }))
      : [{ line1: '', line2: '' }]
  )
  const [saving, setSaving] = useState(false)

  const addPair = () => setPairs([...pairs, { line1: '', line2: '' }])
  const removePair = (i: number) => setPairs(pairs.filter((_, idx) => idx !== i))
  const updatePair = (i: number, key: 'line1' | 'line2', value: string) => {
    const newPairs = [...pairs]
    newPairs[i] = { ...newPairs[i], [key]: value }
    setPairs(newPairs)
  }

  const validPairs = pairs.filter(p => p.line1.trim() && p.line2.trim())

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
        💡 1行目と2行目のペアで1問。各30字以内、50ペア以上推奨。
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">
          2行瞬間読み用ペア <span className="text-zinc-500">({validPairs.length}ペア)</span>
        </label>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {pairs.map((p, i) => (
            <div key={i} className="p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-600">ペア #{i + 1}</span>
                {pairs.length > 1 && (
                  <button onClick={() => removePair(i)} className="text-xs text-red-600">
                    削除
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={p.line1}
                  onChange={e => updatePair(i, 'line1', e.target.value)}
                  placeholder="1行目"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={p.line2}
                  onChange={e => updatePair(i, 'line2', e.target.value)}
                  placeholder="2行目"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addPair} className="mt-3 text-sm px-4 py-2 border border-zinc-300 rounded-lg">
          ＋ ペアを追加
        </button>
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          await replaceLine2Pairs(pack.id, validPairs)
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function MainEditor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [body, setBody] = useState(pack.mainBody ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-xs text-pink-800">
        💡 高速読み用本文。5,000〜20,000字推奨。長文だと読み始め位置ランダム出題が可能に。
      </div>
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">
          本文 <span className="text-zinc-500">({body.length}字 / 推奨5,000〜20,000字)</span>
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-300 rounded-xl font-mono text-sm"
          rows={25}
          placeholder="高速読み用の長文を入力..."
        />
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          await replaceMainText(pack.id, body)
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function QuizEditor({ pack, onSaved }: { pack: ContentPackDetail; onSaved: () => void }) {
  const [quizzes, setQuizzes] = useState(() => {
    const defaults = Array.from({ length: 6 }, (_, i) => ({
      questionNo: i + 1,
      questionText: '',
      choiceA: '',
      choiceB: '',
      choiceC: '',
      choiceD: '',
      correct: 'A' as 'A' | 'B' | 'C' | 'D',
      explanation: '',
    }))
    for (const q of pack.quizzes) {
      if (q.questionNo >= 1 && q.questionNo <= 6) {
        defaults[q.questionNo - 1] = {
          questionNo: q.questionNo,
          questionText: q.questionText,
          choiceA: q.choiceA,
          choiceB: q.choiceB,
          choiceC: q.choiceC,
          choiceD: q.choiceD,
          correct: q.correct,
          explanation: q.explanation ?? '',
        }
      }
    }
    return defaults
  })
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof typeof quizzes[0]>(i: number, key: K, value: typeof quizzes[0][K]) => {
    const newQuizzes = [...quizzes]
    newQuizzes[i] = { ...newQuizzes[i], [key]: value }
    setQuizzes(newQuizzes)
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
        💡 内容理解クイズ6問（2問間違いまでOK）。全問入力必須です。
      </div>
      <div className="space-y-4">
        {quizzes.map((q, i) => (
          <div key={i} className="p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-block text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded">Q{q.questionNo}</span>
            </div>
            <input
              type="text"
              value={q.questionText}
              onChange={e => update(i, 'questionText', e.target.value)}
              placeholder="問題文"
              className="w-full px-3 py-2 border border-zinc-300 rounded mb-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B', 'C', 'D'] as const).map(k => (
                <div key={k} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q${i}_correct`}
                    checked={q.correct === k}
                    onChange={() => update(i, 'correct', k)}
                  />
                  <span className="font-bold text-xs">{k}</span>
                  <input
                    type="text"
                    value={q[`choice${k}` as 'choiceA']}
                    onChange={e => update(i, `choice${k}` as 'choiceA', e.target.value)}
                    placeholder={`選択肢${k}`}
                    className="flex-1 px-2 py-1 border border-zinc-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={async () => {
          setSaving(true)
          const valid = quizzes.filter(q => q.questionText && q.choiceA && q.choiceB && q.choiceC && q.choiceD)
          await replaceQuizzes(pack.id, valid)
          setSaving(false)
          onSaved()
        }}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? '保存中...' : '6問まとめて保存'}
      </button>
    </div>
  )
}
