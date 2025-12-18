import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { traceable } from 'langsmith/traceable'
import type { GoogleSearchResult } from '@/lib/search/google'
import type { SignalCategory, ContactType } from '@/types'
import type { CollectedSignal, DiscoveredContact } from './state'

// Singleton client
let geminiClient: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('Missing GOOGLE_API_KEY environment variable')
    }
    geminiClient = new GoogleGenerativeAI(apiKey)
  }
  return geminiClient
}

// Signal analysis result from Gemini
interface AnalyzedSignal {
  content: string
  confidence: number
  source: string
  sourceUrl: string
  rawSnippet?: string
  publishedDate: string | null  // ISO date string
}

// Contact extraction result from Gemini
interface ExtractedContact {
  name: string
  title: string
  linkedinUrl: string | null
  email: string | null
  contactType: ContactType
  relevanceScore: number
}

// Synthesis result from Gemini
interface SynthesisResult {
  summary: string
  score: number
  keyInsights: string[]
  recommendedApproach: string
}

// Extracted company URLs
export interface ExtractedUrls {
  careersPageUrl: string | null
  culturePageUrl: string | null
  glassdoorUrl: string | null
  crunchbaseUrl: string | null
  foundedYear: number | null
  alternatives: {
    careers: string[]
    culture: string[]
    reviews: string[]
  }
  confidence: {
    careers: number
    culture: number
    glassdoor: number
    crunchbase: number
  }
}

// Schema for signal analysis response
const signalAnalysisSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      content: {
        type: SchemaType.STRING,
        description: 'A concise 1-2 sentence description of the signal'
      },
      confidence: {
        type: SchemaType.INTEGER,
        description: 'Score 1-10 based on source reliability and recency'
      },
      source: {
        type: SchemaType.STRING,
        description: 'The publication/website name'
      },
      sourceUrl: {
        type: SchemaType.STRING,
        description: 'The URL of the source'
      },
      publishedDate: {
        type: SchemaType.STRING,
        nullable: true,
        description: 'Publication date in ISO format (YYYY-MM-DD) or null if unknown'
      }
    },
    required: ['content', 'confidence', 'source', 'sourceUrl']
  },
  description: 'Array of analyzed signals'
}

// Schema for contact extraction response
const contactExtractionSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Full name of the contact'
      },
      title: {
        type: SchemaType.STRING,
        description: 'Job title'
      },
      linkedinUrl: {
        type: SchemaType.STRING,
        nullable: true,
        description: 'LinkedIn profile URL if available'
      },
      contactType: {
        type: SchemaType.STRING,
        description: 'Type of contact role: founder, executive, director, manager, team_lead, hiring_manager, or recruiter'
      },
      relevanceScore: {
        type: SchemaType.INTEGER,
        description: 'Score 1-10 for networking relevance'
      }
    },
    required: ['name', 'title', 'contactType', 'relevanceScore']
  },
  description: 'Array of extracted contacts'
}

// Schema for synthesis response
const synthesisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: 'A 3-4 paragraph summary of the company'
    },
    score: {
      type: SchemaType.INTEGER,
      description: 'Overall score 1-10 for this company as a job opportunity'
    },
    keyInsights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'List of 3 key insights'
    },
    recommendedApproach: {
      type: SchemaType.STRING,
      description: 'Brief description of best networking strategy'
    }
  },
  required: ['summary', 'score', 'keyInsights', 'recommendedApproach']
}

/**
 * Analyze search results for company signals using Gemini
 */
