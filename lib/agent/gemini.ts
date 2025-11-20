// Gemini AI integration for query generation and job scoring
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Profile, AgentConfig } from '@/types'

let genAI: GoogleGenerativeAI | null = null

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      throw new Error('Missing GOOGLE_API_KEY in .env.local')
    }

    genAI = new GoogleGenerativeAI(apiKey)
  }

  return genAI
}

export async function generateSearchQueries(
  profile: Profile,
  agentConfig: AgentConfig
): Promise<string[]> {
  console.log('Generating search queries with Gemini AI...')

  const client = getGeminiClient()
  const model = client.getGenerativeModel({ model: 'gemini-flash-latest' })

  // Replace {{profile}} placeholder in system prompt
  const profileJson = JSON.stringify(profile, null, 2)
  const systemPrompt = agentConfig.systemPrompt.replace('{{profile}}', profileJson)

  const includedSitesStr = profile.includedSites.length > 0
    ? `\nINCLUDED SITES (prioritize these): ${profile.includedSites.join(', ')}`
    : ''

  const excludedSitesStr = profile.excludedSites.length > 0
    ? `\nEXCLUDED SITES (do not include): ${profile.excludedSites.join(', ')}`
    : ''

  const prompt = `${systemPrompt}
${includedSitesStr}${excludedSitesStr}

TASK: Generate 5-7 Google Custom Search queries to find job postings for this candidate.

Remember to return ONLY a JSON array of query strings, nothing else.
Example: ["query 1", "query 2", "query 3"]`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    console.log('Raw Gemini response for queries:', text)

    // Try to extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Could not parse queries from Gemini response')
    }

    const queries: string[] = JSON.parse(jsonMatch[0])

    console.log(`Generated ${queries.length} search queries`)
    return queries
  } catch (error) {
    console.error('Error generating queries:', error)
    throw new Error(`Failed to generate search queries: ${error}`)
  }
}

export interface JobScore {
  score: number
  reasoning: string
}

export async function scoreJob(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  jobLocation: string,
  profile: Profile,
  agentConfig: AgentConfig
): Promise<JobScore> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({ model: 'gemini-flash-latest' })

  // Replace {{profile}} placeholder in system prompt
  const profileJson = JSON.stringify(profile, null, 2)
  const systemPrompt = agentConfig.systemPrompt.replace('{{profile}}', profileJson)

  const prompt = `${systemPrompt}

TASK: Score this job posting from 1-10 based on how well it matches the candidate's profile.

JOB POSTING:
Title: ${jobTitle}
Company: ${jobCompany}
Location: ${jobLocation}
Description: ${jobDescription.slice(0, 1000)}

Remember to return ONLY a JSON object with this format:
{"score": 8, "reasoning": "Your explanation here"}`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Try to extract JSON object from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('Could not parse score, defaulting to 5:', text)
      return {
        score: 5,
        reasoning: 'Failed to parse LLM response'
      }
    }

    const scoreData: JobScore = JSON.parse(jsonMatch[0])

    // Validate score is in range
    if (scoreData.score < 1 || scoreData.score > 10) {
      scoreData.score = Math.max(1, Math.min(10, scoreData.score))
    }

    return scoreData
  } catch (error) {
    console.error('Error scoring job:', error)
    return {
      score: 5,
      reasoning: 'Error during scoring'
    }
  }
}

export async function batchScoreJobs(
  jobs: Array<{
    title: string
    company: string
    description: string
    location: string
  }>,
  profile: Profile,
  agentConfig: AgentConfig
): Promise<JobScore[]> {
  console.log(`Scoring ${jobs.length} jobs with Gemini AI...`)

  // Score jobs in parallel (with some throttling to avoid rate limits)
  const chunkSize = 5 // Process 5 at a time
  const scores: JobScore[] = []

  for (let i = 0; i < jobs.length; i += chunkSize) {
    const chunk = jobs.slice(i, i + chunkSize)
    const chunkScores = await Promise.all(
      chunk.map(job =>
        scoreJob(
          job.title,
          job.company,
          job.description,
          job.location,
          profile,
          agentConfig
        )
      )
    )
    scores.push(...chunkScores)
    console.log(`Scored ${Math.min(i + chunkSize, jobs.length)}/${jobs.length} jobs`)
  }

  return scores
}
