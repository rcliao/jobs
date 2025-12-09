import { NextResponse } from 'next/server'
import { executeSearch } from '@/lib/agent/researcher'

/**
 * @deprecated This endpoint is deprecated. Use POST /api/discovery instead.
 * The job search flow has been merged into company discovery where job postings
 * are treated as signals for company research rather than standalone entities.
 */
export async function POST() {
  try {
    console.log('[DEPRECATED] Received legacy search request - consider using /api/discovery instead')

    const result = await executeSearch()

    return NextResponse.json({
      searchRunId: result.searchRunId,
      status: 'complete',
      resultsCount: result.jobsFound,
      queries: result.queries,
      message: `Found ${result.jobsFound} jobs`,
      deprecated: true,
      deprecationNotice: 'This endpoint is deprecated. Use POST /api/discovery for company-first job search.'
    })
  } catch (error) {
    console.error('Search API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Search execution failed'

    return NextResponse.json(
      {
        status: 'failed',
        error: errorMessage,
        message: 'Failed to execute search. Check server logs for details.',
        deprecated: true,
        deprecationNotice: 'This endpoint is deprecated. Use POST /api/discovery for company-first job search.'
      },
      { status: 500 }
    )
  }
}
