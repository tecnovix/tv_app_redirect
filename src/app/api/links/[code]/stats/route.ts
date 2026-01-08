import { NextRequest, NextResponse } from 'next/server'
import { getLinkStats } from '@/lib/links'

interface RouteParams {
  params: Promise<{ code: string }>
}

// GET /api/links/:code/stats - Estatísticas do link
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { code } = await params

  try {
    const stats = await getLinkStats(code)

    if (!stats.link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
