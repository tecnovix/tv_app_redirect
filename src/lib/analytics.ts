import { UAParser } from 'ua-parser-js'

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
