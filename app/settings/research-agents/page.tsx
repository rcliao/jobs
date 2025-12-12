import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getAllResearchAgentConfigs,
  getResearchAgentConfig,
  createOrUpdateResearchAgentConfig
} from '@/lib/db/company-queries'
import { defaultResearchAgentConfigs } from '@/config/default-research-agent-configs'
import type { ResearchAgentType } from '@/types'

// Server Action to update agent config
async function updateConfigAction(formData: FormData) {
  'use server'

  const agentType = formData.get('agentType') as ResearchAgentType
  const systemPrompt = formData.get('systemPrompt') as string
  const behaviorConfigJson = formData.get('behaviorConfig') as string
  const toolsConfigJson = formData.get('toolsConfig') as string
  const enabled = formData.get('enabled') === 'on'

  try {
    const behaviorConfig = JSON.parse(behaviorConfigJson)
    const toolsConfig = JSON.parse(toolsConfigJson)

    createOrUpdateResearchAgentConfig(agentType, {
      systemPrompt,
      behaviorConfig,
      toolsConfig,
      enabled
    })

    revalidatePath('/settings/research-agents')
    redirect(`/settings/research-agents?saved=${agentType}`)
  } catch (error) {
    console.error('Error updating config:', error)
    redirect(`/settings/research-agents?error=invalid_json`)
  }
}

// Server Action to reset config to defaults
async function resetConfigAction(formData: FormData) {
  'use server'

  const agentType = formData.get('agentType') as ResearchAgentType
  const defaultConfig = defaultResearchAgentConfigs.find(c => c.agentType === agentType)

  if (!defaultConfig) {
    redirect('/settings/research-agents?error=no_default')
  }

  createOrUpdateResearchAgentConfig(agentType, {
    systemPrompt: defaultConfig.systemPrompt,
    behaviorConfig: defaultConfig.behaviorConfig,
    toolsConfig: defaultConfig.toolsConfig,
    version: defaultConfig.version
  })

  revalidatePath('/settings/research-agents')
  redirect(`/settings/research-agents?reset=${agentType}`)
}

function getAgentLabel(type: ResearchAgentType): string {
  const labels: Record<ResearchAgentType, string> = {
    orchestrator: 'Orchestrator',
    signal_worker: 'Signal Worker',
    contact_worker: 'Contact Worker',
    synthesizer: 'Synthesizer'
  }
  return labels[type]
}

function getAgentDescription(type: ResearchAgentType): string {
  const descriptions: Record<ResearchAgentType, string> = {
    orchestrator: 'Coordinates the research workflow and decides which phase to execute next',
    signal_worker: 'Searches for and analyzes company signals (funding, culture, tech, leadership)',
    contact_worker: 'Discovers key contacts at target companies (recruiters, hiring managers)',
    synthesizer: 'Generates the final research summary and company score'
  }
  return descriptions[type]
}

