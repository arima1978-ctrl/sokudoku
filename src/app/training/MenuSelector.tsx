'use client'

import { useRouter } from 'next/navigation'

interface MenuSelectorProps {
  menus: Array<Record<string, unknown>>
  stepId: string
}

const DURATION_LABELS: Record<number, string> = {
  5: '5分',
  10: '10分',
  15: '15分',
  20: '20分',
}

const DURATION_COLORS: Record<number, string> = {
  5: 'border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-950',
  10: 'border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950',
  15: 'border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950',
  20: 'border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-950',
}

export default function MenuSelector({ menus, stepId }: MenuSelectorProps) {
  const router = useRouter()

  function handleSelect(menuId: string) {
    router.push(`/training/session?menu=${menuId}&step=${stepId}`)
  }

  if (menus.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        利用可能なメニューがありません。
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {menus.map((menu) => {
        const duration = menu.duration_min as number
        const menuId = menu.id as string
        return (
          <button
            key={menuId}
            type="button"
            onClick={() => handleSelect(menuId)}
            className={`rounded-xl border-2 bg-white p-6 text-center transition-colors dark:bg-zinc-900 ${DURATION_COLORS[duration] ?? 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'}`}
          >
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {DURATION_LABELS[duration] ?? `${duration}分`}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              トレーニング開始
            </div>
          </button>
        )
      })}
    </div>
  )
}
