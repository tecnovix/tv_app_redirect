import { NextRequest, NextResponse } from 'next/server'
import { recordClick, getLinkByCode } from '@/lib/links'
import { parseUserAgent, getClientIp, extractUtmParams, getGeoFromIp } from '@/lib/analytics'

// POST /api/analytics/track - Registra evento de clique
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { linkCode, waitedFull, clickedButton, timeOnPage, accessUrl } = body

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
    const rawIp = ip ? ip.replace('.0', '') : null // IP para geo (antes de anonimizar completamente)
    const userAgent = request.headers.get('user-agent') || undefined
    const referer = request.headers.get('referer') || undefined

    // Headers do Cloudflare (grátis e ilimitado)
    const cfCountry = request.headers.get('cf-ipcountry') || undefined

    // Parse user agent
    const deviceInfo = userAgent ? parseUserAgent(userAgent) : {}

    // Extrai UTM params da URL de acesso (enviada pelo frontend) ou do referer como fallback
    const utmParams = accessUrl ? extractUtmParams(accessUrl) : (referer ? extractUtmParams(referer) : {})

    // Busca geolocalização: 1) Cloudflare headers, 2) Cache Redis, 3) ip-api.com
    const geoData = rawIp ? await getGeoFromIp(rawIp, cfCountry) : { country: null, region: null, city: null }

    // Registra o clique com dados completos
    await recordClick(link.id, linkCode, {
      ip: ip || undefined,
      userAgent,
      referer,
      accessUrl: accessUrl || undefined,
      country: geoData.country || undefined,
      region: geoData.region || undefined,
      city: geoData.city || undefined,
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