export default async function ResearchAgentSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; reset?: string; error?: string; agent?: string }>
}) {
  const params = await searchParams

  // Get all configs, falling back to defaults if not in DB
  const dbConfigs = getAllResearchAgentConfigs()
  const agentTypes: ResearchAgentType[] = ['orchestrator', 'signal_worker', 'contact_worker', 'synthesizer']

  const configs = agentTypes.map(type => {
    const dbConfig = dbConfigs.find(c => c.agentType === type)
    if (dbConfig) return dbConfig

    // Return default config structure
    const defaultConfig = defaultResearchAgentConfigs.find(c => c.agentType === type)!
    return {
      id: null,
      agentType: type,
      systemPrompt: defaultConfig.systemPrompt,
      behaviorConfig: defaultConfig.behaviorConfig,
      toolsConfig: defaultConfig.toolsConfig,
      enabled: true,
      version: defaultConfig.version,
      createdAt: null,
      updatedAt: null
    }
  })

  // Which agent to show expanded (default to first or selected)
  const selectedAgent = (params.agent as ResearchAgentType) || 'orchestrator'
  const selectedConfig = configs.find(c => c.agentType === selectedAgent)!

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <Link href="/companies" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
              ← Back to Companies
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Research Agent Configuration</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Configure the behavior and prompts for each research agent</p>
          </div>
        </div>

        {/* Status Messages */}
        {params.saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Configuration for {getAgentLabel(params.saved as ResearchAgentType)} saved successfully!</p>
          </div>
        )}
        {params.reset && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">Configuration for {getAgentLabel(params.reset as ResearchAgentType)} reset to defaults.</p>
          </div>
        )}
        {params.error === 'invalid_json' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Invalid JSON in behavior or tools config. Please check your syntax.</p>
          </div>
        )}

        {/* Agent Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
          {configs.map(config => (
            <Link
              key={config.agentType}
              href={`/settings/research-agents?agent=${config.agentType}`}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base whitespace-nowrap ${
                selectedAgent === config.agentType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {getAgentLabel(config.agentType)}
              {!config.enabled && <span className="ml-1 text-xs">(disabled)</span>}
            </Link>
          ))}
        </div>

        {/* Selected Agent Config Form */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{getAgentLabel(selectedConfig.agentType)}</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">{getAgentDescription(selectedConfig.agentType as ResearchAgentType)}</p>
            </div>
            <form action={resetConfigAction}>
              <input type="hidden" name="agentType" value={selectedConfig.agentType} />
              <button
                type="submit"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reset to Defaults
              </button>
            </form>
          </div>

          <form action={updateConfigAction} className="space-y-4 sm:space-y-6" key={selectedConfig.agentType}>
            <input type="hidden" name="agentType" value={selectedConfig.agentType} />

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                defaultChecked={selectedConfig.enabled}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="enabled" className="text-gray-700 font-medium">Agent Enabled</label>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                System Prompt
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Supports placeholders: {"{{company}}"}, {"{{category}}"}, {"{{signals}}"}, {"{{contacts}}"})
                </span>
              </label>
              <textarea
                name="systemPrompt"
                defaultValue={selectedConfig.systemPrompt}
                rows={12}
                className="w-full border border-gray-300 rounded-md px-4 py-2 font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Behavior Config */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Behavior Config (JSON)
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (maxIterations, confidenceThreshold, etc.)
                </span>
              </label>
              <textarea
                name="behaviorConfig"
                defaultValue={JSON.stringify(selectedConfig.behaviorConfig, null, 2)}
                rows={8}
                className="w-full border border-gray-300 rounded-md px-4 py-2 font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tools Config */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Tools Config (JSON)
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (searchSources, enableWebScraping, customQueryTemplates)
                </span>
              </label>
              <textarea
                name="toolsConfig"
                defaultValue={JSON.stringify(selectedConfig.toolsConfig, null, 2)}
                rows={8}
                className="w-full border border-gray-300 rounded-md px-4 py-2 font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium text-sm sm:text-base w-full sm:w-auto"
              >
                Save Configuration
              </button>
              <Link
                href="/companies"
                className="bg-gray-200 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-300 font-medium text-center text-sm sm:text-base w-full sm:w-auto"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Version Info */}
          {selectedConfig.updatedAt && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
              Version: {selectedConfig.version} | Last updated: {new Date(selectedConfig.updatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div className="mt-6 sm:mt-8 bg-gray-100 rounded-lg p-4 sm:p-6">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Configuration Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Behavior Config Options</h4>
              <ul className="text-gray-600 space-y-1">
                <li><code className="bg-gray-200 px-1 rounded text-xs">maxIterations</code> - Max search iterations per category (default: 3)</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">minSignalsRequired</code> - Min signals before moving on (default: 2)</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">confidenceThreshold</code> - Min confidence to include signal (default: 5)</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">maxContacts</code> - Max contacts to discover (default: 10)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Tools Config Options</h4>
              <ul className="text-gray-600 space-y-1">
                <li><code className="bg-gray-200 px-1 rounded text-xs">searchSources</code> - Array of sources: google_cse, serper, tavily</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">enableWebScraping</code> - Allow fetching full page content</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">enableLinkedIn</code> - Enable LinkedIn-specific queries</li>
                <li><code className="bg-gray-200 px-1 rounded text-xs">customQueryTemplates</code> - Custom search query patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
