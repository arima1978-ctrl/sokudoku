'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createContent, updateContent, deleteContent } from '@/app/actions/contents'

interface ContentFormInitial {
  id: string
  title: string
  body: string
  grade_level_id: string | null
  subject_id: string | null
  difficulty: number | null
  is_active: boolean
  recognition_in_words: string[]
  recognition_decoy_words: string[]
}

interface ContentFormProps {
  mode: 'new' | 'edit'
  initial?: ContentFormInitial
  canDelete: boolean
}

const EMPTY_WORDS: string[] = ['', '', '', '', '']

function pad5(arr: string[]): string[] {
  const out = [...arr]
  while (out.length < 5) out.push('')
  return out.slice(0, 5)
}

export default function ContentForm({ mode, initial, canDelete }: ContentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [gradeLevelId, setGradeLevelId] = useState(initial?.grade_level_id ?? '')
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? '')
  const [difficulty, setDifficulty] = useState<string>(
    initial?.difficulty != null ? String(initial.difficulty) : ''
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [inWords, setInWords] = useState<string[]>(pad5(initial?.recognition_in_words ?? EMPTY_WORDS))
  const [decoyWords, setDecoyWords] = useState<string[]>(pad5(initial?.recognition_decoy_words ?? EMPTY_WORDS))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanInWords = inWords.map(w => w.trim()).filter(Boolean)
    const cleanDecoyWords = decoyWords.map(w => w.trim()).filter(Boolean)

    if (cleanInWords.length !== 5) {
      setError('本文中の単語は5語すべて入力してください')
      return
    }
    if (cleanDecoyWords.length !== 5) {
      setError('ダミー単語は5語すべて入力してください')
      return
    }
    if (new Set([...cleanInWords, ...cleanDecoyWords]).size !== 10) {
      setError('認識単語に重複があります')
      return
    }

    const input = {
      title,
      body,
      grade_level_id: gradeLevelId || null,
      subject_id: subjectId || null,
      difficulty: difficulty ? Number(difficulty) : null,
      is_active: isActive,
      recognition_in_words: cleanInWords,
      recognition_decoy_words: cleanDecoyWords,
    }

    startTransition(async () => {
      if (mode === 'new') {
        const result = await createContent(input)
        if (result.success) {
          router.push('/admin/contents')
          router.refresh()
        } else {
          setError(result.error ?? '保存に失敗しました')
        }
      } else if (initial) {
        const result = await updateContent(initial.id, input)
        if (result.success) {
          router.push('/admin/contents')
          router.refresh()
        } else {
          setError(result.error ?? '更新に失敗しました')
        }
      }
    })
  }

  function handleDelete() {
    if (!initial) return
    if (!confirm('このコンテンツを削除しますか？')) return
    startTransition(async () => {
      const result = await deleteContent(initial.id)
      if (result.success) {
        router.push('/admin/contents')
        router.refresh()
      } else {
        setError(result.error ?? '削除に失敗しました')
      }
    })
  }

  const updateWordAt = (list: string[], setList: (v: string[]) => void, idx: number, value: string) => {
    const next = [...list]
    next[idx] = value
    setList(next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          本文
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          required
          rows={12}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {body.replace(/\s+/g, '').length} 文字
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">学年ID</label>
          <input
            type="text"
            value={gradeLevelId}
            onChange={e => setGradeLevelId(e.target.value)}
            placeholder="例: g4"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">ジャンルID</label>
          <input
            type="text"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            placeholder="例: story"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">難易度</label>
          <input
            type="number"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          有効にする（生徒に配信）
        </label>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4">
        <legend className="px-2 text-sm font-bold text-zinc-700">
          認識テスト用 単語（各5語、必須）
        </legend>
        <p className="mb-3 text-xs text-zinc-500">
          ○問題: 本文中に登場する単語 / ×問題: 本文に登場しないダミー単語
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-2 text-sm font-medium text-blue-700">本文中の単語（正解は○）</div>
            {inWords.map((w, i) => (
              <input
                key={`in-${i}`}
                type="text"
                value={w}
                onChange={e => updateWordAt(inWords, setInWords, i, e.target.value)}
                placeholder={`単語 ${i + 1}`}
                className="mb-2 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
              />
            ))}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-red-700">ダミー単語（正解は×）</div>
            {decoyWords.map((w, i) => (
              <input
                key={`decoy-${i}`}
                type="text"
                value={w}
                onChange={e => updateWordAt(decoyWords, setDecoyWords, i, e.target.value)}
                placeholder={`ダミー ${i + 1}`}
                className="mb-2 w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              />
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '保存中...' : mode === 'new' ? '作成' : '更新'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          キャンセル
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto rounded-lg border border-red-300 px-6 py-2.5 text-sm text-red-700 hover:bg-red-50"
          >
            削除
          </button>
        )}
      </div>
    </form>
  )
}
