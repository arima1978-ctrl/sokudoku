'use client'

interface ContentItem {
  id: string
  title: string
  char_count: number
}

export interface ContentPickerProps {
  label: string
  items: ContentItem[]
  onPick: (contentId: string) => void
}

/**
 * 高速読み/速度計測の直前に、生徒が読みたい文章を選ぶ画面。
 */
export default function ContentPicker({ label, items, onPick }: ContentPickerProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #D4EDFF 0%, #B0D9FF 100%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="mb-4 text-center">
          <div className="mb-2 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white">
            {label}
          </div>
          <h2 className="text-xl font-bold text-zinc-900">読みたい文章を選んでください</h2>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-zinc-500">
            選択可能なコンテンツがありません
          </div>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0 }}>
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: '#fff',
                    border: '2px solid #1478C3',
                    borderRadius: 12,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 'bold', color: '#2A2A2A' }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                    {item.char_count.toLocaleString()} 文字
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
