'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createContentPack, getSubjectsAndGrades, type SubjectOption, type GradeLevelOption } from '@/app/actions/contentPacks'

export default function NewContentPackPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [targetCourse, setTargetCourse] = useState<'basic' | 'genre'>('basic')
  const [koeE, setKoeE] = useState<'koe' | 'e'>('koe')
  const [subjectId, setSubjectId] = useState<string>('')
  const [gradeLevelId, setGradeLevelId] = useState('g4')
  const [difficulty, setDifficulty] = useState(2)
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { subjects: s, grades: g } = await getSubjectsAndGrades()
      setSubjects(s)
      setGradeLevels(g)
      if (s.length > 0) setSubjectId(s[0].id)
    })()
  }, [])

  const submit = async () => {
    if (!title.trim()) {
      alert('タイトルを入力してください')
      return
    }
    setSubmitting(true)
    try {
      const { id } = await createContentPack({
        title: title.trim(),
        targetCourse,
        koeE: targetCourse === 'basic' ? koeE : null,
        subjectId: targetCourse === 'genre' ? subjectId : null,
        gradeLevelId,
        difficulty,
        ownerSchoolId: null, // 運営塾モード初期値。将来的にロールで切替
      })
      router.push(`/admin/contents/${id}`)
    } catch (e) {
      alert('作成に失敗しました: ' + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-6">📝 新しいコンテンツパックを作成</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6 border border-zinc-200">
        {/* 対象コース */}
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">対象コース <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetCourse('basic')}
              className={`p-4 rounded-xl border-2 text-center ${
                targetCourse === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200'
              }`}
            >
              <div className="text-2xl mb-1">📘</div>
              <div className="font-bold">速読基本</div>
              <div className="text-xs text-zinc-500 mt-1">声/絵のラベル必須</div>
            </button>
            <button
              type="button"
              onClick={() => setTargetCourse('genre')}
              className={`p-4 rounded-xl border-2 text-center ${
                targetCourse === 'genre' ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200'
              }`}
            >
              <div className="text-2xl mb-1">📚</div>
              <div className="font-bold">ジャンル別</div>
              <div className="text-xs text-zinc-500 mt-1">ジャンル所属</div>
            </button>
          </div>
        </div>

        {/* 速読基本: 声/絵 */}
        {targetCourse === 'basic' && (
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">文章タイプ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setKoeE('koe')}
                className={`p-3 rounded-xl border-2 ${
                  koeE === 'koe' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200'
                }`}
              >
                🔊 声になる文
              </button>
              <button
                type="button"
                onClick={() => setKoeE('e')}
                className={`p-3 rounded-xl border-2 ${
                  koeE === 'e' ? 'border-orange-500 bg-orange-50' : 'border-zinc-200'
                }`}
              >
                🎨 絵になる文
              </button>
            </div>
          </div>
        )}

        {/* ジャンル別: 科目 */}
        {targetCourse === 'genre' && (
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">ジャンル <span className="text-red-500">*</span></label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-xl"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.icon ?? '📖'} {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">
            パックタイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例: 走れメロス 〜友情のお話〜"
            className="w-full px-4 py-3 border border-zinc-300 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">対象学年</label>
            <select
              value={gradeLevelId}
              onChange={e => setGradeLevelId(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-xl"
            >
              {gradeLevels.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
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
        </div>

        <div className="pt-4 border-t border-zinc-200 flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/contents')}
            className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {submitting ? '作成中...' : '✓ 作成して編集へ'}
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          作成後、詳細画面で ばらばら・1行・2行・本文・クイズ を登録します
        </p>
      </div>
    </div>
  )
}
