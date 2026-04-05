import { NextResponse } from 'next/server'
import { generateWeeklyReports } from '@/app/actions/notification'

// POST /api/notifications/weekly
// cron ジョブまたは管理画面から呼び出して週次レポートを一括生成
export async function POST(request: Request) {
  // 簡易認証（環境変数のAPIキーで保護）
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.CRON_API_KEY

  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateWeeklyReports()
    return NextResponse.json({
      success: true,
      message: `${result.count}件の週次レポートを生成しました`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
