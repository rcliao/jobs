// Search orchestration - coordinates query generation, search execution, and job scoring
import { randomUUID } from 'crypto'
import type { Profile, AgentConfig, SearchRun, Job } from '@/types'
import { searchMultipleQueries } from '@/lib/search/google'
import { generateSearchQueries, batchScoreJobs } from '@/lib/agent/gemini'
import { containsAvoidKeywords } from '@/lib/utils/text-processing'
import {
  createSearchRun,
  updateSearchRun,
  createJob,
  getProfile,
  getAgentConfig
} from '@/lib/db/queries'

export interface SearchResult {
  searchRunId: string
  jobsFound: number
  queries: string[]
}

export async function executeSearch(): Promise<SearchResult> {
  console.log('=== Starting Job Search Execution ===')

  // Load profile and agent config
  const profile = getProfile()
  const agentConfig = getAgentConfig()

  if (!profile || !agentConfig) {
    throw new Error('Profile or agent config not found. Please configure your settings first.')
  }

  const searchRunId = randomUUID()

  try {
    // Step 1: Generate search queries with Gemini AI
    console.log('Step 1: Generating search queries...')
    const queries = await generateSearchQueries(profile, agentConfig)

    // Create search run record with the generated queries
    const searchRun = createSearchRun({
      id: searchRunId,
      executedAt: new Date(),
      queries,
      resultsCount: 0,
      status: 'running',
      errorMessage: null
    })

    console.log(`Created search run: ${searchRunId}`)

    // Step 2: Execute Google Custom Search
    console.log('Step 2: Executing Google Custom Search...')
    const searchResults = await searchMultipleQueries(queries, 'm1')

    if (searchResults.length === 0) {
      console.log('No results found')
      updateSearchRun(searchRunId, { status: 'complete', resultsCount: 0 })
      return {
        searchRunId,
        jobsFound: 0,
        queries
      }
    }

    // Step 3: Score jobs with Gemini AI
    console.log('Step 3: Scoring jobs with AI...')

    // Filter out jobs containing avoid keywords
    const filteredResults = searchResults.filter(result => {
      const textToCheck = `${result.title} ${result.snippet}`
      const shouldAvoid = containsAvoidKeywords(textToCheck, profile.avoid)
      if (shouldAvoid) {
        console.log(`Skipping job with avoid keywords: ${result.title}`)
      }
      return !shouldAvoid
    })

    if (filteredResults.length < searchResults.length) {
      console.log(`Filtered out ${searchResults.length - filteredResults.length} jobs based on avoid keywords`)
    }

    const jobsToScore = filteredResults.map(result => ({
      title: result.title,
      company: result.displayLink,
      description: result.snippet,
      location: extractLocation(result.snippet)
    }))

    const scores = await batchScoreJobs(jobsToScore, profile, agentConfig)

    // Step 4: Save jobs to database
    console.log('Step 4: Saving jobs to database...')
    let savedCount = 0

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i]
      const scoreData = scores[i]

      try {
        const job: Omit<Job, 'createdAt' | 'updatedAt'> = {
          id: randomUUID(),
          title: result.title,
          company: result.displayLink,
          description: result.snippet,
          url: result.link,
          source: 'google_custom_search',
          location: extractLocation(result.snippet),
          remote: isRemote(result.snippet),
          postedDate: null, // Google CSE doesn't provide this
          score: scoreData.score,
          matchReasoning: scoreData.reasoning,
          status: 'new',
          notes: null,
          foundAt: new Date(),
          searchId: searchRunId
        }

        createJob(job)
        savedCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        // Skip duplicates (unique URL constraint)
        if (errorMessage.includes('UNIQUE constraint')) {
          console.log(`Skipping duplicate job: ${result.link}`)
        } else {
          console.error('Error saving job:', error)
        }
      }
    }

    // Step 5: Update search run as complete
    updateSearchRun(searchRunId, {
      status: 'complete',
      resultsCount: savedCount
    })

    console.log(`=== Search Complete: ${savedCount} jobs saved ===`)

    return {
      searchRunId,
      jobsFound: savedCount,
      queries
    }
  } catch (error) {
    console.error('Search execution failed:', error)

    // Update search run as failed
    updateSearchRun(searchRunId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    throw error
  }
}

// Helper functions
function extractLocation(text: string): string {
  // Simple heuristic to extract location from snippet
  // Look for common patterns like "Remote", "San Francisco, CA", etc.
  const remoteMatch = text.match(/\b(remote|Remote|REMOTE)\b/i)
  if (remoteMatch) return 'Remote'

  // Look for city, state patterns
  const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/)
  if (locationMatch) return locationMatch[0]

  return 'Not specified'
}

function isRemote(text: string): boolean {
  return /\b(remote|Remote|REMOTE|remote-first|remote first)\b/i.test(text)
}
