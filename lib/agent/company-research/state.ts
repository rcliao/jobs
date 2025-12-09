import { Annotation } from '@langchain/langgraph'
import { BaseMessage } from '@langchain/core/messages'
import type { SignalCategory, ContactType } from '@/types'

// Iteration tracking for each signal category
export interface SignalIterationState {
  category: SignalCategory
  iteration: number
  maxIterations: number
  queriesExecuted: string[]
  signalsFound: number
  needsMoreResearch: boolean
}

// Contact search iteration state
export interface ContactIterationState {
  iteration: number
  maxIterations: number
  contactsFound: number
}

// Collected signal during research
export interface CollectedSignal {
  id: string
  category: SignalCategory
  content: string
  source: string
  sourceUrl: string | null
  confidence: number
  rawSnippet: string | null
  publishedAt: string | null  // ISO date string of when the source was published
}

// Discovered contact during research
export interface DiscoveredContact {
  id: string
  name: string
  title: string
  linkedinUrl: string | null
  email: string | null
  contactType: ContactType
  relevanceScore: number
  source: string
}

// Research phase type
export type ResearchPhase = 'init' | 'signals' | 'contacts' | 'synthesis' | 'complete' | 'error'

// Default signal iterations
export function getDefaultSignalIterations(): Record<SignalCategory, SignalIterationState> {
  return {
    growth_funding: {
      category: 'growth_funding',
      iteration: 0,
      maxIterations: 3,
      queriesExecuted: [],
      signalsFound: 0,
      needsMoreResearch: true
    },
    culture_work_style: {
      category: 'culture_work_style',
      iteration: 0,
      maxIterations: 3,
      queriesExecuted: [],
      signalsFound: 0,
      needsMoreResearch: true
    },
    tech_stack_engineering: {
      category: 'tech_stack_engineering',
      iteration: 0,
      maxIterations: 3,
      queriesExecuted: [],
      signalsFound: 0,
      needsMoreResearch: true
    },
    leadership_changes: {
      category: 'leadership_changes',
      iteration: 0,
      maxIterations: 2,
      queriesExecuted: [],
      signalsFound: 0,
      needsMoreResearch: true
    },
    job_openings: {
      category: 'job_openings',
      iteration: 0,
      maxIterations: 2,
      queriesExecuted: [],
      signalsFound: 0,
      needsMoreResearch: true
    }
  }
}

// Default contact iteration
export function getDefaultContactIteration(): ContactIterationState {
  return {
    iteration: 0,
    maxIterations: 4, // Increased to allow more query variety (11 templates)
    contactsFound: 0
  }
}

// Company Research State using LangGraph Annotation
export const CompanyResearchState = Annotation.Root({
  // Message history for the research session
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),

  // The company being researched
  companyId: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null
  }),

  companyName: Annotation<string>({
    reducer: (_, y) => y ?? '',
    default: () => ''
  }),

  companyDomain: Annotation<string | null>({
    reducer: (_, y) => y,
    default: () => null
  }),

  // Research run tracking
  researchRunId: Annotation<string | null>({
    reducer: (_, y) => y ?? null,
    default: () => null
  }),

  // Current phase of research
  currentPhase: Annotation<ResearchPhase>({
    reducer: (_, y) => y ?? 'init',
    default: () => 'init' as ResearchPhase
  }),

  // Signal category iteration tracking
  signalIterations: Annotation<Record<SignalCategory, SignalIterationState>>({
    reducer: (x, y) => {
      // Merge the iteration states
      const result = { ...x }
      for (const key of Object.keys(y) as SignalCategory[]) {
        if (y[key]) {
          result[key] = y[key]
        }
      }
      return result
    },
    default: getDefaultSignalIterations
  }),

  // Which signal category is currently being researched
  currentSignalCategory: Annotation<SignalCategory | null>({
    reducer: (_, y) => y,
    default: () => null
  }),

  // Collected signals (accumulated across iterations)
  collectedSignals: Annotation<CollectedSignal[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => []
  }),

  // Discovered contacts
  discoveredContacts: Annotation<DiscoveredContact[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => []
  }),

  // Contact search iteration
  contactIteration: Annotation<ContactIterationState>({
    reducer: (_, y) => y ?? getDefaultContactIteration(),
    default: getDefaultContactIteration
  }),

  // Final synthesized research report
  researchSummary: Annotation<string | null>({
    reducer: (_, y) => y,
    default: () => null
  }),

  // Overall company score based on research
  companyScore: Annotation<number | null>({
    reducer: (_, y) => y,
    default: () => null
  }),

  // Error tracking
  errors: Annotation<string[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => []
  }),

  // Rate limiting tracking
  apiCallsThisRun: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0
  })
})

export type CompanyResearchStateType = typeof CompanyResearchState.State