export const analyzeSignalsWithGemini = traceable(async function analyzeSignalsWithGemini(
  searchResults: GoogleSearchResult[],
  companyName: string,
  category: SignalCategory,
  customPrompt?: string
): Promise<AnalyzedSignal[]> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: signalAnalysisSchema
    }
  })

  // Format search results for the prompt, including any known publication dates
  const resultsText = searchResults.map((r, i) => {
    let text = `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
    if (r.publishedDate) {
      text += `\nPublished: ${r.publishedDate}`
    }
    return text
  }).join('\n\n---\n\n')

  const categoryLabel = category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  // Build the prompt
  let prompt: string
  if (customPrompt) {
    prompt = customPrompt
      .replace(/\{\{company\}\}/g, companyName)
      .replace(/\{\{category\}\}/g, categoryLabel)
    prompt += `\n\nSearch Results:\n${resultsText}`
  } else {
    prompt = `Analyze these search results about ${companyName} for ${categoryLabel} signals.

Search Results:
${resultsText}

Extract relevant signals. For each signal found, provide:
1. content: A concise 1-2 sentence description of the signal
2. confidence: Score 1-10 based on source reliability and recency (recent signals score higher)
3. source: The publication/website name
4. sourceUrl: The URL of the source
5. publishedDate: The publication date in ISO format (YYYY-MM-DD). Extract from the "Published" field if provided, or estimate from dates mentioned in title/snippet. Use null if unknown.

Only include signals specifically about ${companyName}, not general industry news.
Prioritize recent information - signals from the last 6 months are most relevant.
Return empty array if no relevant signals found.`
  }

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    // Validate and transform
    return parsed.map((s: Record<string, unknown>) => {
      const sourceUrl = String(s.sourceUrl || '')
      const matchingResult = searchResults.find(r => r.link === sourceUrl)

      // Use Gemini's extracted date, fall back to our parsed date from search
      let publishedDate: string | null = null
      if (s.publishedDate && typeof s.publishedDate === 'string') {
        try {
          const date = new Date(s.publishedDate)
          if (!isNaN(date.getTime())) {
            publishedDate = date.toISOString()
          }
        } catch {
          // Invalid date from Gemini
        }
      }
      // Fall back to date we extracted from search result
      if (!publishedDate && matchingResult?.publishedDate) {
        publishedDate = matchingResult.publishedDate
      }

      return {
        content: String(s.content || ''),
        confidence: Math.min(10, Math.max(1, Number(s.confidence) || 5)),
        source: String(s.source || 'Unknown'),
        sourceUrl,
        rawSnippet: matchingResult?.snippet,
        publishedDate
      }
    }).filter((s: AnalyzedSignal) => s.content.length > 0)
  } catch (error) {
    console.error('Signal analysis error:', error)
    return []
  }
}, { name: 'analyzeSignalsWithGemini', run_type: 'llm' })

/**
 * Extract contacts from search results using Gemini
 */
export const extractContactsWithGemini = traceable(async function extractContactsWithGemini(
  searchResults: GoogleSearchResult[],
  companyName: string,
  customPrompt?: string
): Promise<ExtractedContact[]> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: contactExtractionSchema
    }
  })

  // Format search results
  const resultsText = searchResults.map((r, i) =>
    `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
  ).join('\n\n---\n\n')

  // Build the prompt
  let prompt: string
  if (customPrompt) {
    prompt = customPrompt.replace(/\{\{company\}\}/g, companyName)
    prompt += `\n\nSearch Results:\n${resultsText}`
  } else {
    prompt = `Extract contacts from these search results for ${companyName}.

Search Results:
${resultsText}

For each person found, extract:
1. name: Full name
2. title: Job title
3. linkedinUrl: LinkedIn profile URL (if visible in the result)
4. contactType: One of:
   - "founder" (CEO, Co-founder, Founder)
   - "executive" (CTO, VP, C-suite officers)
   - "director" (Director of Engineering, Director of Product)
   - "manager" (Engineering Manager, Product Manager)
   - "team_lead" (Tech Lead, Staff Engineer, Principal Engineer)
   - "hiring_manager" (explicitly hiring-focused roles)
   - "recruiter" (Recruiter, Talent Acquisition)
5. relevanceScore: 1-10 based on how useful for job search networking (founders/executives at small companies are highly relevant)

Only include people who clearly work at ${companyName}.
Return empty array if no valid contacts found.`
  }

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    // Validate and transform
    return parsed.map((c: Record<string, unknown>) => ({
      name: String(c.name || ''),
      title: String(c.title || ''),
      linkedinUrl: c.linkedinUrl ? String(c.linkedinUrl) : null,
      email: c.email ? String(c.email) : null,
      contactType: validateContactType(String(c.contactType || 'team_lead')),
      relevanceScore: Math.min(10, Math.max(1, Number(c.relevanceScore) || 5))
    })).filter((c: ExtractedContact) => c.name.length > 0 && c.title.length > 0)
  } catch (error) {
    console.error('Contact extraction error:', error)
    return []
  }
}, { name: 'extractContactsWithGemini', run_type: 'llm' })

