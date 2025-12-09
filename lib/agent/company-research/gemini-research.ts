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
    model: 'gemini-2.0-flash',
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
    model: 'gemini-2.0-flash',
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
    model: 'gemini-2.0-flash',
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
