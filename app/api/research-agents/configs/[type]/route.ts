import { NextRequest, NextResponse } from 'next/server'
import {
  getResearchAgentConfig,
  createOrUpdateResearchAgentConfig,
  updateResearchAgentConfigEnabled
} from '@/lib/db/company-queries'
import { defaultResearchAgentConfigs } from '@/config/default-research-agent-configs'
import type { ResearchAgentType } from '@/types'

const VALID_AGENT_TYPES: ResearchAgentType[] = [
  'orchestrator',
  'signal_worker',
  'contact_worker',
  'synthesizer'
]

// GET /api/research-agents/configs/[type] - Get config for specific agent type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params

    if (!VALID_AGENT_TYPES.includes(type as ResearchAgentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const config = getResearchAgentConfig(type as ResearchAgentType)

    if (!config) {
      // Return default config if not in database yet
      const defaultConfig = defaultResearchAgentConfigs.find(c => c.agentType === type)
      if (defaultConfig) {
        return NextResponse.json({
          ...defaultConfig,
          id: null,
          enabled: true,
          createdAt: null,
          updatedAt: null,
          isDefault: true
        })
      }

      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error getting agent config:', error)
    return NextResponse.json(
      { error: 'Failed to get agent config' },
      { status: 500 }
    )
  }
}

// PUT /api/research-agents/configs/[type] - Update agent config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params

    if (!VALID_AGENT_TYPES.includes(type as ResearchAgentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { systemPrompt, behaviorConfig, toolsConfig, enabled, version } = body

    // Validate required fields
    if (!systemPrompt || !behaviorConfig || !toolsConfig) {
      return NextResponse.json(
        { error: 'systemPrompt, behaviorConfig, and toolsConfig are required' },
        { status: 400 }
      )
    }

    const updated = createOrUpdateResearchAgentConfig(type as ResearchAgentType, {
      systemPrompt,
      behaviorConfig,
      toolsConfig,
      enabled,
      version
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating agent config:', error)
    return NextResponse.json(
      { error: 'Failed to update agent config' },
      { status: 500 }
    )
  }
}

// PATCH /api/research-agents/configs/[type] - Toggle enabled status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params

    if (!VALID_AGENT_TYPES.includes(type as ResearchAgentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    const updated = updateResearchAgentConfigEnabled(type as ResearchAgentType, enabled)

    if (!updated) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error toggling agent config:', error)
    return NextResponse.json(
      { error: 'Failed to toggle agent config' },
      { status: 500 }
    )
  }
}

// POST /api/research-agents/configs/[type]/reset - Reset to default (handled via body action)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params
    const body = await request.json()

    if (body.action !== 'reset') {
      return NextResponse.json(
        { error: 'Invalid action. Use action: "reset" to reset to defaults' },
        { status: 400 }
      )
    }

    if (!VALID_AGENT_TYPES.includes(type as ResearchAgentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const defaultConfig = defaultResearchAgentConfigs.find(c => c.agentType === type)
    if (!defaultConfig) {
      return NextResponse.json(
        { error: 'Default config not found for this agent type' },
        { status: 404 }
      )
    }

    const reset = createOrUpdateResearchAgentConfig(type as ResearchAgentType, {
      systemPrompt: defaultConfig.systemPrompt,
      behaviorConfig: defaultConfig.behaviorConfig,
      toolsConfig: defaultConfig.toolsConfig,
      version: defaultConfig.version
    })

    return NextResponse.json({
      message: 'Config reset to defaults',
      config: reset
    })
  } catch (error) {
    console.error('Error resetting agent config:', error)
    return NextResponse.json(
      { error: 'Failed to reset agent config' },
      { status: 500 }
    )
  }
}
