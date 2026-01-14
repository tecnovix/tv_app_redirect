import { UAParser } from 'ua-parser-js'
import { redis } from './redis'

// Interface para dados de geolocalização
export interface GeoData {
  country: string | null
  region: string | null
  city: string | null
}

// Rate limiting interno para ip-api.com (máx 40/min para ter margem)
let apiCallsThisMinute = 0
let lastMinuteReset = Date.now()
const MAX_API_CALLS_PER_MINUTE = 40

// Estatísticas de uso para monitoramento
let totalApiCalls = 0
let totalCloudflareHits = 0
let totalCacheHits = 0

// Retorna estatísticas de uso da geolocalização
export function getGeoStats() {
  return {
    apiCallsThisMinute,
    maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE,
    totalApiCalls,
    totalCloudflareHits,
    totalCacheHits,
    lastMinuteReset: new Date(lastMinuteReset).toISOString(),
  }
}

// Mapeamento de códigos de país ISO para nomes
const countryNames: Record<string, string> = {
  BR: 'Brazil', US: 'United States', PT: 'Portugal', AR: 'Argentina',
  MX: 'Mexico', CO: 'Colombia', CL: 'Chile', PE: 'Peru', UY: 'Uruguay',
  ES: 'Spain', FR: 'France', DE: 'Germany', IT: 'Italy', GB: 'United Kingdom',
  CA: 'Canada', JP: 'Japan', CN: 'China', IN: 'India', AU: 'Australia',
}

// Busca geolocalização usando estratégia híbrida:
// 1. Headers Cloudflare (grátis, ilimitado)
// 2. Cache Redis (1h)
// 3. Fallback ip-api.com (com rate limit interno)
export async function getGeoFromIp(
  ip: string,
  cloudflareCountry?: string | null
): Promise<GeoData> {
  // Retorna null para IPs privados/locais
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { country: null, region: null, city: null }
  }

  // 1. Se tem header do Cloudflare, usa direto (grátis e ilimitado)
  if (cloudflareCountry) {
    totalCloudflareHits++
    const countryCode = cloudflareCountry.toUpperCase()
    return {
      country: countryNames[countryCode] || countryCode,
      region: null, // Cloudflare free não fornece região
      city: null,   // Cloudflare free não fornece cidade
    }
  }

  // 2. Verifica cache no Redis (mais persistente que memória)
  const cacheKey = `geo:${ip}`
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      totalCacheHits++
      return JSON.parse(cached) as GeoData
    }
  } catch {
    // Ignora erro de cache
  }

  // 3. Fallback para ip-api.com (com rate limiting interno)
  // Reset do contador a cada minuto
  const now = Date.now()
  if (now - lastMinuteReset > 60000) {
    apiCallsThisMinute = 0
    lastMinuteReset = now
  }

  // Se atingiu limite, retorna null (melhor que bloquear)
  if (apiCallsThisMinute >= MAX_API_CALLS_PER_MINUTE) {
    console.warn('ip-api.com rate limit reached, skipping geo lookup')
    return { country: null, region: null, city: null }
  }

  try {
    apiCallsThisMinute++
    totalApiCalls++

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(2000), // Timeout de 2s
    })

    if (!response.ok) {
      return { country: null, region: null, city: null }
    }

    const data = await response.json()

    if (data.status === 'success') {
      const geoData: GeoData = {
        country: data.country || null,
        region: data.regionName || null,
        city: data.city || null,
      }

      // Salva no Redis por 1 hora
      try {
        await redis.setex(cacheKey, 3600, JSON.stringify(geoData))
      } catch {
        // Ignora erro de cache
      }

      return geoData
    }

    return { country: null, region: null, city: null }
  } catch {
    return { country: null, region: null, city: null }
  }
}

// Parse User Agent
export function parseUserAgent(userAgent: string): {
  deviceType: string
  browser: string
  os: string
} {
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  let deviceType = 'desktop'
  if (result.device.type === 'mobile') deviceType = 'mobile'
  else if (result.device.type === 'tablet') deviceType = 'tablet'

  return {
    deviceType,
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
  }
}

// Extrai UTM params da URL
export function extractUtmParams(url: string): {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
} {
  try {
    const urlObj = new URL(url)
    return {
      utmSource: urlObj.searchParams.get('utm_source') || undefined,
      utmMedium: urlObj.searchParams.get('utm_medium') || undefined,
      utmCampaign: urlObj.searchParams.get('utm_campaign') || undefined,
      utmTerm: urlObj.searchParams.get('utm_term') || undefined,
      utmContent: urlObj.searchParams.get('utm_content') || undefined,
    }
  } catch {
    return {}
  }
}

// Anonimiza IP (mantém apenas os 3 primeiros octetos)
export function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 - mantém os primeiros 4 grupos
    const parts = ip.split(':')
    return parts.slice(0, 4).join(':') + ':0:0:0:0'
  }

  // IPv4 - remove último octeto
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  }

  return ip
}

// Extrai IP do request (considera proxies)
export function getClientIp(request: Request): string | null {
  // Ordem de prioridade para headers de IP
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx proxy
    'x-forwarded-for', // Standard proxy
    'x-client-ip',
    'true-client-ip',
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for pode ter múltiplos IPs, pega o primeiro
      const ip = value.split(',')[0].trim()
      if (ip) return anonymizeIp(ip)
    }
  }

  return null
}

// Gera dados de tracking para o frontend
export function generateTrackingData(linkCode: string, linkId: string): {
  trackingId: string
  timestamp: number
  linkCode: string
  linkId: string
} {
  return {
    trackingId: `${linkCode}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    linkCode,
    linkId,
  }
}
