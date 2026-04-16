import Link from 'next/link'
import { listContentPacks } from '@/app/actions/contentPacks'

export const dynamic = 'force-dynamic'

export default async function ContentPacksPage() {
  const packs = await listContentPacks({ showInactive: true })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">📚 コンテンツパック管理</h1>
          <p className="text-sm text-zinc-500 mt-1">
            生徒がトレーニング時に選ぶパック単位でコンテンツを管理します
          </p>
        </div>
        <Link
          href="/admin/contents/new"
          className="px-5 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-xl font-bold shadow-md"
        >
          ＋ 新規作成
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-zinc-200">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-zinc-600 mb-4">まだコンテンツパックがありません</p>
          <Link
            href="/admin/contents/new"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl font-bold"
          >
            最初のパックを作成
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map(p => (
            <Link
              key={p.id}
              href={`/admin/contents/${p.id}`}
              className={`block bg-white rounded-2xl p-5 border-l-4 shadow-sm hover:shadow-md transition ${
                p.ownerSchoolId ? 'border-l-emerald-500' : 'border-l-blue-500'
              } ${!p.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h2 className="text-base font-bold flex-1">{p.title}</h2>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                    p.ownerSchoolId ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {p.ownerSchoolId ? '🏫 自塾' : '🌐 共有'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    p.targetCourse === 'basic'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {p.targetCourse === 'basic' ? '📘 速読基本' : '📚 ジャンル別'}
                </span>
                {p.koeE && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      p.koeE === 'koe' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {p.koeE === 'koe' ? '🔊 声' : '🎨 絵'}
                  </span>
                )}
                {p.subjectName && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    {p.subjectName}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                  {p.gradeLevelId}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                  難易度{p.difficulty}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 text-xs">
                <CountBadge label="ばらばら" count={p.barabaraCount} target={50} />
                <CountBadge label="1行" count={p.line1Count} target={50} />
                <CountBadge label="2行" count={p.line2Count} target={50} />
                <CountBadge label="本文" count={p.hasMainText ? 1 : 0} target={1} asFlag />
                <CountBadge label="クイズ" count={p.quizCount} target={6} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function CountBadge({ label, count, target, asFlag }: { label: string; count: number; target: number; asFlag?: boolean }) {
  const ok = asFlag ? count === 1 : count >= target
  return (
    <div className={`text-center py-1.5 rounded border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
      <div className="font-bold">{asFlag ? (count === 1 ? '✓' : '✗') : count}</div>
      <div className="text-[10px]">{label}</div>
    </div>
  )
}
