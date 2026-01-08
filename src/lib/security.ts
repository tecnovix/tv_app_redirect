import { redis } from './redis'

// Rate limiting simples baseado em IP
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:${identifier}`

  try {
    const current = await redis.incr(key)

    // Define TTL apenas na primeira requisição
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    const ttl = await redis.ttl(key)

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    }
  } catch {
    // Se Redis falhar, permite a requisição
    return { allowed: true, remaining: limit, resetIn: windowSeconds }
  }
}

// Valida se a URL de destino é segura
export function isValidTargetUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    // Deve ser HTTP ou HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Protocol must be http or https' }
    }

    // Bloqueia localhost e IPs privados em produção
    if (process.env.NODE_ENV === 'production') {
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
      const privateIpPatterns = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
      ]

      if (blockedHosts.includes(parsed.hostname)) {
        return { valid: false, reason: 'Local addresses not allowed' }
      }

      for (const pattern of privateIpPatterns) {
        if (pattern.test(parsed.hostname)) {
          return { valid: false, reason: 'Private IP addresses not allowed' }
        }
      }
    }

    // Bloqueia protocolos perigosos no caminho
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(url)) {
        return { valid: false, reason: 'Dangerous URL pattern detected' }
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

// Sanitiza string para prevenir XSS
export function sanitizeString(str: string | null | undefined): string | null {
  if (!str) return null

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Valida código do link
export function isValidLinkCode(code: string): boolean {
  // Apenas letras, números e hífens, 3-50 caracteres
  return /^[a-zA-Z0-9-]{3,50}$/.test(code)
}

// Headers de segurança para respostas da API
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://googleads.g.doubleclick.net",
  }
}

// Detecta bots e crawlers
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java\//i,
    /php\//i,
  ]

  return botPatterns.some((pattern) => pattern.test(userAgent))
}

// Gera token CSRF
export async function generateCsrfToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Extrai IP do request (considera proxies) - versão para server-side
export function getClientIp(request: Request): string | null {
  const headers = [
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
    'true-client-ip',
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      const ip = value.split(',')[0].trim()
      if (ip) return ip
    }
  }

  return null
}
