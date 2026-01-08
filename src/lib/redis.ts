import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379/12'
}

export const redis =
  globalForRedis.redis ??
  new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null
      return Math.min(times * 100, 3000)
    },
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    // Ignore cache errors
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // Ignore cache errors
  }
}

// Increment click counter atomically
export async function incrementClicks(linkCode: string): Promise<number> {
  try {
    return await redis.incr(`redirect:clicks:${linkCode}`)
  } catch {
    return 0
  }
}

// Track unique visitors by IP
export async function trackUniqueVisitor(linkCode: string, ip: string): Promise<boolean> {
  try {
    const key = `redirect:unique:${linkCode}:${ip}`
    const exists = await redis.exists(key)
    if (!exists) {
      // Marca como visitado por 24 horas
      await redis.setex(key, 86400, '1')
      return true // É único
    }
    return false // Já visitou
  } catch {
    return true
  }
}
