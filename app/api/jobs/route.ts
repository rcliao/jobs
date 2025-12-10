import { NextRequest, NextResponse } from 'next/server'
import { listJobs } from '@/lib/db/queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const profileId = searchParams.get('profileId') || 'default'
    const status = searchParams.get('status') || undefined
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const result = listJobs({
      profileId,
      status,
      minScore,
      limit,
      offset
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing jobs:', error)
    return NextResponse.json(
      { error: 'Failed to list jobs' },
      { status: 500 }
    )
  }
}
