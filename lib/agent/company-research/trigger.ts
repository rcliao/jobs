import { HumanMessage } from '@langchain/core/messages'
import { companyResearchGraph } from './graph'
import { CompanyResearchState } from './state'
import {
  getOrCreateCompany,
  getCompanyByName,
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
export async function triggerCompanyResearch(companyName: string): Promise<CompanyResearchResult> {
  console.log(`Starting research for company: ${companyName}`)

  // Get or create the company
  const company = getOrCreateCompany(companyName)

  // Create a research run
  const researchRunId = createCompanyResearchRun(company.id)

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
 * Normalize company name for consistent matching
 */
function normalizeCompanyName(name: string): string {
  return name
    .replace(/\.(com|org|net|io|co|ai)$/i, '')
    .replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$/i, '')
    .trim()
}

/**
 * Queue companies from job search results for research
 * Only queues companies that haven't been researched recently
 */
export async function queueCompaniesFromJobs(
  jobs: { company: string }[],
  options: { maxResearchAge?: number } = {}
): Promise<{ queued: string[]; skipped: string[] }> {
  const { maxResearchAge = 30 } = options // Days

  const uniqueCompanies = [...new Set(jobs.map(j => normalizeCompanyName(j.company)))]
  const queued: string[] = []
  const skipped: string[] = []

  const maxAgeMs = maxResearchAge * 24 * 60 * 60 * 1000

  for (const companyName of uniqueCompanies) {
    if (!companyName || companyName.length < 2) {
      continue
    }

    // Check if already researched recently
    const existing = getCompanyByName(companyName)

    if (existing?.lastResearchedAt) {
      const age = Date.now() - existing.lastResearchedAt.getTime()
      if (age < maxAgeMs) {
        skipped.push(companyName)
        continue
      }
    }

    // Queue for research (don't await - fire and forget)
    queued.push(companyName)
    triggerCompanyResearch(companyName).catch(err => {
      console.error(`Background research failed for ${companyName}:`, err)
    })
  }

  console.log(`Queued ${queued.length} companies for research, skipped ${skipped.length}`)
  return { queued, skipped }
}

/**
 * Run scheduled research for companies that need updating
 * Returns results for all processed companies
 */
export async function runScheduledResearch(
  limit: number = 5
): Promise<CompanyResearchResult[]> {
  const companies = getCompaniesNeedingResearch(limit)

  if (companies.length === 0) {
    console.log('No companies need research')
    return []
  }

  console.log(`Running scheduled research for ${companies.length} companies`)

  const results: CompanyResearchResult[] = []

  // Process sequentially to respect rate limits
  for (const company of companies) {
    try {
      const result = await triggerCompanyResearch(company.name)
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
