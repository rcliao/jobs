import { HumanMessage } from '@langchain/core/messages'
import type { CompanyDiscoveryStateType, DiscoveryPhase } from '../state'
import { generateDiscoveryQueries } from '../gemini-discovery'

/**
 * Discovery Orchestrator Node
 *
 * Manages the overall discovery workflow:
 * 1. Generates search queries based on profile (init -> generating_queries)
 * 2. Routes to appropriate phase based on state
 */
export async function discoveryOrchestratorNode(
  state: CompanyDiscoveryStateType
): Promise<Partial<CompanyDiscoveryStateType>> {
  console.log(`[Discovery Orchestrator] Current phase: ${state.currentPhase}`)

  // If no profile, we can't proceed
  if (!state.profile) {
    return {
      currentPhase: 'error' as DiscoveryPhase,
      errors: ['No profile provided for discovery']
    }
  }

  // Handle init phase - generate search queries
  if (state.currentPhase === 'init') {
    console.log('[Discovery Orchestrator] Generating search queries from profile...')

    try {
      const queries = await generateDiscoveryQueries(state.profile)
      console.log(`[Discovery Orchestrator] Generated ${queries.length} queries`)

      return {
        messages: [new HumanMessage(`Generated ${queries.length} search queries for discovery`)],
        searchQueries: queries,
        currentPhase: 'discovering' as DiscoveryPhase,
        apiCallsThisRun: 1
      }
    } catch (error) {
      console.error('[Discovery Orchestrator] Query generation failed:', error)
      return {
        currentPhase: 'error' as DiscoveryPhase,
        errors: [`Query generation failed: ${error}`]
      }
    }
  }

  // This shouldn't happen, but handle gracefully
  return {
    messages: [new HumanMessage(`Orchestrator check at phase: ${state.currentPhase}`)]
  }
}

/**
 * Determine next node based on current state
 */
export function routeFromOrchestrator(state: CompanyDiscoveryStateType): string {
  const { currentPhase, discoveredCompanies, maxCompanies, fitAnalyses, errors } = state

  // Error state - go to complete
  if (errors.length > 0 && currentPhase === 'error') {
    return 'complete'
  }

  // Route based on phase
  switch (currentPhase) {
    case 'discovering':
      return 'company_finder'

    case 'researching':
      // Check if we have more companies to research
      const researchedCount = discoveredCompanies.filter(c => c.researchComplete || c.researchFailed).length
      if (researchedCount < discoveredCompanies.length && researchedCount < maxCompanies) {
        return 'company_researcher'
      }
      // All companies researched, move to analysis
      return 'fit_analyzer'

    case 'analyzing':
      // Check if we have more fit analyses to create
      const researchedCompanies = discoveredCompanies.filter(c => c.researchComplete)
      const analyzedCount = fitAnalyses.length
      if (analyzedCount < researchedCompanies.length) {
        return 'fit_analyzer'
      }
      // All analyzed, synthesize
      return 'discovery_synthesizer'

    case 'synthesizing':
      return 'discovery_synthesizer'

    case 'complete':
      return 'complete'

    default:
      return 'complete'
  }
}
