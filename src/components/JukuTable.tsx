'use client'

import { useState } from 'react'
import type { Juku, MemberType, JukuStatus } from '@/types/database'
import { MEMBER_TYPE_LABELS, JUKU_STATUS_LABELS } from '@/types/database'

interface JukuTableProps {
  initialData: Juku[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function JukuTable({ initialData }: JukuTableProps) {
  const [data] = useState(initialData)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = data.filter((juku) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      juku.juku_name.toLowerCase().includes(q) ||
      juku.juku_id.toLowerCase().includes(q) ||
      juku.family_code.toLowerCase().includes(q)
    )
  })

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="塾名・塾ID・家族コードで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <span className="text-sm text-zinc-500">{filtered.length} 件</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">塾ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">塾名</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">パスワード</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">会員種別</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">担当者</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">電話番号</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400">
                  データがありません
                </td>
              </tr>
            )}
            {filtered.map((juku) => (
              <tr key={juku.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                  {juku.juku_id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {juku.juku_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(juku.password, juku.id)}
                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    title="クリックでコピー"
                  >
                    {copiedId === juku.id ? 'Copied!' : '****'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {MEMBER_TYPE_LABELS[juku.member_type as MemberType] ?? juku.member_type}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[juku.status] ?? ''}`}>
                    {JUKU_STATUS_LABELS[juku.status as JukuStatus] ?? juku.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {juku.tantou ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {juku.tel ?? '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500">
                  {new Date(juku.created_at).toLocaleDateString('ja-JP')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
