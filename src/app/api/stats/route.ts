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
    // Data de 30 dias atrás para estatísticas recentes
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Buscar estatisticas agregadas
    const [
      totalLinks,
      activeLinks,
      totalClicks,
      linksWithCommentary,
      clicksBySource,
      clicksByCountry,
      clicksByDevice,
      recentClicks,
      topLinks,
      clicksByDay,
    ] = await Promise.all([
      // Contadores básicos
      prisma.redirectLink.count(),
      prisma.redirectLink.count({ where: { isActive: true } }),
      prisma.redirectLink.aggregate({ _sum: { clicks: true } }),
      prisma.redirectLink.count({ where: { commentary: { not: null } } }),

      // Cliques por fonte (source)
      prisma.redirectLink.groupBy({
        by: ['source'],
        _sum: { clicks: true },
        orderBy: { _sum: { clicks: 'desc' } },
      }),

      // Cliques por país (top 10)
      prisma.clickEvent.groupBy({
        by: ['country'],
        where: { country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Cliques por dispositivo
      prisma.clickEvent.groupBy({
        by: ['deviceType'],
        where: { deviceType: { not: null } },
        _count: { deviceType: true },
        orderBy: { _count: { deviceType: 'desc' } },
      }),

      // Total de cliques nos últimos 30 dias
      prisma.clickEvent.count({
        where: { clickedAt: { gte: thirtyDaysAgo } },
      }),

      // Top 10 links mais clicados
      prisma.redirectLink.findMany({
        where: { isActive: true },
        orderBy: { clicks: 'desc' },
        take: 10,
        select: {
          code: true,
          title: true,
          targetUrl: true,
          clicks: true,
          uniqueClicks: true,
          source: true,
        },
      }),

      // Cliques por dia (últimos 30 dias)
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("clickedAt") as date, COUNT(*) as count
        FROM "ClickEvent"
        WHERE "clickedAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("clickedAt")
        ORDER BY date DESC
        LIMIT 30
      `,
    ])

    return NextResponse.json({
      success: true,
      data: {
        // Resumo geral
        summary: {
          totalLinks,
          activeLinks,
          totalClicks: totalClicks._sum.clicks || 0,
          linksWithCommentary,
          recentClicks,
        },

        // Análises por dimensão
        bySource: clicksBySource.map((s) => ({
          source: s.source,
          clicks: s._sum.clicks || 0,
        })),

        byCountry: clicksByCountry.map((c) => ({
          country: c.country!,
          clicks: c._count.country,
        })),

        byDevice: clicksByDevice.map((d) => ({
          device: d.deviceType!,
          clicks: d._count.deviceType,
        })),

        // Top links
        topLinks: topLinks.map((l) => ({
          code: l.code,
          title: l.title,
          targetUrl: l.targetUrl,
          clicks: l.clicks,
          uniqueClicks: l.uniqueClicks,
          source: l.source,
        })),

        // Tendência diária
        clicksByDay: clicksByDay.map((d) => ({
          date: d.date,
          clicks: Number(d.count),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
