import { NextRequest, NextResponse } from 'next/server'
import { getAllResearchAgentConfigs } from '@/lib/db/company-queries'

// GET /api/research-agents/configs - List all agent configs
export async function GET() {
  try {
    const configs = getAllResearchAgentConfigs()

    return NextResponse.json({
      configs,
      count: configs.length
    })
  } catch (error) {
    console.error('Error listing agent configs:', error)
    return NextResponse.json(
      { error: 'Failed to list agent configs' },
      { status: 500 }
    )
  }
}
