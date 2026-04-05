'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/onboarding'

interface OnboardingFormProps {
  grades: Array<{ id: string; name: string; display_order: number }>
  subjects: Array<{ id: string; name: string; icon: string | null; display_order: number }>
  defaultName: string
}

export default function OnboardingForm({ grades, subjects, defaultName }: OnboardingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(defaultName)
  const [gradeId, setGradeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const result = await completeOnboarding(name, gradeId, subjectId, parentEmail)
      if (result.success) {
        router.push('/training')
      } else {
        setError(result.error ?? '登録に失敗しました')
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* ステップインジケーター */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-zinc-200'}`}
          />
        ))}
      </div>

      {/* Step 1: 名前と学年 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              名前（ニックネーム）
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="たろう"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              学年
            </label>
            <div className="grid grid-cols-3 gap-2">
              {grades.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGradeId(g.id)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    gradeId === g.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) { setError('名前を入力してください'); return }
              if (!gradeId) { setError('学年を選択してください'); return }
              setError('')
              setStep(2)
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            次へ
          </button>
        </div>
      )}

      {/* Step 2: ジャンル選択 */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              学習したいジャンル
            </label>
            <p className="mb-3 text-xs text-zinc-500">
              選んだジャンルの文章でトレーニングします
            </p>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(s.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-colors ${
                    subjectId === s.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <span className="text-2xl">{s.icon ?? ''}</span>
                  <span className={`text-sm font-medium ${
                    subjectId === s.id ? 'text-blue-700' : 'text-zinc-700'
                  }`}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={() => {
                if (!subjectId) { setError('ジャンルを選択してください'); return }
                setError('')
                setStep(3)
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 保護者メール(任意) + 確認 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-700">登録内容</h3>
            <div className="space-y-1 text-sm text-zinc-600">
              <p>名前: <span className="font-medium text-zinc-900">{name}</span></p>
              <p>学年: <span className="font-medium text-zinc-900">{grades.find(g => g.id === gradeId)?.name}</span></p>
              <p>ジャンル: <span className="font-medium text-zinc-900">{subjects.find(s => s.id === subjectId)?.name}</span></p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              保護者のメールアドレス（任意）
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              トレーニングの成果レポートをお送りします
            </p>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '登録中...' : 'トレーニング開始'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
