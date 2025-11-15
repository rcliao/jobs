// Google Custom Search API wrapper

export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
}

export interface GoogleSearchResponse {
  items?: GoogleSearchResult[]
  searchInformation?: {
    totalResults: string
  }
}

export async function searchGoogle(query: string): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

  if (!apiKey || !searchEngineId) {
    throw new Error('Missing Google API credentials. Check GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env.local')
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', searchEngineId)
  url.searchParams.set('q', query)
  url.searchParams.set('num', '10') // Get top 10 results per query

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Search API error: ${response.status} ${error}`)
    }

    const data: GoogleSearchResponse = await response.json()

    return data.items || []
  } catch (error) {
    console.error('Google Search error:', error)
    throw error
  }
}

export async function searchMultipleQueries(queries: string[]): Promise<GoogleSearchResult[]> {
  console.log(`Executing ${queries.length} Google Custom Search queries...`)

  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(query => searchGoogle(query))
  )

  // Flatten results and deduplicate by URL
  const allResults = results.flat()
  const uniqueResults = new Map<string, GoogleSearchResult>()

  for (const result of allResults) {
    if (!uniqueResults.has(result.link)) {
      uniqueResults.set(result.link, result)
    }
  }

  console.log(`Found ${allResults.length} total results, ${uniqueResults.size} unique after deduplication`)

  return Array.from(uniqueResults.values())
}
