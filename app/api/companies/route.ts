import { NextRequest, NextResponse } from 'next/server'
import {
  listCompanies,
  getOrCreateCompany
} from '@/lib/db/company-queries'
import { triggerCompanyResearch } from '@/lib/agent/company-research'

// GET /api/companies - List all companies
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const profileId = searchParams.get('profileId') || 'default'
    const status = searchParams.get('status')
    const minScore = searchParams.get('minScore')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = listCompanies({
      profileId,
      researchStatus: status || undefined,
      minScore: minScore ? parseInt(minScore) : undefined,
      limit,
      offset
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing companies:', error)
    return NextResponse.json(
      { error: 'Failed to list companies' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Add a company (and optionally trigger research)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, profileId = 'default', triggerResearchNow = false } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Create or get existing company (scoped by profile)
    const company = getOrCreateCompany(name.trim(), profileId)

    // Optionally trigger research
    if (triggerResearchNow) {
      // Fire and forget - don't wait for research to complete
      triggerCompanyResearch(name.trim(), profileId).catch(err => {
        console.error(`Background research failed for ${name}:`, err)
      })
    }

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
