import { NextRequest, NextResponse } from 'next/server'
import {
  getCompany,
  updateCompany,
  getCompanySignals,
  getCompanyContacts,
  getCompanyResearchRuns
} from '@/lib/db/company-queries'

// GET /api/companies/[id] - Get company with full details
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

    // Get related data
    const signals = getCompanySignals(id)
    const contacts = getCompanyContacts(id)
    const researchRuns = getCompanyResearchRuns(id)

    return NextResponse.json({
      ...company,
      signals,
      contacts,
      researchRuns
    })
  } catch (error) {
    console.error('Error getting company:', error)
    return NextResponse.json(
      { error: 'Failed to get company' },
      { status: 500 }
    )
  }
}

// PUT /api/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const company = getCompany(id)
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const updated = updateCompany(id, {
      domain: body.domain,
      industry: body.industry,
      sizeEstimate: body.sizeEstimate,
      headquarters: body.headquarters,
      linkedinUrl: body.linkedinUrl,
      websiteUrl: body.websiteUrl
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}
