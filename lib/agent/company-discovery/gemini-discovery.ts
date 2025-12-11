import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { traceable } from 'langsmith/traceable'
import type { GoogleSearchResult } from '@/lib/search/google'
import type { Profile, CompanySignal, Contact } from '@/types'
import type { FitAnalysisResult } from './state'

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

// Extracted company from search results
interface ExtractedCompany {
  name: string
  snippet: string
  sourceUrl: string
}

// Schema for search queries response
const searchQueriesSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.STRING,
    description: 'A Google search query string'
  },
  description: 'Array of 5-8 Google search queries'
}

// Schema for extracted companies response
const extractedCompaniesSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Company name (clean, no Inc, LLC, etc.)'
      },
      snippet: {
        type: SchemaType.STRING,
        description: 'Brief description from search result'
      },
      sourceUrl: {
        type: SchemaType.STRING,
        description: 'URL where company was found'
      }
    },
    required: ['name', 'snippet', 'sourceUrl']
  },
  description: 'Array of extracted companies'
}

// Schema for fit analysis response
const fitAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    criteriaMatchScore: {
      type: SchemaType.INTEGER,
      description: 'Score 1-10 for how well company matches profile criteria (tech stack, skills, industry)'
    },
    cultureMatchScore: {
      type: SchemaType.INTEGER,
      description: 'Score 1-10 for culture and work style alignment'
    },
    opportunityScore: {
      type: SchemaType.INTEGER,
      description: 'Score 1-10 for opportunity potential (growth, timing, fit)'
    },
    locationMatchScore: {
      type: SchemaType.INTEGER,
      description: 'Score 1-10 for location/remote alignment'
    },
    criteriaMatchAnalysis: {
      type: SchemaType.STRING,
      description: 'Analysis of criteria alignment and gaps (2-3 sentences)'
    },
    positioningStrategy: {
      type: SchemaType.STRING,
      description: 'How to approach this company strategically (2-3 sentences)'
    },
    prioritizedContacts: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Contact names in priority order for outreach'
    },
    outreachTemplate: {
      type: SchemaType.STRING,
      description: 'Suggested intro message template for outreach'
    }
  },
  required: [
    'criteriaMatchScore',
    'cultureMatchScore',
    'opportunityScore',
    'locationMatchScore',
    'criteriaMatchAnalysis',
    'positioningStrategy',
    'prioritizedContacts',
    'outreachTemplate'
  ]
}

/**
 * Generate search queries based on user profile
 */
export const generateDiscoveryQueries = traceable(async function generateDiscoveryQueries(
  profile: Profile
): Promise<string[]> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: searchQueriesSchema
    }
  })

  const prompt = `Generate 5-8 specific Google search queries to find companies matching these criteria.

DISCOVERY CRITERIA:
- Focus Area: ${profile.targetRole}
- Primary Technologies: ${profile.technicalSkills.primary.join(', ')}
- Secondary Technologies: ${profile.technicalSkills.secondary.join(', ')}
- Company Stage: ${profile.company.stage.join(', ')}
- Industries: ${profile.company.industry.join(', ')}
- Location Preferences: ${profile.location.preferences.join(', ')} (Remote OK: ${profile.location.remoteOk})
- Exclude Keywords: ${profile.avoid.join(', ')}
- Required Keywords: ${profile.mustHave.join(', ')}

Generate queries that will find:
1. Companies in the target industries that recently raised funding
2. Companies using the specified tech stack
3. Growing companies in the target stage
4. Companies with signals of growth (hiring, funding, expansion)

Query tips:
- Use site: operators for quality sources (techcrunch.com, crunchbase.com, linkedin.com)
- Include year for recency (2024 or 2025)
- Mix funding news, growth signals, and tech stack queries
- Target the specific industries and company stages`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const queries = JSON.parse(text)
    return queries.filter((q: unknown) => typeof q === 'string' && q.length > 0)
  } catch (error) {
    console.error('Query generation error:', error)
    return getDefaultQueries(profile)
  }
}, { name: 'generateDiscoveryQueries', run_type: 'llm' })

/**
 * Fallback queries if Gemini fails
 */