/**
 * Validate contact type string
 */
function validateContactType(type: string): ContactType {
  const validTypes: ContactType[] = [
    'founder', 'executive', 'director', 'manager',
    'team_lead', 'hiring_manager', 'recruiter'
  ]
  const normalized = type.toLowerCase().replace(/\s+/g, '_')
  return validTypes.includes(normalized as ContactType)
    ? (normalized as ContactType)
    : 'team_lead'
}

/**
 * Synthesize research findings into a summary and score
 */
export const synthesizeResearchWithGemini = traceable(async function synthesizeResearchWithGemini(
  companyName: string,
  signals: CollectedSignal[],
  contacts: DiscoveredContact[],
  customPrompt?: string,
  scoringWeights?: Record<SignalCategory, number>
): Promise<SynthesisResult> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: synthesisSchema
    }
  })

  // Group signals by category
  const signalsByCategory: Record<string, CollectedSignal[]> = {}
  for (const signal of signals) {
    if (!signalsByCategory[signal.category]) {
      signalsByCategory[signal.category] = []
    }
    signalsByCategory[signal.category].push(signal)
  }

  // Format signals for prompt
  const signalsText = Object.entries(signalsByCategory)
    .map(([cat, sigs]) => {
      const categoryLabel = cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return `## ${categoryLabel}\n${sigs.map(s => `- ${s.content} (confidence: ${s.confidence}/10, source: ${s.source})`).join('\n')}`
    })
    .join('\n\n')

  // Format contacts for prompt
  const contactsText = contacts.length > 0
    ? contacts.map(c => `- ${c.name}: ${c.title} (${c.contactType}, relevance: ${c.relevanceScore}/10)`).join('\n')
    : 'No contacts discovered.'

  // Build the prompt
  let prompt: string
  if (customPrompt) {
    prompt = customPrompt
      .replace(/\{\{company\}\}/g, companyName)
      .replace(/\{\{signals\}\}/g, signalsText)
      .replace(/\{\{contacts\}\}/g, contactsText)
  } else {
    prompt = `Create an executive summary for ${companyName} based on this research.

COLLECTED SIGNALS:
${signalsText || 'No signals collected.'}

DISCOVERED CONTACTS:
${contactsText}

Create a concise 3-4 paragraph summary that helps a job seeker understand:
1. Company trajectory (growing/stable/declining)
2. Engineering culture and work environment
3. Best networking approach

Then provide an overall score 1-10 for this company as a job opportunity.`
  }

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    return {
      summary: String(parsed.summary || ''),
      score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      keyInsights: Array.isArray(parsed.keyInsights)
        ? parsed.keyInsights.map(String)
        : [],
      recommendedApproach: String(parsed.recommendedApproach || '')
    }
  } catch (error) {
    console.error('Synthesis error:', error)
    return {
      summary: `Research completed for ${companyName}. Found ${signals.length} signals and ${contacts.length} contacts.`,
      score: calculateDefaultScore(signals, scoringWeights),
      keyInsights: [],
      recommendedApproach: ''
    }
  }
}, { name: 'synthesizeResearchWithGemini', run_type: 'llm' })

/**
 * Calculate a default score based on signal quantity and confidence
 */
