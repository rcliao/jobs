import { NextRequest, NextResponse } from 'next/server'
import { getCompany, getCompanySignals } from '@/lib/db/company-queries'
import type { SignalCategory } from '@/types'

// GET /api/companies/[id]/signals - Get company signals
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as SignalCategory | null

    const company = getCompany(id)
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    const signals = getCompanySignals(id, category || undefined)

    // Group by category
    const signalsByCategory: Record<string, typeof signals> = {}
    for (const signal of signals) {
      if (!signalsByCategory[signal.category]) {
        signalsByCategory[signal.category] = []
      }
      signalsByCategory[signal.category].push(signal)
    }

    return NextResponse.json({
      companyId: id,
      companyName: company.name,
      totalSignals: signals.length,
      signals: category ? signals : undefined,
      signalsByCategory: category ? undefined : signalsByCategory
    })
  } catch (error) {
    console.error('Error getting company signals:', error)
    return NextResponse.json(
      { error: 'Failed to get company signals' },
      { status: 500 }
    )
  }
}
