import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getGeoStats } from '@/lib/analytics'

export async function GET() {
  const checks = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      redis: false,
    },
    geo: getGeoStats(),
  }

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    checks.services.database = true
  } catch {
    checks.status = 'error'
  }

  try {
    // Check Redis
    await redis.ping()
    checks.services.redis = true
  } catch {
    // Redis is optional, don't fail health check
  }

  const statusCode = checks.status === 'ok' ? 200 : 503

  return NextResponse.json(checks, { status: statusCode })
}
