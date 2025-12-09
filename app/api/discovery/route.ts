import { NextRequest, NextResponse } from 'next/server'
import { triggerCompanyDiscovery } from '@/lib/agent/company-discovery'
import { listDiscoveryRuns } from '@/lib/db/discovery-queries'

/**
 * POST /api/discovery
 * Start a new company discovery run
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      profileId = 'default',
      maxCompanies = 10,
      researchBatchSize = 3
    } = body

    console.log(`[API] Starting discovery for profile: ${profileId}`)

    // Start discovery (runs async in background)
    const result = await triggerCompanyDiscovery(profileId, {
      maxCompanies,
      researchBatchSize
    })

    return NextResponse.json({
      discoveryRunId: result.discoveryRunId,
      status: result.status,
      companiesDiscovered: result.companiesDiscovered,
      companiesResearched: result.companiesResearched,
      summary: result.summary,
      errors: result.errors
    })
  } catch (error) {
    console.error('[API] Discovery failed:', error)
    return NextResponse.json(
      { error: 'Discovery failed', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/discovery
 * List discovery runs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const runs = listDiscoveryRuns(profileId, limit)

    return NextResponse.json({
      runs,
      total: runs.length
    })
  } catch (error) {
    console.error('[API] List discovery runs failed:', error)
    return NextResponse.json(
      { error: 'Failed to list discovery runs', details: String(error) },
      { status: 500 }
    )
  }
}