function calculateDefaultScore(
  signals: CollectedSignal[],
  weights?: Record<SignalCategory, number>
): number {
  if (signals.length === 0) return 5

  const defaultWeights: Record<SignalCategory, number> = {
    growth_funding: 0.20,
    culture_work_style: 0.25,
    tech_stack_engineering: 0.20,
    leadership_changes: 0.15,
    job_openings: 0.20
  }

  const w = weights || defaultWeights

  // Group signals by category
  const byCategory: Record<SignalCategory, CollectedSignal[]> = {
    growth_funding: [],
    culture_work_style: [],
    tech_stack_engineering: [],
    leadership_changes: [],
    job_openings: []
  }

  for (const signal of signals) {
    if (byCategory[signal.category]) {
      byCategory[signal.category].push(signal)
    }
  }

  // Calculate weighted average confidence
  let totalWeight = 0
  let weightedSum = 0

  for (const [category, categorySignals] of Object.entries(byCategory)) {
    if (categorySignals.length > 0) {
      const avgConfidence = categorySignals.reduce((sum, s) => sum + s.confidence, 0) / categorySignals.length
      const weight = w[category as SignalCategory] || 0.20
      weightedSum += avgConfidence * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return 5

  return Math.round(weightedSum / totalWeight)
}

import { searchGoogle } from '@/lib/search/google'

// Search engines and redirect URLs - should NEVER be stored as company URLs
const SEARCH_ENGINE_PATTERNS = [
  'google.com/search',
  'google.com/url',
  'www.google.com/search',
  'www.google.com/url',
  'bing.com/search',
  'yahoo.com/search',
  'duckduckgo.com/',
  'baidu.com/s',
  'yandex.com/search',
  'search.yahoo.com',
  'webcache.googleusercontent.com',
  'translate.google.com',
  'bit.ly/',
  'tinyurl.com/',
  't.co/',
  'goo.gl/'
]

// Job board domains that list jobs for many companies - should NOT be used as company careers pages
const JOB_BOARD_DOMAINS = [
  'glassdoor.com',
  'linkedin.com',
  'indeed.com',
  'ycombinator.com',
  'lever.co',
  'greenhouse.io',
  'workable.com',
  'ashbyhq.com',
  'smartrecruiters.com',
  'jobvite.com',
  'icims.com',
  'workday.com',
  'breezy.hr',
  'recruitee.com',
  'bamboohr.com',
  'angel.co',
  'wellfound.com',
  'zip recruiter',
  'monster.com',
  'careerbuilder.com',
  'dice.com',
  'stackoverflow.com/jobs',
  'hired.com',
  'triplebyte.com',
  'builtin.com'
]

// Generic sites that should not be used as culture/about pages
const GENERIC_SITES = [
  'wikipedia.org',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'youtube.com',
  'medium.com',
  'news.ycombinator.com'
]

/**
 * Check if URL is a search engine or redirect URL
 */
function isSearchEngineUrl(url: string): boolean {
  const urlLower = url.toLowerCase()
  return SEARCH_ENGINE_PATTERNS.some(pattern => urlLower.includes(pattern))
}

/**
 * Generate company name variations for matching
 */
function getCompanyNameVariations(companyName: string): string[] {
  const name = companyName.toLowerCase()
  const variations: string[] = [name]

  // Remove common suffixes
  const withoutSuffix = name
    .replace(/\.(ai|io|co|com|org|net|app|dev|tech)$/i, '')
    .replace(/,?\s*(inc|llc|ltd|corp|corporation|company)\.?$/i, '')
    .trim()
  if (withoutSuffix !== name) {
    variations.push(withoutSuffix)
  }

  // No spaces version
  const noSpaces = name.replace(/\s+/g, '')
  if (noSpaces !== name) {
    variations.push(noSpaces)
  }

  // Hyphenated version
  const hyphenated = name.replace(/\s+/g, '-')
  if (hyphenated !== name) {
    variations.push(hyphenated)
  }

  return [...new Set(variations)]
}

/**
 * Check if URL likely belongs to the company
 */
function urlBelongsToCompany(
  url: string,
  title: string,
  snippet: string,
  companyNameVariations: string[],
  companyDomain: string | null
): { belongs: boolean; confidence: number } {
  const urlLower = url.toLowerCase()
  const titleLower = title.toLowerCase()

  // Check if it's the company's own domain (highest confidence)
  if (companyDomain) {
    const domainLower = companyDomain.toLowerCase()
    if (urlLower.includes(domainLower)) {
      return { belongs: true, confidence: 0.95 }
    }
  }

  // Check if company name appears in the URL path (not just query params)
  const urlPath = urlLower.split('?')[0]
  for (const variation of companyNameVariations) {
    if (variation.length >= 3 && urlPath.includes(variation)) {
      return { belongs: true, confidence: 0.7 }
    }
  }

  // Check if company name is prominently in the title
  for (const variation of companyNameVariations) {
    if (variation.length >= 3 && titleLower.includes(variation)) {
      return { belongs: true, confidence: 0.6 }
    }
  }

  return { belongs: false, confidence: 0 }
}

/**
 * Extract company URLs from search results using pattern matching
 * This is a lightweight extraction that doesn't need an LLM call
 */
export function extractUrlsFromSearchResults(
  searchResults: GoogleSearchResult[],
  companyName: string,
  companyDomain?: string | null
): ExtractedUrls {
  const result: ExtractedUrls = {
    careersPageUrl: null,
    culturePageUrl: null,
    glassdoorUrl: null,
    crunchbaseUrl: null,
    foundedYear: null,
    alternatives: {
      careers: [],
      culture: [],
      reviews: []
    },
    confidence: {
      careers: 0,
      culture: 0,
      glassdoor: 0,
      crunchbase: 0
    }
  }

  const companyNameVariations = getCompanyNameVariations(companyName)
  const domainToUse = companyDomain || null

  for (const r of searchResults) {
    const url = r.link.toLowerCase()
    const title = r.title.toLowerCase()
    const snippet = r.snippet.toLowerCase()

    // Skip search engine URLs entirely - these should NEVER be stored
    if (isSearchEngineUrl(url)) {
      continue
    }

    // Check if this URL belongs to the company
    const { belongs: urlBelongs, confidence: urlConfidence } = urlBelongsToCompany(
      url, r.title, r.snippet, companyNameVariations, domainToUse
    )

    // Extract Glassdoor URL - must contain company name to be relevant
    if (url.includes('glassdoor.com')) {
      const hasCompanyName = companyNameVariations.some(v => v.length >= 3 && (url.includes(v) || title.includes(v)))
      if (hasCompanyName) {
        if (!result.glassdoorUrl || result.confidence.glassdoor < 0.9) {
          result.glassdoorUrl = r.link
          result.confidence.glassdoor = 0.9
        } else {
          result.alternatives.reviews.push(r.link)
        }
      }
    }

    // Extract Crunchbase URL - must be organization page with company name
    if (url.includes('crunchbase.com/organization')) {
      const hasCompanyName = companyNameVariations.some(v => v.length >= 3 && url.includes(v))
      if (hasCompanyName) {
        if (!result.crunchbaseUrl || result.confidence.crunchbase < 0.9) {
          result.crunchbaseUrl = r.link
          result.confidence.crunchbase = 0.9
        }
      }
    }

    // Check if this is a job board (should NOT be used as careers page)
    const isJobBoard = JOB_BOARD_DOMAINS.some(domain => url.includes(domain))

    // Extract careers page URL - ONLY from company's own domain or verified company pages
    if (!isJobBoard) {
      const careersPatterns = ['/careers', '/jobs', '/join', '/work-with-us', 'careers.', 'jobs.']
      const isCareersPage = careersPatterns.some(p => url.includes(p)) ||
        (title.includes('careers') && urlBelongs) ||
        (title.includes('jobs at') && urlBelongs)

      if (isCareersPage && urlBelongs && urlConfidence >= 0.6) {
        if (!result.careersPageUrl || urlConfidence > result.confidence.careers) {
          result.careersPageUrl = r.link
          result.confidence.careers = urlConfidence
        }
        result.alternatives.careers.push(r.link)
      }
    }

    // Check if this is a generic site (should NOT be used as culture page)
    const isGenericSite = GENERIC_SITES.some(site => url.includes(site))

    // Extract culture page URL - ONLY from company's own domain
    if (!isGenericSite && !isJobBoard) {
      const culturePatterns = ['/about', '/culture', '/values', '/life', '/team', '/company']
      const isCulturePage = culturePatterns.some(p => url.includes(p)) ||
        title.includes('about us') ||
        title.includes('our culture') ||
        title.includes('our values')

      if (isCulturePage && urlBelongs && urlConfidence >= 0.6) {
        if (!result.culturePageUrl || urlConfidence > result.confidence.culture) {
          result.culturePageUrl = r.link
          result.confidence.culture = urlConfidence
        }
        result.alternatives.culture.push(r.link)
      }
    }

    // Extract founded year from snippets (only if snippet mentions company)
    if (!result.foundedYear) {
      const snippetMentionsCompany = companyNameVariations.some(v => v.length >= 3 && snippet.includes(v))
      if (snippetMentionsCompany) {
        const foundedMatch = snippet.match(/founded\s+(?:in\s+)?(\d{4})/i) ||
          snippet.match(/established\s+(?:in\s+)?(\d{4})/i) ||
          snippet.match(/started\s+(?:in\s+)?(\d{4})/i)
        if (foundedMatch) {
          const year = parseInt(foundedMatch[1], 10)
          if (year >= 1800 && year <= new Date().getFullYear()) {
            result.foundedYear = year
          }
        }
      }
    }
  }

  // Remove duplicates from alternatives
  result.alternatives.careers = [...new Set(result.alternatives.careers)]
  result.alternatives.culture = [...new Set(result.alternatives.culture)]
  result.alternatives.reviews = [...new Set(result.alternatives.reviews)]

  // Final safety check - ensure no search engine URLs made it through
  if (result.careersPageUrl && isSearchEngineUrl(result.careersPageUrl)) {
    console.warn(`Blocked search engine URL for careers: ${result.careersPageUrl}`)
    result.careersPageUrl = null
    result.confidence.careers = 0
  }
  if (result.culturePageUrl && isSearchEngineUrl(result.culturePageUrl)) {
    console.warn(`Blocked search engine URL for culture: ${result.culturePageUrl}`)
    result.culturePageUrl = null
    result.confidence.culture = 0
  }
  if (result.glassdoorUrl && isSearchEngineUrl(result.glassdoorUrl)) {
    console.warn(`Blocked search engine URL for glassdoor: ${result.glassdoorUrl}`)
    result.glassdoorUrl = null
    result.confidence.glassdoor = 0
  }
  if (result.crunchbaseUrl && isSearchEngineUrl(result.crunchbaseUrl)) {
    console.warn(`Blocked search engine URL for crunchbase: ${result.crunchbaseUrl}`)
    result.crunchbaseUrl = null
    result.confidence.crunchbase = 0
  }

  // Filter alternatives as well
  result.alternatives.careers = result.alternatives.careers.filter(url => !isSearchEngineUrl(url))
  result.alternatives.culture = result.alternatives.culture.filter(url => !isSearchEngineUrl(url))
  result.alternatives.reviews = result.alternatives.reviews.filter(url => !isSearchEngineUrl(url))

  return result
}

/**
 * Safely get URL if not a search engine URL
 */
function safeUrl(url: string | null): string | null {
  return url && !isSearchEngineUrl(url) ? url : null
}

/**
 * Merge multiple ExtractedUrls results, preferring higher confidence values
 */
export function mergeExtractedUrls(existing: ExtractedUrls | null, incoming: ExtractedUrls): ExtractedUrls {
  if (!existing) return incoming

  // Helper to pick best URL while filtering search engine URLs
  const pickBestUrl = (
    existingUrl: string | null,
    incomingUrl: string | null,
    existingConf: number,
    incomingConf: number
  ): string | null => {
    const safeExisting = safeUrl(existingUrl)
    const safeIncoming = safeUrl(incomingUrl)
    if (incomingConf > existingConf && safeIncoming) return safeIncoming
    return safeExisting || safeIncoming
  }

  return {
    careersPageUrl: pickBestUrl(
      existing.careersPageUrl, incoming.careersPageUrl,
      existing.confidence.careers, incoming.confidence.careers
    ),
    culturePageUrl: pickBestUrl(
      existing.culturePageUrl, incoming.culturePageUrl,
      existing.confidence.culture, incoming.confidence.culture
    ),
    glassdoorUrl: pickBestUrl(
      existing.glassdoorUrl, incoming.glassdoorUrl,
      existing.confidence.glassdoor, incoming.confidence.glassdoor
    ),
    crunchbaseUrl: pickBestUrl(
      existing.crunchbaseUrl, incoming.crunchbaseUrl,
      existing.confidence.crunchbase, incoming.confidence.crunchbase
    ),
    foundedYear: existing.foundedYear || incoming.foundedYear,
    alternatives: {
      careers: [...new Set([...existing.alternatives.careers, ...incoming.alternatives.careers])].filter(u => !isSearchEngineUrl(u)),
      culture: [...new Set([...existing.alternatives.culture, ...incoming.alternatives.culture])].filter(u => !isSearchEngineUrl(u)),
      reviews: [...new Set([...existing.alternatives.reviews, ...incoming.alternatives.reviews])].filter(u => !isSearchEngineUrl(u))
    },
    confidence: {
      careers: Math.max(existing.confidence.careers, incoming.confidence.careers),
      culture: Math.max(existing.confidence.culture, incoming.confidence.culture),
      glassdoor: Math.max(existing.confidence.glassdoor, incoming.confidence.glassdoor),
      crunchbase: Math.max(existing.confidence.crunchbase, incoming.confidence.crunchbase)
    }
  }
}

// Schema for URL discovery response
const urlDiscoverySchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    careersPageUrl: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'The direct URL to the company careers or jobs page (NOT a job board, must be company-owned)'
    },
    culturePageUrl: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'The direct URL to the company about/culture/values page'
    },
    glassdoorUrl: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'The Glassdoor company reviews page URL'
    },
    crunchbaseUrl: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'The Crunchbase company profile URL'
    },
    foundedYear: {
      type: SchemaType.INTEGER,
      nullable: true,
      description: 'The year the company was founded'
    },
    reasoning: {
      type: SchemaType.STRING,
      description: 'Brief explanation of URL selection'
    }
  },
  required: ['reasoning']
}

