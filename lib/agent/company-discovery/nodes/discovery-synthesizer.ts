import { HumanMessage } from '@langchain/core/messages'
import type { CompanyDiscoveryStateType, DiscoveryPhase } from '../state'
import { generateDiscoverySummary } from '../gemini-discovery'
import { updateDiscoveryRunStatus } from '@/lib/db/discovery-queries'

/**
 * Discovery Synthesizer Node
 *
 * Generates a final summary of the discovery run and marks it complete.
 */
export async function discoverySynthesizerNode(
  state: CompanyDiscoveryStateType
): Promise<Partial<CompanyDiscoveryStateType>> {
  const { discoveredCompanies, fitAnalyses, discoveryRunId } = state

  console.log('[Discovery Synthesizer] Generating final summary...')

  // Update status
  if (discoveryRunId) {
    updateDiscoveryRunStatus(discoveryRunId, 'analyzing')
  }

  // Count stats
  const discoveredCount = discoveredCompanies.length
  const researchedCount = discoveredCompanies.filter(c => c.researchComplete).length

  try {
    // Generate summary
    const summary = await generateDiscoverySummary(
      discoveredCount,
      researchedCount,
      fitAnalyses
    )

    console.log('[Discovery Synthesizer] Summary generated')

    // Mark run complete
    if (discoveryRunId) {
      updateDiscoveryRunStatus(discoveryRunId, 'complete', {
        companiesDiscovered: discoveredCount,
        companiesResearched: researchedCount
      })
    }

    return {
      discoverySummary: summary,
      currentPhase: 'complete' as DiscoveryPhase,
      messages: [new HumanMessage(`Discovery complete! Found ${discoveredCount} companies, researched ${researchedCount}, analyzed ${fitAnalyses.length}.`)],
      apiCallsThisRun: 1
    }
  } catch (error) {
    console.error('[Discovery Synthesizer] Summary generation failed:', error)

    // Still mark complete but with basic summary
    const fallbackSummary = `Discovered ${discoveredCount} companies, researched ${researchedCount}, and analyzed ${fitAnalyses.length} for fit. Review the ranked results to identify top opportunities.`

    if (discoveryRunId) {
      updateDiscoveryRunStatus(discoveryRunId, 'complete', {
        companiesDiscovered: discoveredCount,
        companiesResearched: researchedCount
      })
    }

    return {
      discoverySummary: fallbackSummary,
      currentPhase: 'complete' as DiscoveryPhase,
      errors: [`Summary generation failed: ${error}`]
    }
  }
}
