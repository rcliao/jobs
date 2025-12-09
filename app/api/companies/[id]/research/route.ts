import { NextRequest, NextResponse } from 'next/server'
import {
  getCompany,
  getCompanyResearchRuns
} from '@/lib/db/company-queries'
import { triggerCompanyResearch } from '@/lib/agent/company-research'

// GET /api/companies/[id]/research - Get research history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = getCompany(id)

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const researchRuns = getCompanyResearchRuns(id)

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        researchStatus: company.researchStatus,
        lastResearchedAt: company.lastResearchedAt
      },
      runs: researchRuns
    })
  } catch (error) {
    console.error('Error getting research history:', error)
    return NextResponse.json(
      { error: 'Failed to get research history' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/research - Trigger new research
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = getCompany(id)

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if research is already running
    if (company.researchStatus === 'running') {
      return NextResponse.json(
        { error: 'Research is already in progress for this company' },
        { status: 409 }
      )
    }

    // Trigger research (await completion)
    const result = await triggerCompanyResearch(company.name)

    return NextResponse.json({
      researchRunId: result.researchRunId,
      status: result.status,
      summary: result.summary,
      score: result.score,
      signalsFound: result.signalsFound,
      contactsFound: result.contactsFound,
      errors: result.errors.length > 0 ? result.errors : undefined
    })
  } catch (error) {
    console.error('Error triggering research:', error)
    return NextResponse.json(
      { error: 'Failed to trigger research' },
      { status: 500 }
    )
  }
}
