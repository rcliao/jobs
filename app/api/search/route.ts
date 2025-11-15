import { NextResponse } from 'next/server'
import { executeSearch } from '@/lib/agent/researcher'

export async function POST() {
  try {
    console.log('Received search request')

    const result = await executeSearch()

    return NextResponse.json({
      searchRunId: result.searchRunId,
      status: 'complete',
      resultsCount: result.jobsFound,
      queries: result.queries,
      message: `Found ${result.jobsFound} jobs`
    })
  } catch (error: any) {
    console.error('Search API error:', error)

    return NextResponse.json(
      {
        status: 'failed',
        error: error.message || 'Search execution failed',
        message: 'Failed to execute search. Check server logs for details.'
      },
      { status: 500 }
    )
  }
}
