import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContentPack } from '@/app/actions/contentPacks'
import PackEditor from './PackEditor'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function ContentPackDetailPage(props: PageProps) {
  const { id } = await props.params
  const pack = await getContentPack(id)
  if (!pack) notFound()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 text-sm">
        <Link href="/admin/contents" className="text-blue-600 hover:underline">
          ← コンテンツパック一覧
        </Link>
      </div>

      <PackEditor pack={pack} />
    </div>
  )
}
