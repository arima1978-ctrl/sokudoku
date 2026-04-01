'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'

interface TrainingHeaderProps {
  studentName: string | null
  studentLoginId: string
}

export default function TrainingHeader({
  studentName,
  studentLoginId,
}: TrainingHeaderProps) {
  const router = useRouter()

  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          戻る
        </button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {studentName ?? studentLoginId}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded bg-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
