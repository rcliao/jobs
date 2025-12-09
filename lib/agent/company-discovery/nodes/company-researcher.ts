import { HumanMessage } from '@langchain/core/messages'
import type { CompanyDiscoveryStateType, DiscoveryPhase, DiscoveredCompany } from '../state'
import { triggerCompanyResearch } from '@/lib/agent/company-research/trigger'
import { getOrCreateCompany } from '@/lib/db/company-queries'
import {
  createDiscoveryLink,
  updateDiscoveryRunStatus,
  incrementDiscoveryCount
} from '@/lib/db/discovery-queries'

/**
 * Company Researcher Node
 *
 * Triggers company research for discovered companies in parallel batches.
 * Uses the existing company research multi-agent system.
 */
export async function companyResearcherNode(
  state: CompanyDiscoveryStateType
): Promise<Partial<CompanyDiscoveryStateType>> {
  const {
    discoveredCompanies,
    researchBatchSize,
    discoveryRunId,
    maxCompanies
  } = state

  // Find companies that haven't been researched yet
  const pendingCompanies = discoveredCompanies
    .filter(c => !c.researchComplete && !c.researchFailed)
    .slice(0, maxCompanies) // Respect max limit

  if (pendingCompanies.length === 0) {
    console.log('[Company Researcher] No pending companies, moving to analysis')
    return {
      currentPhase: 'analyzing' as DiscoveryPhase,
      messages: [new HumanMessage('All companies researched, starting fit analysis')]
    }
  }

  // Take a batch for parallel research
  const batch = pendingCompanies.slice(0, researchBatchSize)
  console.log(`[Company Researcher] Researching batch of ${batch.length} companies in parallel`)

  // Update status
  if (discoveryRunId) {
    updateDiscoveryRunStatus(discoveryRunId, 'researching')
  }

  // Research companies in parallel
  const researchPromises = batch.map(async (company) => {
    try {
      console.log(`[Company Researcher] Starting research for: ${company.name}`)

      // Create company in DB first to get ID
      const dbCompany = getOrCreateCompany(company.name)

      // Create discovery link
      if (discoveryRunId) {
        createDiscoveryLink(
          discoveryRunId,
          dbCompany.id,
          company.source,
          company.snippet,
          company.rank
        )
      }

      // Trigger research (with timeout)
      const researchPromise = triggerCompanyResearch(company.name)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Research timeout')), 5 * 60 * 1000) // 5 min timeout
      )

      const result = await Promise.race([researchPromise, timeoutPromise]) as Awaited<ReturnType<typeof triggerCompanyResearch>>

      return {
        name: company.name,
        companyId: dbCompany.id,
        success: result.status === 'complete',
        signalsFound: result.signalsFound,
        contactsFound: result.contactsFound
      }
    } catch (error) {
      console.error(`[Company Researcher] Research failed for ${company.name}:`, error)
      return {
        name: company.name,
        companyId: company.companyId,
        success: false,
        signalsFound: 0,
        contactsFound: 0
      }
    }
  })

  // Wait for all research to complete
  const results = await Promise.all(researchPromises)

  // Update discovered companies with research status
  const updatedCompanies: DiscoveredCompany[] = discoveredCompanies.map(company => {
    const result = results.find(r => r.name === company.name)
    if (result) {
      return {
        ...company,
        companyId: result.companyId || company.companyId,
        researchComplete: result.success,
        researchFailed: !result.success
      }
    }
    return company
  })

  // Count successes
  const successCount = results.filter(r => r.success).length
  const totalResearched = updatedCompanies.filter(c => c.researchComplete).length

  console.log(`[Company Researcher] Batch complete: ${successCount}/${batch.length} succeeded`)
  console.log(`[Company Researcher] Total researched: ${totalResearched}/${pendingCompanies.length}`)

  // Update DB
  if (discoveryRunId) {
    updateDiscoveryRunStatus(discoveryRunId, 'researching', {
      companiesResearched: totalResearched
    })
  }

  // Check if more pending
  const stillPending = updatedCompanies.filter(c => !c.researchComplete && !c.researchFailed)
  const nextPhase = stillPending.length > 0 ? 'researching' : 'analyzing'

  return {
    discoveredCompanies: updatedCompanies,
    companiesResearched: totalResearched,
    currentPhase: nextPhase as DiscoveryPhase,
    messages: [new HumanMessage(`Researched batch: ${successCount}/${batch.length} succeeded. Total: ${totalResearched}`)]
  }
}

/**
 * Determine if we should continue researching or move to analysis
 */
export function shouldContinueResearching(state: CompanyDiscoveryStateType): string {
  const { currentPhase, discoveredCompanies, maxCompanies } = state

  if (currentPhase !== 'researching') {
    return 'orchestrator'
  }

  // Check for pending companies
  const pending = discoveredCompanies
    .filter(c => !c.researchComplete && !c.researchFailed)
    .slice(0, maxCompanies)

  if (pending.length > 0) {
    return 'company_researcher'
  }

  return 'orchestrator'
}
