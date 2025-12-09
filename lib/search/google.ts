// Google Custom Search API wrapper

export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  // Date metadata from pagemap or snippet parsing
  publishedDate: string | null  // ISO date string if available
}

// Raw Google API response item
interface GoogleApiItem {
  title: string
  link: string
  snippet: string
  displayLink: string
  pagemap?: {
    metatags?: Array<{
      'article:published_time'?: string
      'og:updated_time'?: string
      'datePublished'?: string
      'date'?: string
      'publish_date'?: string
      'article:modified_time'?: string
    }>
  }
}

export interface GoogleSearchResponse {
  items?: GoogleApiItem[]
  searchInformation?: {
    totalResults: string
  }
}

/**
 * Extract publication date from Google API pagemap or snippet
 */
function extractPublishedDate(item: GoogleApiItem): string | null {
  // Try to get date from pagemap metatags
  const metatags = item.pagemap?.metatags?.[0]
  if (metatags) {
    const dateString = metatags['article:published_time']
      || metatags['datePublished']
      || metatags['og:updated_time']
      || metatags['publish_date']
      || metatags['date']
      || metatags['article:modified_time']

    if (dateString) {
      try {
        const date = new Date(dateString)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch {
        // Invalid date, continue
      }
    }
  }

  // Try to parse date from snippet (common patterns like "Jan 15, 2024" or "2024-01-15")
  const snippet = item.snippet || ''
  const title = item.title || ''
  const text = `${title} ${snippet}`

  // Pattern: "Month Day, Year" (e.g., "Jan 15, 2024" or "January 15, 2024")
  const monthDayYear = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i)
  if (monthDayYear) {
    try {
      const date = new Date(monthDayYear[0].replace(',', ''))
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Invalid date
    }
  }

  // Pattern: "Day Month Year" (e.g., "15 Jan 2024")
  const dayMonthYear = text.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/i)
  if (dayMonthYear) {
    try {
      const date = new Date(dayMonthYear[0])
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Invalid date
    }
  }

  // Pattern: YYYY-MM-DD or YYYY/MM/DD
  const isoDate = text.match(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/)
  if (isoDate) {
    try {
      const date = new Date(isoDate[0].replace(/\//g, '-'))
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Invalid date
    }
  }

  return null
}

export async function searchGoogle(query: string, dateRestrict: string = 'm1'): Promise<GoogleSearchResult[]> {
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
  if (dateRestrict) {
    url.searchParams.set('dateRestrict', dateRestrict)
  }

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Search API error: ${response.status} ${error}`)
    }

    const data: GoogleSearchResponse = await response.json()

    // Transform API items to include extracted dates
    return (data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      publishedDate: extractPublishedDate(item)
    }))
  } catch (error) {
    console.error('Google Search error:', error)
    throw error
  }
}

export async function searchMultipleQueries(queries: string[], dateRestrict: string = 'm1'): Promise<GoogleSearchResult[]> {
  console.log(`Executing ${queries.length} Google Custom Search queries...`)

  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(query => searchGoogle(query, dateRestrict))
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
