import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { validateApiKey } from '@/lib/links'

// POST /api/sync - Sincroniza contadores Redis → PostgreSQL
export async function POST(request: NextRequest) {
  try {
    // Valida API key
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
        { status: 403 }
      )
    }

    // Busca todos os links ativos
    const links = await prisma.redirectLink.findMany({
      where: { isActive: true },
      select: { id: true, code: true, clicks: true },
    })

    let synced = 0
    const errors: string[] = []

    for (const link of links) {
      try {
        // Busca contador no Redis
        const redisClicks = await redis.get(`redirect:clicks:${link.code}`)

        if (redisClicks) {
          const redisCount = parseInt(redisClicks, 10)

          // Se Redis tem mais cliques que o banco, atualiza
          if (redisCount > link.clicks) {
            await prisma.redirectLink.update({
              where: { id: link.id },
              data: { clicks: redisCount },
            })
            synced++
          }
        }
      } catch (error) {
        errors.push(`Error syncing ${link.code}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLinks: links.length,
        synced,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Error syncing:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync' },
      { status: 500 }
    )
  }
}

// GET /api/sync - Verifica status da sincronização
export async function GET(request: NextRequest) {
  try {
    // Valida API key
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
        { status: 403 }
      )
    }

    // Busca todos os links ativos
    const links = await prisma.redirectLink.findMany({
      where: { isActive: true },
      select: { id: true, code: true, clicks: true },
    })

    const discrepancies: Array<{ code: string; db: number; redis: number }> = []

    for (const link of links) {
      try {
        const redisClicks = await redis.get(`redirect:clicks:${link.code}`)

        if (redisClicks) {
          const redisCount = parseInt(redisClicks, 10)

          // Se há diferença, registra
          if (redisCount !== link.clicks) {
            discrepancies.push({
              code: link.code,
              db: link.clicks,
              redis: redisCount,
            })
          }
        }
      } catch {
        // Ignora erros de leitura
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLinks: links.length,
        discrepancies: discrepancies.length,
        details: discrepancies.length > 0 ? discrepancies : undefined,
      },
    })
  } catch (error) {
    console.error('Error checking sync:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check sync' },
      { status: 500 }
    )
  }
}
