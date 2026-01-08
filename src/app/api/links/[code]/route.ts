import { NextRequest, NextResponse } from 'next/server'
import { getLinkByCode, updateLink, getLinkStats, validateApiKey } from '@/lib/links'

interface RouteParams {
  params: Promise<{ code: string }>
}

// GET /api/links/:code - Busca link por código
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { code } = await params

  try {
    const link = await getLinkByCode(code)

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://redirect.tecnovix.app'

    return NextResponse.json({
      success: true,
      data: {
        ...link,
        shortUrl: `${baseUrl}/link/${link.code}`,
      },
    })
  } catch (error) {
    console.error('Error fetching link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch link' },
      { status: 500 }
    )
  }
}

// PATCH /api/links/:code - Atualiza link
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { code } = await params

  // Validação de API Key
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
    const body = await request.json()

    // Não permite alterar o código
    delete body.code

    const link = await updateLink(code, body)

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://redirect.tecnovix.app'

    return NextResponse.json({
      success: true,
      data: {
        ...link,
        shortUrl: `${baseUrl}/link/${link.code}`,
      },
    })
  } catch (error) {
    console.error('Error updating link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update link' },
      { status: 500 }
    )
  }
}

// DELETE /api/links/:code - Desativa link (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { code } = await params

  // Validação de API Key
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
    await updateLink(code, { isActive: false } as never)

    return NextResponse.json({
      success: true,
      message: 'Link deactivated',
    })
  } catch (error) {
    console.error('Error deactivating link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate link' },
      { status: 500 }
    )
  }
}