/**
 * Discover company URLs through targeted searches and LLM analysis
 * This performs dedicated searches to find careers pages, culture pages, etc.
 */
export const discoverCompanyUrls = traceable(async function discoverCompanyUrls(
  companyName: string,
  companyDomain?: string | null,
  websiteUrl?: string | null
): Promise<ExtractedUrls> {
  const result: ExtractedUrls = {
    careersPageUrl: null,
    culturePageUrl: null,
    glassdoorUrl: null,
    crunchbaseUrl: null,
    foundedYear: null,
    alternatives: {
      careers: [],
      culture: [],
      reviews: []
    },
    confidence: {
      careers: 0,
      culture: 0,
      glassdoor: 0,
      crunchbase: 0
    }
  }

  // Build targeted search queries
  const queries: string[] = []

  // Careers page queries
  if (companyDomain) {
    queries.push(`site:${companyDomain} careers OR jobs`)
  }
  queries.push(`"${companyName}" careers page official`)

  // Glassdoor queries - multiple variations for better matching
  queries.push(`"${companyName}" site:glassdoor.com reviews`)
  queries.push(`${companyName} company reviews site:glassdoor.com`)

  // Crunchbase queries - multiple variations for better matching
  queries.push(`"${companyName}" site:crunchbase.com`)
  queries.push(`${companyName} funding site:crunchbase.com/organization`)

  // Culture/about page queries - with fallback for when domain is unknown
  if (companyDomain) {
    queries.push(`site:${companyDomain} about OR culture OR values OR team`)
  }
  queries.push(`"${companyName}" about us company culture`)
  queries.push(`"${companyName}" official website about`)

  try {
    // Execute searches in parallel (no date restriction for these)
    const searchPromises = queries.map(q =>
      searchGoogle(q, '').catch(() => []) // Empty string = no date restriction
    )
    const searchResults = await Promise.all(searchPromises)
    const allResults = searchResults.flat()

    if (allResults.length === 0) {
      console.log(`No search results found for ${companyName} URL discovery`)
      return result
    }

    // Filter out search engine URLs
    const validResults = allResults.filter(r => !isSearchEngineUrl(r.link))

    if (validResults.length === 0) {
      console.log(`All results filtered out for ${companyName} URL discovery`)
      return result
    }

    // Format results for LLM analysis
    const resultsText = validResults.slice(0, 20).map((r, i) =>
      `[${i + 1}] URL: ${r.link}\n    Title: ${r.title}\n    Snippet: ${r.snippet}`
    ).join('\n\n')

    // Use LLM to analyze and pick best URLs
    const client = getGeminiClient()
    const model = client.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: urlDiscoverySchema
      }
    })

    const domainInfo = companyDomain ? `Company domain: ${companyDomain}` : ''
    const websiteInfo = websiteUrl ? `Company website: ${websiteUrl}` : ''

    const prompt = `Analyze these search results to find official URLs for "${companyName}".
${domainInfo}
${websiteInfo}

IMPORTANT RULES:
1. For careersPageUrl: ONLY select URLs that are the company's OWN careers/jobs page (e.g., company.com/careers, careers.company.com)
   - NEVER select job board URLs (LinkedIn, Indeed, Glassdoor jobs, Lever, Greenhouse, YCombinator, etc.)
   - The URL must be owned/controlled by the company itself
   - If no company-owned careers page is found, return null

2. For culturePageUrl: Select the company's about/culture/values/team page
   - Must be on the company's own domain
   - If no company-owned culture page is found, return null

3. For glassdoorUrl: Select the Glassdoor company overview/reviews page
   - Must be a glassdoor.com URL
   - Must be for THIS specific company, not a similarly named one

4. For crunchbaseUrl: Select the Crunchbase company profile
   - Must be a crunchbase.com/organization URL
   - Must be for THIS specific company

5. Extract foundedYear if mentioned in any snippet

Search Results:
${resultsText}

Return the best matching URLs for each category. Return null for any category where no valid URL is found.`

    const llmResult = await model.generateContent(prompt)
    const text = llmResult.response.text()
    const parsed = JSON.parse(text)

    // Validate and assign URLs (with additional safety checks)
    if (parsed.careersPageUrl && !isSearchEngineUrl(parsed.careersPageUrl)) {
      // Additional check: ensure it's not a job board
      const isJobBoard = JOB_BOARD_DOMAINS.some(domain =>
        parsed.careersPageUrl.toLowerCase().includes(domain)
      )
      if (!isJobBoard) {
        result.careersPageUrl = parsed.careersPageUrl
        result.confidence.careers = 0.85
      }
    }

    if (parsed.culturePageUrl && !isSearchEngineUrl(parsed.culturePageUrl)) {
      const isGeneric = GENERIC_SITES.some(site =>
        parsed.culturePageUrl.toLowerCase().includes(site)
      )
      if (!isGeneric) {
        result.culturePageUrl = parsed.culturePageUrl
        result.confidence.culture = 0.85
      }
    }

    if (parsed.glassdoorUrl && parsed.glassdoorUrl.includes('glassdoor.com')) {
      result.glassdoorUrl = parsed.glassdoorUrl
      result.confidence.glassdoor = 0.9
    }

    if (parsed.crunchbaseUrl && parsed.crunchbaseUrl.includes('crunchbase.com')) {
      result.crunchbaseUrl = parsed.crunchbaseUrl
      result.confidence.crunchbase = 0.9
    }

    if (parsed.foundedYear && typeof parsed.foundedYear === 'number') {
      const year = parsed.foundedYear
      if (year >= 1800 && year <= new Date().getFullYear()) {
        result.foundedYear = year
      }
    }

    console.log(`URL discovery for ${companyName}: careers=${result.careersPageUrl ? 'found' : 'null'}, culture=${result.culturePageUrl ? 'found' : 'null'}, glassdoor=${result.glassdoorUrl ? 'found' : 'null'}`)

    return result
  } catch (error) {
    console.error(`URL discovery error for ${companyName}:`, error)
    return result
  }
}, { name: 'discoverCompanyUrls', run_type: 'llm' })
