import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { traceable } from 'langsmith/traceable'
import type { ExtractedUrls } from './gemini-research'

// Search engine and redirect URLs that should NEVER be stored
const INVALID_URL_PATTERNS = [
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

// Singleton Gemini client
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

// Schema for URL validation response
const urlValidationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    isValid: {
      type: SchemaType.BOOLEAN,
      description: 'Whether this URL is a valid careers/culture page for the specified company'
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: 'Confidence score from 0 to 1'
    },
    reason: {
      type: SchemaType.STRING,
      description: 'Brief explanation of why the URL is valid or invalid'
    },
    suggestedUrl: {
      type: SchemaType.STRING,
      nullable: true,
      description: 'If invalid, a suggested correct URL if one can be inferred'
    }
  },
  required: ['isValid', 'confidence', 'reason']
}

export interface UrlValidationResult {
  isValid: boolean
  confidence: number
  reason: string
  suggestedUrl?: string | null
}

export interface ValidatedUrls {
  careersPageUrl: string | null
  culturePageUrl: string | null
  glassdoorUrl: string | null
  crunchbaseUrl: string | null
  foundedYear: number | null
  validationResults: {
    careers?: UrlValidationResult
    culture?: UrlValidationResult
    glassdoor?: UrlValidationResult
    crunchbase?: UrlValidationResult
  }
}

/**
 * Quick check if URL is obviously invalid (search engines, redirects, etc.)
 */
export function isObviouslyInvalidUrl(url: string | null): boolean {
  if (!url) return true

  const urlLower = url.toLowerCase()

  // Check against known invalid patterns
  for (const pattern of INVALID_URL_PATTERNS) {
    if (urlLower.includes(pattern)) {
      return true
    }
  }

  // Check for obviously malformed URLs
  try {
    const parsed = new URL(url)
    // Reject if no valid hostname
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return true
    }
  } catch {
    return true
  }

  return false
}

/**
 * Validate URL by fetching it and checking response
 */
export async function validateUrlWithFetch(
  url: string,
  companyName: string
): Promise<{ reachable: boolean; title?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BeaconBot/1.0; +https://beacon.app)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal,
      redirect: 'follow'
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { reachable: false, error: `HTTP ${response.status}` }
    }

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { reachable: false, error: 'Not an HTML page' }
    }

    // Get the page content to extract title
    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : undefined

    // Check if final URL is a search engine (after redirects)
    const finalUrl = response.url.toLowerCase()
    if (INVALID_URL_PATTERNS.some(p => finalUrl.includes(p))) {
      return { reachable: false, error: 'Redirected to search engine' }
    }

    return { reachable: true, title }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { reachable: false, error: errorMessage }
  }
}

/**
 * Use LLM to validate if a URL's content matches expectations
 */
