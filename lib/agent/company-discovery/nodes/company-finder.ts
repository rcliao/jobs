import { HumanMessage } from '@langchain/core/messages'
import type { CompanyDiscoveryStateType, DiscoveryPhase, DiscoveredCompany } from '../state'
import { extractCompaniesFromResults } from '../gemini-discovery'
import { searchGoogle } from '@/lib/search/google'
import {
  updateDiscoveryRunStatus,
  incrementDiscoveryCount
} from '@/lib/db/discovery-queries'

/**
 * Company Finder Node
 *
 * Executes search queries and extracts company names from results.
 * Continues until enough companies are found or all queries executed.
 */
export async function companyFinderNode(
  state: CompanyDiscoveryStateType
): Promise<Partial<CompanyDiscoveryStateType>> {
  const { searchQueries, queriesExecuted, discoveredCompanies, maxCompanies, discoveryRunId } = state

  console.log(`[Company Finder] Executing queries. Progress: ${queriesExecuted}/${searchQueries.length}`)
  console.log(`[Company Finder] Companies found so far: ${discoveredCompanies.length}/${maxCompanies}`)

  // Check if we've found enough companies
  if (discoveredCompanies.length >= maxCompanies) {
    console.log('[Company Finder] Reached max companies, moving to research phase')
    return {
      currentPhase: 'researching' as DiscoveryPhase,
      messages: [new HumanMessage(`Found ${discoveredCompanies.length} companies, starting research`)]
    }
  }

  // Check if we've exhausted all queries
  if (queriesExecuted >= searchQueries.length) {
    console.log('[Company Finder] All queries executed')
    if (discoveredCompanies.length === 0) {
      return {
        currentPhase: 'error' as DiscoveryPhase,
        errors: ['No companies found from search queries']
      }
    }
    return {
      currentPhase: 'researching' as DiscoveryPhase,
      messages: [new HumanMessage(`Queries exhausted. Found ${discoveredCompanies.length} companies.`)]
    }
  }

  // Execute next query
  const query = searchQueries[queriesExecuted]
  console.log(`[Company Finder] Executing query: ${query}`)

  try {
    const searchResults = await searchGoogle(query)
    console.log(`[Company Finder] Got ${searchResults.length} search results`)

    // Extract company names from results
    const existingNames = discoveredCompanies.map(c => c.name)
    const extracted = await extractCompaniesFromResults(searchResults, existingNames)
    console.log(`[Company Finder] Extracted ${extracted.length} new companies`)

    // Convert to DiscoveredCompany format
    const newCompanies: DiscoveredCompany[] = extracted.map((c, idx) => ({
      name: c.name,
      snippet: c.snippet,
      source: query,
      sourceUrl: c.sourceUrl,
      rank: discoveredCompanies.length + idx + 1,
      researchComplete: false,
      researchFailed: false
    }))

    // Update discovery run in DB
    if (discoveryRunId) {
      const totalDiscovered = discoveredCompanies.length + newCompanies.length
      updateDiscoveryRunStatus(discoveryRunId, 'discovering', {
        companiesDiscovered: Math.min(totalDiscovered, maxCompanies)
      })
    }

    // Check if we now have enough
    const totalFound = discoveredCompanies.length + newCompanies.length
    const nextPhase = totalFound >= maxCompanies ? 'researching' : 'discovering'

    return {
      discoveredCompanies: newCompanies,
      queriesExecuted: queriesExecuted + 1,
      currentPhase: nextPhase as DiscoveryPhase,
      messages: [new HumanMessage(`Query "${query.slice(0, 50)}..." found ${newCompanies.length} companies`)],
      apiCallsThisRun: 2 // search + extraction
    }
  } catch (error) {
    console.error(`[Company Finder] Query failed:`, error)

    // Continue with next query on error
    return {
      queriesExecuted: queriesExecuted + 1,
      errors: [`Query failed: ${query.slice(0, 50)}... - ${error}`],
      apiCallsThisRun: 1
    }
  }
}

/**
 * Determine if we should continue finding or move to research
 */
export function shouldContinueFinding(state: CompanyDiscoveryStateType): string {
  const { currentPhase, discoveredCompanies, maxCompanies, searchQueries, queriesExecuted } = state

  if (currentPhase !== 'discovering') {
    return 'orchestrator'
  }

  // Continue if: not enough companies AND more queries available
  if (discoveredCompanies.length < maxCompanies && queriesExecuted < searchQueries.length) {
    return 'company_finder'
  }

  return 'orchestrator'
}
