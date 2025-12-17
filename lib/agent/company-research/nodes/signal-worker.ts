import { randomUUID } from 'crypto'
import { AIMessage } from '@langchain/core/messages'
import type { CompanyResearchStateType, CollectedSignal } from '../state'
import type { SignalCategory } from '@/types'
import { getResearchAgentConfig } from '@/lib/db/company-queries'
import { searchGoogle } from '@/lib/search/google'
import { analyzeSignalsWithGemini, extractUrlsFromSearchResults } from '../gemini-research'

// Query templates for each signal category
const SIGNAL_QUERY_TEMPLATES: Record<SignalCategory, string[]> = {
  growth_funding: [
    '"{company}" funding round site:techcrunch.com OR site:crunchbase.com OR site:venturebeat.com',
    '"{company}" series A OR series B OR series C OR seed funding',
    '"{company}" hiring growth headcount expansion',
    '"{company}" new office opening expansion news'
  ],
  culture_work_style: [
    '"{company}" engineering culture blog',
    '"{company}" remote work policy hybrid',
    '"{company}" reviews site:glassdoor.com OR site:blind.com',
    '"{company}" work life balance company culture values'
  ],
  tech_stack_engineering: [
    '"{company}" tech stack engineering blog technology',
    '"{company}" site:github.com open source',
    '"{company}" kubernetes docker microservices architecture',
    '"{company}" machine learning AI data engineering'
  ],
  leadership_changes: [
    '"{company}" new CTO OR "VP Engineering" OR "Director Engineering"',
    '"{company}" executive hire leadership announcement',
    '"{company}" engineering team growth expansion'
  ],
  job_openings: [
    '"{company}" hiring site:linkedin.com/jobs OR site:lever.co OR site:greenhouse.io',
    '"{company}" careers open positions site:indeed.com OR site:glassdoor.com/job',
    '"{company}" jobs engineer developer software'
  ]
}

// Date restrictions by category
const DATE_RESTRICTIONS: Record<SignalCategory, string> = {
  growth_funding: 'y1',      // Last year
  culture_work_style: 'y2',  // Last 2 years
  tech_stack_engineering: 'y1',
  leadership_changes: 'm6',  // Last 6 months
  job_openings: 'm1'         // Last month (job postings are time-sensitive)
}

/**
 * Signal Worker node - executes category-specific queries and analyzes results
 */
export async function signalWorkerNode(
  state: CompanyResearchStateType
): Promise<Partial<CompanyResearchStateType>> {
  const { companyName, companyDomain, currentSignalCategory, signalIterations } = state

  if (!currentSignalCategory) {
    return {
      errors: ['No signal category specified for signal worker']
    }
  }

  // Load config
  const config = await getResearchAgentConfig('signal_worker')
  const minSignalsRequired = config?.behaviorConfig.minSignalsRequired ?? 2
  const confidenceThreshold = config?.behaviorConfig.confidenceThreshold ?? 5

  const currentIter = signalIterations[currentSignalCategory]

  // Get query templates (from config or defaults)
  const templates = config?.toolsConfig.customQueryTemplates?.length
    ? config.toolsConfig.customQueryTemplates
    : SIGNAL_QUERY_TEMPLATES[currentSignalCategory]

  // Select query for this iteration (rotate through templates)
  const queryIndex = currentIter.iteration % templates.length
  const queryTemplate = templates[queryIndex]
  const query = queryTemplate
    .replace(/\{company\}/g, companyName)
    .replace(/"{company}"/g, `"${companyName}"`)

  const year = new Date().getFullYear()
  const queryWithYear = query.replace(/\{year\}/g, year.toString())

  try {
    // Execute search
    const dateRestrict = DATE_RESTRICTIONS[currentSignalCategory]
    const results = await searchGoogle(queryWithYear, dateRestrict)

    if (results.length === 0) {
      // No results, mark as needing less research
      const updatedIterations = {
        [currentSignalCategory]: {
          ...currentIter,
          iteration: currentIter.iteration + 1,
          queriesExecuted: [...currentIter.queriesExecuted, queryWithYear],
          needsMoreResearch: currentIter.iteration + 1 < currentIter.maxIterations
        }
      }

      return {
        signalIterations: updatedIterations as Record<SignalCategory, typeof currentIter>,
        apiCallsThisRun: 1,
        messages: [new AIMessage(`No search results found for ${formatCategory(currentSignalCategory)} query.`)]
      }
    }

    // Analyze results with Gemini
    const signals = await analyzeSignalsWithGemini(
      results,
      companyName,
      currentSignalCategory,
      config?.systemPrompt
    )

    // Extract URLs from search results (lightweight, no LLM call)
    const extractedUrls = extractUrlsFromSearchResults(results, companyName, companyDomain)

    // Filter by confidence threshold
    const qualitySignals = signals.filter(s => s.confidence >= confidenceThreshold)

    // Convert to CollectedSignal format
    const collectedSignals: CollectedSignal[] = qualitySignals.map(s => ({
      id: randomUUID(),
      category: currentSignalCategory,
      content: s.content,
      source: s.source,
      sourceUrl: s.sourceUrl,
      confidence: s.confidence,
      rawSnippet: s.rawSnippet || null,
      publishedAt: s.publishedDate || null
    }))

    // Determine if more research is needed
    const totalSignalsForCategory = currentIter.signalsFound + collectedSignals.length
    const needsMore = totalSignalsForCategory < minSignalsRequired &&
                      currentIter.iteration + 1 < currentIter.maxIterations

    // Update iteration state
    const updatedIterations = {
      [currentSignalCategory]: {
        ...currentIter,
        iteration: currentIter.iteration + 1,
        queriesExecuted: [...currentIter.queriesExecuted, queryWithYear],
        signalsFound: totalSignalsForCategory,
        needsMoreResearch: needsMore
      }
    }

    return {
      collectedSignals,
      extractedUrls,
      signalIterations: updatedIterations as Record<SignalCategory, typeof currentIter>,
      apiCallsThisRun: 2, // 1 search + 1 LLM call
      messages: [new AIMessage(
        `Found ${collectedSignals.length} quality signals for ${formatCategory(currentSignalCategory)} ` +
        `(${totalSignalsForCategory} total for category).`
      )]
    }
  } catch (error) {
    console.error(`Signal worker error for ${currentSignalCategory}:`, error)

    // Mark as not needing more research on error
    const updatedIterations = {
      [currentSignalCategory]: {
        ...currentIter,
        iteration: currentIter.iteration + 1,
        needsMoreResearch: false
      }
    }

    return {
      signalIterations: updatedIterations as Record<SignalCategory, typeof currentIter>,
      errors: [`Signal worker error for ${currentSignalCategory}: ${error}`]
    }
  }
}

/**
 * Format category name for display
 */
function formatCategory(category: SignalCategory): string {
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