export const validateUrlWithLLM = traceable(async function validateUrlWithLLM(
  url: string,
  pageTitle: string | undefined,
  companyName: string,
  expectedType: 'careers' | 'culture' | 'reviews' | 'funding'
): Promise<UrlValidationResult> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: urlValidationSchema
    }
  })

  const typeDescriptions: Record<string, string> = {
    careers: 'careers page, jobs page, or hiring page',
    culture: 'company culture page, about us page, or values page',
    reviews: 'employee reviews page (like Glassdoor)',
    funding: 'company funding/investment profile (like Crunchbase)'
  }

  const prompt = `Analyze if this URL is a valid ${typeDescriptions[expectedType]} for the company "${companyName}".

URL: ${url}
Page Title: ${pageTitle || 'Unknown'}

Determine:
1. Is this URL likely to be the official ${expectedType} page for ${companyName}?
2. Does the URL domain or path suggest it belongs to ${companyName}?
3. Does the page title (if available) suggest this is the right type of page?

Be strict - only mark as valid if you're confident this is actually ${companyName}'s ${expectedType} page, not a different company or a generic page.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    return {
      isValid: Boolean(parsed.isValid),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reason: String(parsed.reason || ''),
      suggestedUrl: parsed.suggestedUrl || null
    }
  } catch (error) {
    console.error('LLM validation error:', error)
    return {
      isValid: false,
      confidence: 0,
      reason: 'Validation failed due to error'
    }
  }
}, { name: 'validateUrlWithLLM', run_type: 'llm' })

/**
 * Validate all extracted URLs before storing
 */
export async function validateExtractedUrls(
  extractedUrls: ExtractedUrls,
  companyName: string,
  options: { useLLM?: boolean; validateReachability?: boolean } = {}
): Promise<ValidatedUrls> {
  const { useLLM = true, validateReachability = true } = options

  const result: ValidatedUrls = {
    careersPageUrl: null,
    culturePageUrl: null,
    glassdoorUrl: null,
    crunchbaseUrl: null,
    foundedYear: extractedUrls.foundedYear,
    validationResults: {}
  }

  // Helper to validate a single URL
  async function validateUrl(
    url: string | null,
    type: 'careers' | 'culture' | 'reviews' | 'funding',
    minConfidence: number = 0.5
  ): Promise<{ validUrl: string | null; validation?: UrlValidationResult }> {
    if (!url || isObviouslyInvalidUrl(url)) {
      return { validUrl: null }
    }

    let pageTitle: string | undefined

    // Check if URL is reachable
    if (validateReachability) {
      const fetchResult = await validateUrlWithFetch(url, companyName)
      if (!fetchResult.reachable) {
        console.log(`URL validation failed for ${url}: ${fetchResult.error}`)
        return {
          validUrl: null,
          validation: {
            isValid: false,
            confidence: 0,
            reason: `URL not reachable: ${fetchResult.error}`
          }
        }
      }
      pageTitle = fetchResult.title
    }

    // Use LLM to validate content relevance
    if (useLLM) {
      const llmResult = await validateUrlWithLLM(url, pageTitle, companyName, type)

      if (llmResult.isValid && llmResult.confidence >= minConfidence) {
        return { validUrl: url, validation: llmResult }
      }

      // If LLM suggests a different URL, we could try to validate that
      // For now, just reject
      return { validUrl: null, validation: llmResult }
    }

    // If not using LLM, accept the URL if it passed basic checks
    return { validUrl: url }
  }

  // Validate each URL type in parallel
  const [careersResult, cultureResult, glassdoorResult, crunchbaseResult] = await Promise.all([
    validateUrl(extractedUrls.careersPageUrl, 'careers', 0.6),
    validateUrl(extractedUrls.culturePageUrl, 'culture', 0.6),
    validateUrl(extractedUrls.glassdoorUrl, 'reviews', 0.7),
    validateUrl(extractedUrls.crunchbaseUrl, 'funding', 0.7)
  ])

  result.careersPageUrl = careersResult.validUrl
  result.culturePageUrl = cultureResult.validUrl
  result.glassdoorUrl = glassdoorResult.validUrl
  result.crunchbaseUrl = crunchbaseResult.validUrl

  if (careersResult.validation) result.validationResults.careers = careersResult.validation
  if (cultureResult.validation) result.validationResults.culture = cultureResult.validation
  if (glassdoorResult.validation) result.validationResults.glassdoor = glassdoorResult.validation
  if (crunchbaseResult.validation) result.validationResults.crunchbase = crunchbaseResult.validation

  return result
}

/**
 * Quick validation without LLM - just checks URL patterns and reachability
 */
export async function quickValidateUrls(
  extractedUrls: ExtractedUrls,
  companyName: string
): Promise<ValidatedUrls> {
  return validateExtractedUrls(extractedUrls, companyName, {
    useLLM: false,
    validateReachability: true
  })
}

/**
 * Full validation with LLM - more accurate but uses API calls
 */
export async function fullValidateUrls(
  extractedUrls: ExtractedUrls,
  companyName: string
): Promise<ValidatedUrls> {
  return validateExtractedUrls(extractedUrls, companyName, {
    useLLM: true,
    validateReachability: true
  })
}
