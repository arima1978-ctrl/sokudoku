'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudent } from '@/app/actions/adminStudents'

interface EditStudentFormProps {
  studentId: string
  defaultName: string
  defaultPassword: string
  defaultGradeId: string
  defaultStatus: string
  loginId: string
  grades: Array<{ id: string; name: string }>
}

export default function EditStudentForm({
  studentId,
  defaultName,
  defaultPassword,
  defaultGradeId,
  defaultStatus,
  loginId,
  grades,
}: EditStudentFormProps) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [password, setPassword] = useState(defaultPassword)
  const [gradeId, setGradeId] = useState(defaultGradeId)
  const [status, setStatus] = useState(defaultStatus)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await updateStudent(studentId, {
        student_name: name,
        student_password: password,
        grade_level_id: gradeId,
        status,
      })
      if (result.success) {
        router.push(`/admin/students/${studentId}`)
      } else {
        setError(result.error ?? '更新に失敗しました')
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">ログインID</label>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 font-mono">{loginId}</div>
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">生徒名</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">パスワード</label>
          <input
            id="password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="grade" className="mb-1 block text-sm font-medium text-zinc-700">学年</label>
          <select
            id="grade"
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">未設定</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-zinc-700">ステータス</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">利用中</option>
            <option value="inactive">停止中</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/students/${studentId}`)}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  )
}
