import { NextRequest, NextResponse } from 'next/server'
import { recordClick, getLinkByCode } from '@/lib/links'
import { parseUserAgent, getClientIp, extractUtmParams } from '@/lib/analytics'

// POST /api/analytics/track - Registra evento de clique
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { linkCode, waitedFull, clickedButton, timeOnPage } = body

    if (!linkCode) {
      return NextResponse.json(
        { success: false, error: 'linkCode is required' },
        { status: 400 }
      )
    }

    // Busca o link
    const link = await getLinkByCode(linkCode)
    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    // Extrai informações do request
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || undefined
    const referer = request.headers.get('referer') || undefined

    // Parse user agent
    const deviceInfo = userAgent ? parseUserAgent(userAgent) : {}

    // Extrai UTM params do referer
    const utmParams = referer ? extractUtmParams(referer) : {}

    // Registra o clique
    await recordClick(link.id, linkCode, {
      ip: ip || undefined,
      userAgent,
      referer,
      ...deviceInfo,
      ...utmParams,
      waitedFull,
      clickedButton,
      timeOnPage,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking click:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track click' },
      { status: 500 }
    )
  }
}
