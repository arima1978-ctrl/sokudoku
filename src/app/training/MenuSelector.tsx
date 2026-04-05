'use client'

import { useRouter } from 'next/navigation'

interface MenuSelectorProps {
  menus: Array<Record<string, unknown>>
  stepId: string
}

const DURATION_LABELS: Record<number, string> = {
  7: '7分',
  15: '15分',
  30: '30分',
}

const DURATION_COLORS: Record<number, string> = {
  7: 'border-green-300 hover:bg-green-50',
  15: 'border-blue-300 hover:bg-blue-50',
  30: 'border-purple-300 hover:bg-purple-50',
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
    <div className="grid grid-cols-3 gap-4">
      {menus.map((menu) => {
        const duration = menu.duration_min as number
        const menuId = menu.id as string
        return (
          <button
            key={menuId}
            type="button"
            onClick={() => handleSelect(menuId)}
            className={`rounded-xl border-2 bg-white p-6 text-center transition-colors ${DURATION_COLORS[duration] ?? 'border-zinc-300 hover:bg-zinc-50'}`}
          >
            <div className="text-2xl font-bold text-zinc-900">
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
