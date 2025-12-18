import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {
    app: { status: 'ok' },
    database: { status: 'ok' },
  }

  // Check database connectivity
  try {
    const db = getDb()
    const result = db.prepare('SELECT 1 as health').get() as { health: number } | undefined
    if (result?.health !== 1) {
      checks.database = { status: 'error', message: 'Unexpected query result' }
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    }
  }

  const allHealthy = Object.values(checks).every((check) => check.status === 'ok')

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
