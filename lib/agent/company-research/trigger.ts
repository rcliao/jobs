import { HumanMessage } from '@langchain/core/messages'
import { companyResearchGraph } from './graph'
import {
  getOrCreateCompany,
  createCompanyResearchRun,
  getCompaniesNeedingResearch
} from '@/lib/db/company-queries'

/**
 * Result of a company research execution
 */
export interface CompanyResearchResult {
  companyId: string
  companyName: string
  researchRunId: string
  status: 'complete' | 'failed'
  summary: string | null
  score: number | null
  signalsFound: number
  contactsFound: number
  errors: string[]
}

/**
 * Trigger research for a specific company by name
 */
export async function triggerCompanyResearch(companyName: string, profileId: string = 'default'): Promise<CompanyResearchResult> {
  console.log(`Starting research for company: ${companyName} (profile: ${profileId})`)

  // Get or create the company (scoped by profile)
  const company = getOrCreateCompany(companyName, profileId)

  // Create a research run
  const researchRunId = createCompanyResearchRun(company.id, profileId)

  // Build initial state
  const initialState = {
    messages: [new HumanMessage(`Research company: ${companyName}`)],
    companyId: company.id,
    companyName: companyName,
    companyDomain: company.domain,
    researchRunId: researchRunId
  }

  try {
    // Execute the graph with increased recursion limit
    // (4 signal categories × 2 iterations + contacts + synthesis = ~50 steps max)
    const finalState = await companyResearchGraph.invoke(initialState, {
      recursionLimit: 100,
      // LangSmith tracing configuration
      runName: `Company Research: ${companyName}`,
      tags: ['company-research', 'multi-agent'],
      metadata: {
        companyId: company.id,
        companyName: companyName,
        researchRunId: researchRunId,
        triggeredAt: new Date().toISOString()
      }
    })

    return {
      companyId: company.id,
      companyName: companyName,
      researchRunId: researchRunId,
      status: finalState.currentPhase === 'complete' ? 'complete' : 'failed',
      summary: finalState.researchSummary,
      score: finalState.companyScore,
      signalsFound: finalState.collectedSignals?.length || 0,
      contactsFound: finalState.discoveredContacts?.length || 0,
      errors: finalState.errors || []
    }
  } catch (error) {
    console.error(`Research failed for ${companyName}:`, error)
    return {
      companyId: company.id,
      companyName: companyName,
      researchRunId: researchRunId,
      status: 'failed',
      summary: null,
      score: null,
      signalsFound: 0,
      contactsFound: 0,
      errors: [String(error)]
    }
  }
}

/**
 * Run scheduled research for companies that need updating
 * Returns results for all processed companies
 */
export async function runScheduledResearch(
  limit: number = 5,
  profileId: string = 'default'
): Promise<CompanyResearchResult[]> {
  const companies = getCompaniesNeedingResearch(limit, profileId)

  if (companies.length === 0) {
    console.log('No companies need research')
    return []
  }

  console.log(`Running scheduled research for ${companies.length} companies (profile: ${profileId})`)

  const results: CompanyResearchResult[] = []

  // Process sequentially to respect rate limits
  for (const company of companies) {
    try {
      const result = await triggerCompanyResearch(company.name, profileId)
      results.push(result)

      // Small delay between companies to respect API limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`Scheduled research failed for ${company.name}:`, error)
      results.push({
        companyId: company.id,
        companyName: company.name,
        researchRunId: '',
        status: 'failed',
        summary: null,
        score: null,
        signalsFound: 0,
        contactsFound: 0,
        errors: [String(error)]
      })
    }
  }

  return results
}
