import { Annotation } from '@langchain/langgraph'
import { BaseMessage } from '@langchain/core/messages'
import type { Profile } from '@/types'

// Discovery phase type
export type DiscoveryPhase =
  | 'init'
  | 'generating_queries'
  | 'discovering'
  | 'researching'
  | 'analyzing'
  | 'synthesizing'
  | 'complete'
  | 'error'

// A discovered company before research
export interface DiscoveredCompany {
  name: string
  snippet: string
  source: string
  sourceUrl: string
  rank: number
  companyId?: string  // Set after company is created in DB
  researchComplete: boolean
  researchFailed: boolean
}

// Fit analysis result (subset for state before DB save)
export interface FitAnalysisResult {
  companyId: string
  companyName: string
  criteriaMatchScore: number
  cultureMatchScore: number
  opportunityScore: number
  locationMatchScore: number
  overallFitScore: number
  criteriaMatchAnalysis: string
  positioningStrategy: string
  prioritizedContacts: string[]
  outreachTemplate: string | null
}

// Company Discovery State using LangGraph Annotation
export const CompanyDiscoveryState = Annotation.Root({
  // Message history for the discovery session
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),

  // Discovery run tracking
  discoveryRunId: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null
  }),

  // User profile for matching
  profile: Annotation<Profile | null>({
    reducer: (_, y) => y ?? null,
    default: () => null
  }),

  profileId: Annotation<string>({
    reducer: (_, y) => y ?? 'default',
    default: () => 'default'
  }),

  // Current phase of discovery
  currentPhase: Annotation<DiscoveryPhase>({
    reducer: (_, y) => y ?? 'init',
    default: () => 'init' as DiscoveryPhase
  }),

  // Generated search queries based on profile
  searchQueries: Annotation<string[]>({
    reducer: (_, y) => y ?? [],
    default: () => []
  }),

  // Query execution tracking
  queriesExecuted: Annotation<number>({
    reducer: (_, y) => y ?? 0,
    default: () => 0
  }),

  // Discovered companies (accumulated)
  discoveredCompanies: Annotation<DiscoveredCompany[]>({
    reducer: (x, y) => {
      // Deduplicate by company name (case insensitive), but allow updates
      const existing = new Map(x.map(c => [c.name.toLowerCase(), c]))
      for (const company of y) {
        const key = company.name.toLowerCase()
        // Always update - this allows researchComplete/researchFailed to be set
        existing.set(key, company)
      }
      return Array.from(existing.values())
    },
    default: () => []
  }),

  // Max companies to discover
  maxCompanies: Annotation<number>({
    reducer: (_, y) => y ?? 10,
    default: () => 10
  }),

  // Research tracking
  companiesResearched: Annotation<number>({
    reducer: (_, y) => y ?? 0,
    default: () => 0
  }),

  // Parallel research batch size
  researchBatchSize: Annotation<number>({
    reducer: (_, y) => y ?? 3,
    default: () => 3
  }),

  // Current batch being researched
  currentResearchBatch: Annotation<string[]>({
    reducer: (_, y) => y ?? [],
    default: () => []
  }),

  // Fit analyses (accumulated)
  fitAnalyses: Annotation<FitAnalysisResult[]>({
    reducer: (x, y) => {
      // Deduplicate by companyId
      const existing = new Map(x.map(f => [f.companyId, f]))
      for (const analysis of y) {
        existing.set(analysis.companyId, analysis)
      }
      return Array.from(existing.values())
    },
    default: () => []
  }),

  // Final summary
  discoverySummary: Annotation<string | null>({
    reducer: (_, y) => y,
    default: () => null
  }),

  // Error tracking
  errors: Annotation<string[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => []
  }),

  // API call tracking for rate limiting
  apiCallsThisRun: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0
  })
})

export type CompanyDiscoveryStateType = typeof CompanyDiscoveryState.State