function getDefaultQueries(profile: Profile): string[] {
  const industry = profile.company.industry[0] || 'tech'
  const stage = profile.company.stage[0] || 'startup'
  const skill = profile.technicalSkills.primary[0] || 'software'
  const year = new Date().getFullYear()

  return [
    `site:techcrunch.com "${industry}" "${stage}" funding ${year}`,
    `site:crunchbase.com "${stage}" "${industry}" series`,
    `"${skill}" startup hiring ${year}`,
    `"${industry}" company "raised" "series" ${year}`,
    `"${skill}" "${industry}" company engineering team`
  ]
}

/**
 * Extract company names from search results
 */
export const extractCompaniesFromResults = traceable(async function extractCompaniesFromResults(
  searchResults: GoogleSearchResult[],
  existingCompanies: string[]
): Promise<ExtractedCompany[]> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: extractedCompaniesSchema
    }
  })

  const resultsText = searchResults.map((r, i) =>
    `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
  ).join('\n\n---\n\n')

  const excludeList = existingCompanies.length > 0
    ? `\n\nALREADY DISCOVERED (skip these): ${existingCompanies.join(', ')}`
    : ''

  const prompt = `Extract company names from these search results about startup funding, hiring, or company news.

Search Results:
${resultsText}
${excludeList}

For each NEW company found, extract:
1. name: The company name (clean, no "Inc", "LLC", etc.)
2. snippet: A brief description from the search result
3. sourceUrl: The URL where it was found

Only include:
- Real companies (not job boards, news sites, or tools)
- Companies that appear to be hiring or growing
- Exclude any already-discovered companies listed above

Return empty array if no valid companies found.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)
    return parsed.map((c: Record<string, unknown>) => ({
      name: String(c.name || '').trim(),
      snippet: String(c.snippet || '').trim(),
      sourceUrl: String(c.sourceUrl || '')
    })).filter((c: ExtractedCompany) => c.name.length > 0)
  } catch (error) {
    console.error('Company extraction error:', error)
    return []
  }
}, { name: 'extractCompaniesFromResults', run_type: 'llm' })

/**
 * Generate candidate fit analysis comparing company signals to user profile
 */
export const generateFitAnalysis = traceable(async function generateFitAnalysis(
  companyId: string,
  companyName: string,
  signals: CompanySignal[],
  contacts: Contact[],
  profile: Profile
): Promise<FitAnalysisResult> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: fitAnalysisSchema
    }
  })

  // Format signals by category
  const signalsByCategory: Record<string, CompanySignal[]> = {}
  for (const signal of signals) {
    if (!signalsByCategory[signal.category]) {
      signalsByCategory[signal.category] = []
    }
    signalsByCategory[signal.category].push(signal)
  }

  const signalsText = Object.entries(signalsByCategory)
    .map(([cat, sigs]) => {
      const categoryLabel = cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return `## ${categoryLabel}\n${sigs.map(s => `- ${s.content}`).join('\n')}`
    })
    .join('\n\n') || 'No signals collected.'

  const contactsText = contacts.length > 0
    ? contacts.map(c => `- ${c.name}: ${c.title} (${c.contactType})`).join('\n')
    : 'No contacts discovered.'

  const prompt = `Analyze how well ${companyName} matches the discovery criteria.

DISCOVERY CRITERIA:
- Focus Area: ${profile.targetRole}
- Primary Technologies: ${profile.technicalSkills.primary.join(', ')}
- Secondary Technologies: ${profile.technicalSkills.secondary.join(', ')}
- Preferred Industries: ${profile.company.industry.join(', ')}
- Preferred Company Stage: ${profile.company.stage.join(', ')}
- Location Preferences: ${profile.location.preferences.join(', ')} (Remote OK: ${profile.location.remoteOk})
- Required Keywords: ${profile.mustHave.join(', ')}
- Exclude Keywords: ${profile.avoid.join(', ')}

COMPANY SIGNALS:
${signalsText}

CONTACTS AT COMPANY:
${contactsText}

Provide scores 1-10 for each dimension:
1. criteriaMatchScore: How well does the company match the specified tech stack, industry, and focus area?
2. cultureMatchScore: Based on culture signals, how well does this company align with preferences?
3. opportunityScore: Based on growth signals, timing, and potential - is this a good opportunity?
4. locationMatchScore: Does the company's location/remote policy match preferences?

Also provide:
- criteriaMatchAnalysis: What criteria align well? What gaps exist? (2-3 sentences)
- positioningStrategy: How should one approach this company strategically? (2-3 sentences)
- prioritizedContacts: List contact names in order of who to reach out to first
- outreachTemplate: A 2-3 sentence intro message template for outreach`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    // Calculate overall score (weighted average)
    const criteriaMatch = Math.min(10, Math.max(1, Number(parsed.criteriaMatchScore) || 5))
    const cultureMatch = Math.min(10, Math.max(1, Number(parsed.cultureMatchScore) || 5))
    const opportunity = Math.min(10, Math.max(1, Number(parsed.opportunityScore) || 5))
    const locationMatch = Math.min(10, Math.max(1, Number(parsed.locationMatchScore) || 5))

    // Weighted: criteria 30%, culture 25%, opportunity 25%, location 20%
    const overallFitScore = Math.round(
      criteriaMatch * 0.30 +
      cultureMatch * 0.25 +
      opportunity * 0.25 +
      locationMatch * 0.20
    )

    // Map contact names to IDs
    const contactNameToId = new Map(contacts.map(c => [c.name, c.id]))
    const prioritizedContacts = Array.isArray(parsed.prioritizedContacts)
      ? parsed.prioritizedContacts
          .map((name: string) => contactNameToId.get(name))
          .filter((id: string | undefined) => id !== undefined) as string[]
      : []

    return {
      companyId,
      companyName,
      criteriaMatchScore: criteriaMatch,
      cultureMatchScore: cultureMatch,
      opportunityScore: opportunity,
      locationMatchScore: locationMatch,
      overallFitScore,
      criteriaMatchAnalysis: String(parsed.criteriaMatchAnalysis || ''),
      positioningStrategy: String(parsed.positioningStrategy || ''),
      prioritizedContacts,
      outreachTemplate: parsed.outreachTemplate ? String(parsed.outreachTemplate) : null
    }
  } catch (error) {
    console.error('Fit analysis error:', error)
    return getDefaultFitAnalysis(companyId, companyName, contacts)
  }
}, { name: 'generateFitAnalysis', run_type: 'llm' })

