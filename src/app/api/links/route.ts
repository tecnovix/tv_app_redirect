import { NextRequest, NextResponse } from 'next/server'
import { createLink, listLinks, validateApiKey, type CreateLinkInput } from '@/lib/links'
import { checkRateLimit, isValidTargetUrl, isValidLinkCode, getClientIp } from '@/lib/security'
import { LinkSource, RedirectType } from '@prisma/client'

// GET /api/links - Lista links (requer API key)
export async function GET(request: NextRequest) {
  // Validação de API Key para listagem
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

  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const source = searchParams.get('source') as LinkSource | null
  const sourceApp = searchParams.get('sourceApp')
  const search = searchParams.get('search')
  const orderBy = (searchParams.get('orderBy') as 'clicks' | 'createdAt' | 'updatedAt') || 'createdAt'
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'

  try {
    const result = await listLinks({
      page,
      limit,
      source: source || undefined,
      sourceApp: sourceApp || undefined,
      search: search || undefined,
      orderBy,
      order,
    })

    return NextResponse.json({
      success: true,
      data: result.links,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error) {
    console.error('Error listing links:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list links' },
      { status: 500 }
    )
  }
}

// POST /api/links - Cria novo link
export async function POST(request: NextRequest) {
  // Validação de API Key
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API key required' },
      { status: 401 }
    )
  }

  const { valid, appName } = await validateApiKey(apiKey)
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Invalid API key' },
      { status: 401 }
    )
  }

  // Rate limiting por API key
  const rateLimit = await checkRateLimit(`api:${appName}`, 100, 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded', retryAfter: rateLimit.resetIn },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
    )
  }

  try {
    const body = await request.json()

    // Validação básica
    if (!body.targetUrl) {
      return NextResponse.json(
        { success: false, error: 'targetUrl is required' },
        { status: 400 }
      )
    }

    // Valida URL de forma segura
    const urlValidation = isValidTargetUrl(body.targetUrl)
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.reason },
        { status: 400 }
      )
    }

    // Valida código customizado se fornecido
    if (body.code && !isValidLinkCode(body.code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code. Use only letters, numbers and hyphens (3-50 chars)' },
        { status: 400 }
      )
    }

    // Valida enums se fornecidos
    if (body.source && !Object.values(LinkSource).includes(body.source)) {
      return NextResponse.json(
        { success: false, error: `Invalid source. Must be one of: ${Object.values(LinkSource).join(', ')}` },
        { status: 400 }
      )
    }

    if (body.redirectType && !Object.values(RedirectType).includes(body.redirectType)) {
      return NextResponse.json(
        { success: false, error: `Invalid redirectType. Must be one of: ${Object.values(RedirectType).join(', ')}` },
        { status: 400 }
      )
    }

    const input: CreateLinkInput = {
      targetUrl: body.targetUrl,
      code: body.code,
      title: body.title,
      description: body.description,
      commentary: body.commentary,
      imageUrl: body.imageUrl,
      redirectType: body.redirectType,
      delaySeconds: body.delaySeconds,
      showAds: body.showAds,
      source: body.source,
      sourceApp: appName || body.sourceApp,
      sourceUrl: body.sourceUrl,
      campaign: body.campaign,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      password: body.password,
    }

    const link = await createLink(input)

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://redirect.tecnovix.app'

    return NextResponse.json({
      success: true,
      data: {
        ...link,
        shortUrl: `${baseUrl}/link/${link.code}`,
      },
    })
  } catch (error) {
    console.error('Error creating link:', error)

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create link' },
      { status: 500 }
    )
  }
}
