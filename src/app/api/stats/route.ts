import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/links'
import { prisma } from '@/lib/prisma'

// GET /api/stats - Retorna estatisticas gerais (requer API key)
export async function GET(request: NextRequest) {
  // Validacao de API Key
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API key required' },
      { status: 401 }
    )
  }

  const { valid } = await validateApiKey(apiKey)
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid API key' },
      { status: 401 }
    )
  }

  try {
    // Buscar estatisticas agregadas
    const [totalLinks, activeLinks, totalClicks, linksWithCommentary] = await Promise.all([
      prisma.redirectLink.count(),
      prisma.redirectLink.count({ where: { isActive: true } }),
      prisma.redirectLink.aggregate({ _sum: { clicks: true } }),
      prisma.redirectLink.count({ where: { commentary: { not: null } } }),
    ])

    return NextResponse.json({
      totalLinks,
      activeLinks,
      totalClicks: totalClicks._sum.clicks || 0,
      linksWithCommentary,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
