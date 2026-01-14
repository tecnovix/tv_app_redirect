import { prisma } from './prisma'
import { cacheGet, cacheSet, cacheDelete, incrementClicks, trackUniqueVisitor } from './redis'
import { nanoid } from 'nanoid'
import { createHash } from 'crypto'
import type { RedirectLink, LinkSource, RedirectType, ClickEvent } from '@prisma/client'

// Tipos
export interface CreateLinkInput {
  targetUrl: string
  code?: string
  title?: string
  description?: string
  commentary?: string
  imageUrl?: string
  redirectType?: RedirectType
  delaySeconds?: number
  showAds?: boolean
  source?: LinkSource
  sourceApp?: string
  sourceUrl?: string
  campaign?: string
  expiresAt?: Date
  password?: string
}

export interface LinkWithStats extends RedirectLink {
  recentClicks?: number
}

// Gera um short code único
export function generateCode(length = 6): string {
  return nanoid(length)
}

// Hash da API Key
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// Valida API Key
export async function validateApiKey(key: string): Promise<{ valid: boolean; appName?: string }> {
  const hashedKey = hashApiKey(key)
  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
  })

  if (!apiKey || !apiKey.isActive) {
    return { valid: false }
  }

  // Atualiza last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return { valid: true, appName: apiKey.name }
}

// Busca link por código (com cache)
export async function getLinkByCode(code: string): Promise<RedirectLink | null> {
  const cacheKey = `redirect:link:${code}`

  // Tenta cache primeiro
  const cached = await cacheGet<RedirectLink>(cacheKey)
  if (cached) return cached

  // Busca no banco
  const link = await prisma.redirectLink.findUnique({
    where: { code },
  })

  if (link && link.isActive) {
    // Verifica expiração
    if (link.expiresAt && link.expiresAt < new Date()) {
      return null
    }

    // Cache por 5 minutos
    await cacheSet(cacheKey, link, 300)
    return link
  }

  return null
}

// Cria novo link
export async function createLink(input: CreateLinkInput): Promise<RedirectLink> {
  const code = input.code || generateCode()

  // Verifica se código já existe
  const existing = await prisma.redirectLink.findUnique({
    where: { code },
  })

  if (existing) {
    throw new Error(`Code "${code}" already exists`)
  }

  const link = await prisma.redirectLink.create({
    data: {
      code,
      targetUrl: input.targetUrl,
      title: input.title,
      description: input.description,
      commentary: input.commentary,
      imageUrl: input.imageUrl,
      redirectType: input.redirectType || 'MONETIZED',
      delaySeconds: input.delaySeconds ?? 5,
      showAds: input.showAds ?? true,
      source: input.source || 'MANUAL',
      sourceApp: input.sourceApp,
      sourceUrl: input.sourceUrl,
      campaign: input.campaign,
      expiresAt: input.expiresAt,
      password: input.password,
    },
  })

  return link
}

// Atualiza link
export async function updateLink(code: string, data: Partial<CreateLinkInput>): Promise<RedirectLink> {
  const link = await prisma.redirectLink.update({
    where: { code },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })

  // Invalida cache
  await cacheDelete(`redirect:link:${code}`)

  return link
}

// Registra clique
export async function recordClick(
  linkId: string,
  linkCode: string,
  data: Partial<ClickEvent>
): Promise<void> {
  // Incrementa contador no Redis (rápido)
  await incrementClicks(linkCode)

  // Verifica se é visitante único
  const isUnique = data.ip ? await trackUniqueVisitor(linkCode, data.ip) : true

  try {
    // Salva evento detalhado no banco
    await prisma.clickEvent.create({
      data: {
        linkId,
        ip: data.ip,
        userAgent: data.userAgent,
        referer: data.referer,
        accessUrl: data.accessUrl,
        country: data.country,
        region: data.region,
        city: data.city,
        deviceType: data.deviceType,
        browser: data.browser,
        os: data.os,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
        waitedFull: data.waitedFull,
        clickedButton: data.clickedButton,
        timeOnPage: data.timeOnPage,
      },
    })

    // Atualiza contadores no banco (agora executa corretamente)
    await prisma.redirectLink.update({
      where: { id: linkId },
      data: {
        clicks: { increment: 1 },
        ...(isUnique ? { uniqueClicks: { increment: 1 } } : {}),
      },
    })
  } catch (error) {
    console.error('Error recording click:', error)
    // Não re-lança o erro para não bloquear o redirect do usuário
  }
}

// Lista links com filtros
export async function listLinks(options: {
  page?: number
  limit?: number
  source?: LinkSource
  sourceApp?: string
  search?: string
  orderBy?: 'clicks' | 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}): Promise<{ links: RedirectLink[]; total: number }> {
  const { page = 1, limit = 20, source, sourceApp, search, orderBy = 'createdAt', order = 'desc' } = options

  const where = {
    isActive: true,
    ...(source && { source }),
    ...(sourceApp && { sourceApp }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' as const } },
        { title: { contains: search, mode: 'insensitive' as const } },
        { targetUrl: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [links, total] = await Promise.all([
    prisma.redirectLink.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.redirectLink.count({ where }),
  ])

  return { links, total }
}

// Estatísticas de um link
export async function getLinkStats(code: string): Promise<{
  link: RedirectLink | null
  clicksByDay: { date: string; count: number }[]
  topCountries: { country: string; count: number }[]
  topDevices: { device: string; count: number }[]
  topReferers: { referer: string; count: number }[]
}> {
  const link = await getLinkByCode(code)
  if (!link) {
    return { link: null, clicksByDay: [], topCountries: [], topDevices: [], topReferers: [] }
  }

  // Últimos 30 dias
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [clicksByDay, topCountries, topDevices, topReferers] = await Promise.all([
    // Cliques por dia
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("clickedAt") as date, COUNT(*) as count
      FROM "ClickEvent"
      WHERE "linkId" = ${link.id} AND "clickedAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("clickedAt")
      ORDER BY date DESC
    `,

    // Top países
    prisma.clickEvent.groupBy({
      by: ['country'],
      where: { linkId: link.id, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    }),

    // Top dispositivos
    prisma.clickEvent.groupBy({
      by: ['deviceType'],
      where: { linkId: link.id, deviceType: { not: null } },
      _count: { deviceType: true },
      orderBy: { _count: { deviceType: 'desc' } },
      take: 5,
    }),

    // Top referers
    prisma.clickEvent.groupBy({
      by: ['referer'],
      where: { linkId: link.id, referer: { not: null } },
      _count: { referer: true },
      orderBy: { _count: { referer: 'desc' } },
      take: 10,
    }),
  ])

  return {
    link,
    clicksByDay: clicksByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
    topCountries: topCountries.map((r) => ({ country: r.country!, count: r._count.country })),
    topDevices: topDevices.map((r) => ({ device: r.deviceType!, count: r._count.deviceType })),
    topReferers: topReferers.map((r) => ({ referer: r.referer!, count: r._count.referer })),
  }
}
