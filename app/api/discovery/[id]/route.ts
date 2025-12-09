import { NextRequest, NextResponse } from 'next/server'
import { getDiscoveryRun, getDiscoveryResults } from '@/lib/db/discovery-queries'

/**
 * GET /api/discovery/[id]
 * Get discovery run details with ranked companies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the discovery run
    const run = getDiscoveryRun(id)
    if (!run) {
      return NextResponse.json(
        { error: 'Discovery run not found' },
        { status: 404 }
      )
    }

    // Get ranked company results
    const rankedCompanies = getDiscoveryResults(id)

    return NextResponse.json({
      run,
      rankedCompanies,
      summary: {
        totalDiscovered: run.companiesDiscovered,
        totalResearched: run.companiesResearched,
        totalAnalyzed: rankedCompanies.filter(c => c.fitAnalysis !== null).length
      }
    })
  } catch (error) {
    console.error('[API] Get discovery run failed:', error)
    return NextResponse.json(
      { error: 'Failed to get discovery run', details: String(error) },
      { status: 500 }
    )
  }
}