/**
 * Fallback fit analysis
 */
function getDefaultFitAnalysis(
  companyId: string,
  companyName: string,
  contacts: Contact[]
): FitAnalysisResult {
  return {
    companyId,
    companyName,
    criteriaMatchScore: 5,
    cultureMatchScore: 5,
    opportunityScore: 5,
    locationMatchScore: 5,
    overallFitScore: 5,
    criteriaMatchAnalysis: 'Unable to analyze criteria match. Review company signals manually.',
    positioningStrategy: 'Research the company further to develop a strategy.',
    prioritizedContacts: contacts.slice(0, 3).map(c => c.id),
    outreachTemplate: null
  }
}

/**
 * Generate discovery summary
 */
export const generateDiscoverySummary = traceable(async function generateDiscoverySummary(
  discoveredCount: number,
  researchedCount: number,
  fitAnalyses: FitAnalysisResult[]
): Promise<string> {
  const client = getGeminiClient()
  // For plain text summary, we don't need structured output
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const topCompanies = fitAnalyses
    .sort((a, b) => b.overallFitScore - a.overallFitScore)
    .slice(0, 5)

  const companySummaries = topCompanies.map((fa, i) =>
    `${i + 1}. ${fa.companyName} (Score: ${fa.overallFitScore}/10) - ${fa.positioningStrategy.split('.')[0]}.`
  ).join('\n')

  const prompt = `Summarize this company discovery session in 2-3 paragraphs.

Stats:
- Companies discovered: ${discoveredCount}
- Companies researched: ${researchedCount}
- Fit analyses completed: ${fitAnalyses.length}

Top Matches:
${companySummaries || 'No companies analyzed yet.'}

Write a brief executive summary covering:
1. Overview of the discovery results
2. Top recommendations and why they stand out
3. Suggested next steps for outreach

Keep it concise and actionable. Return plain text (no JSON, no markdown headers).`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Summary generation error:', error)
    return `Discovered ${discoveredCount} companies, researched ${researchedCount}, analyzed ${fitAnalyses.length}. Review the ranked results to identify top opportunities.`
  }
}, { name: 'generateDiscoverySummary', run_type: 'llm' })
