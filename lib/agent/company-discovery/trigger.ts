import { HumanMessage } from '@langchain/core/messages'
import { companyDiscoveryGraph } from './graph'
import type { FitAnalysisResult } from './state'
import { getProfile } from '@/lib/db/queries'
import { createDiscoveryRun, getDiscoveryResults, updateDiscoveryRunStatus } from '@/lib/db/discovery-queries'
import type { DiscoveredCompanyResult, CompanyDiscoveryResult } from '@/types'

/**
 * Result of a company discovery execution
 */
export interface DiscoveryExecutionResult {
  discoveryRunId: string
  status: 'complete' | 'failed'
  companiesDiscovered: number
  companiesResearched: number
  rankedCompanies: DiscoveredCompanyResult[]
  summary: string | null
  errors: string[]
}

/**
 * Trigger a company discovery run based on user profile
 */
export async function triggerCompanyDiscovery(
  profileId: string = 'default',
  options: {
    maxCompanies?: number
    researchBatchSize?: number
  } = {}
): Promise<DiscoveryExecutionResult> {
  const { maxCompanies = 10, researchBatchSize = 3 } = options

  console.log(`[Discovery] Starting discovery for profile: ${profileId}`)
  console.log(`[Discovery] Options: maxCompanies=${maxCompanies}, batchSize=${researchBatchSize}`)

  // Get user profile
  const profile = getProfile(profileId)
  if (!profile) {
    return {
      discoveryRunId: '',
      status: 'failed',
      companiesDiscovered: 0,
      companiesResearched: 0,
      rankedCompanies: [],
      summary: null,
      errors: [`Profile not found: ${profileId}`]
    }
  }

  // Create discovery run in DB
  const discoveryRun = createDiscoveryRun(profileId)
  console.log(`[Discovery] Created run: ${discoveryRun.id}`)

  // Build initial state
  const initialState = {
    messages: [new HumanMessage(`Discover companies matching profile: ${profile.targetRole}`)],
    discoveryRunId: discoveryRun.id,
    profile,
    profileId,
    maxCompanies,
    researchBatchSize
  }

  try {
    // Execute the discovery graph
    // Higher recursion limit: queries(8) + companies(10) × research batches + analysis + synthesis
    const finalState = await companyDiscoveryGraph.invoke(initialState, {
      recursionLimit: 150,
      runName: `Company Discovery: ${profile.targetRole}`,
      tags: ['company-discovery', 'multi-agent'],
      metadata: {
        profileId,
        discoveryRunId: discoveryRun.id,
        triggeredAt: new Date().toISOString()
      }
    })

    console.log(`[Discovery] Completed with phase: ${finalState.currentPhase}`)

    // Get full results from DB (includes company details, signals, contacts)
    const rankedCompanies = getDiscoveryResults(discoveryRun.id)

    return {
      discoveryRunId: discoveryRun.id,
      status: finalState.currentPhase === 'complete' ? 'complete' : 'failed',
      companiesDiscovered: finalState.discoveredCompanies?.length || 0,
      companiesResearched: finalState.companiesResearched || 0,
      rankedCompanies,
      summary: finalState.discoverySummary,
      errors: finalState.errors || []
    }
  } catch (error) {
    console.error(`[Discovery] Failed:`, error)

    // Update run as failed
    updateDiscoveryRunStatus(discoveryRun.id, 'failed', {
      errorMessage: String(error)
    })

    return {
      discoveryRunId: discoveryRun.id,
      status: 'failed',
      companiesDiscovered: 0,
      companiesResearched: 0,
      rankedCompanies: [],
      summary: null,
      errors: [String(error)]
    }
  }
}

/**
 * Get discovery run status and results
 */
export function getDiscoveryStatus(discoveryRunId: string): DiscoveryExecutionResult | null {
  const results = getDiscoveryResults(discoveryRunId)

  if (results.length === 0) {
    return null
  }

  // Get discovery run from first result
  const researchedCount = results.filter(r => r.researchComplete).length
  const hasAnalysis = results.some(r => r.fitAnalysis !== null)

  return {
    discoveryRunId,
    status: 'complete', // If we have results, it's complete
    companiesDiscovered: results.length,
    companiesResearched: researchedCount,
    rankedCompanies: results,
    summary: null, // Summary is stored in the run, not retrieved here
    errors: []
  }
}
