import { NextRequest, NextResponse } from 'next/server'
import { getAgentConfig, updateAgentConfig } from '@/lib/db/queries'
import type { UpdateAgentConfigRequest } from '@/types'

export async function GET() {
  try {
    const config = getAgentConfig()

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching agent config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data: UpdateAgentConfigRequest = await request.json()

    // Basic validation
    if (!data.systemPrompt || !data.version) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const config = updateAgentConfig(data)

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating agent config:', error)
    return NextResponse.json(
      { error: 'Failed to update agent config' },
      { status: 500 }
    )
  }
}
