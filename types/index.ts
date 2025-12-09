// Shared TypeScript type definitions for the Job Search Automation system

// Profile: Job search criteria
export interface Profile {
  id: string
  targetRole: string
  seniority: string[]
  technicalSkills: {
    primary: string[]
    secondary: string[]
  }
  company: {
    stage: string[]
    industry: string[]
    sizeRange: string
  }
  location: {
    preferences: string[]
    remoteOk: boolean
  }
  compensation: {
    minimum: number
    target: number
  }
  avoid: string[]
  mustHave: string[]
  includedSites: string[]
  excludedSites: string[]
  createdAt: Date
  updatedAt: Date
}

// Agent Config: LLM system prompts and search strategy
export interface AgentConfig {
  id: string
  systemPrompt: string
  searchPatterns?: string[]
  version: string
  createdAt: Date
  updatedAt: Date
}

// Job: Discovered job leads with scores
export interface Job {
  id: string
  title: string
  company: string
  description: string
  url: string
  source: string
  location: string | null
  remote: boolean
  postedDate: Date | null
  score: number
  matchReasoning: string
  status: 'new' | 'saved' | 'applied' | 'dismissed'
  notes: string | null
  foundAt: Date
  searchId: string
  createdAt: Date
  updatedAt: Date
}

// Search Run: Tracks search execution
export interface SearchRun {
  id: string
  executedAt: Date
  queries: string[]
  resultsCount: number
  status: 'running' | 'complete' | 'failed'
  errorMessage: string | null
  createdAt: Date
}

// Database row types (with JSON fields as strings)
export interface ProfileRow {
  id: string
  target_role: string
  seniority: string // JSON
  technical_skills: string // JSON
  company: string // JSON
  location: string // JSON
  compensation: string // JSON
  avoid: string // JSON
  must_have: string // JSON
  included_sites: string // JSON
  excluded_sites: string // JSON
  created_at: number // Unix timestamp
  updated_at: number // Unix timestamp
}

export interface AgentConfigRow {
  id: string
  system_prompt: string
  search_patterns: string | null // JSON
  version: string
  created_at: number
  updated_at: number
}

export interface JobRow {
  id: string
  title: string
  company: string
  description: string
  url: string
  source: string
  location: string | null
  remote: number // 0 or 1
  posted_date: number | null // Unix timestamp
  score: number
  match_reasoning: string
  status: string
  notes: string | null
  found_at: number // Unix timestamp
  search_id: string
  created_at: number
  updated_at: number
}

export interface SearchRunRow {
  id: string
  executed_at: number
  queries: string // JSON
  results_count: number
  status: string
  error_message: string | null
  created_at: number
}

// ============================================
// Company Research Types
// ============================================

export type SignalCategory =
  | 'growth_funding'
  | 'culture_work_style'
  | 'tech_stack_engineering'
  | 'leadership_changes'
  | 'job_openings'

export type ContactType =
  | 'founder'        // CEO, Co-founder, Founder
  | 'executive'      // CTO, VP, C-suite
  | 'director'       // Director of Engineering, Director of Product
  | 'manager'        // Engineering Manager, Product Manager
  | 'team_lead'      // Tech Lead, Staff Engineer
  | 'hiring_manager' // Explicitly hiring-focused manager
  | 'recruiter'      // Recruiter, Talent Acquisition

export type ResearchAgentType = 'orchestrator' | 'signal_worker' | 'contact_worker' | 'synthesizer'

// Company entity
export interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  sizeEstimate: string | null
  headquarters: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  overallScore: number | null
  researchStatus: 'pending' | 'running' | 'researched' | 'failed'
  lastResearchedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CompanyRow {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size_estimate: string | null
  headquarters: string | null
  linkedin_url: string | null
  website_url: string | null
  overall_score: number | null
  research_status: string
  last_researched_at: number | null
  created_at: number
  updated_at: number
}

// Company research run
export interface CompanyResearchRun {
  id: string
  companyId: string
  startedAt: Date
  completedAt: Date | null
  status: 'running' | 'complete' | 'failed'
  summary: string | null
  signalsFound: number
  contactsFound: number
  apiCallsMade: number
  errorMessage: string | null
  createdAt: Date
}

export interface CompanyResearchRunRow {
  id: string
  company_id: string
  started_at: number
  completed_at: number | null
  status: string
  summary: string | null
  signals_found: number
  contacts_found: number
  api_calls_made: number
  error_message: string | null
  created_at: number
}

// Company signal
export interface CompanySignal {
  id: string
  companyId: string
  researchRunId: string
  category: SignalCategory
  content: string
  source: string
  sourceUrl: string | null
  confidence: number
  signalDate: Date | null
  rawSnippet: string | null
  createdAt: Date
}

export interface CompanySignalRow {
  id: string
  company_id: string
  research_run_id: string
  category: string
  content: string
  source: string
  source_url: string | null
  confidence: number
  signal_date: number | null
  raw_snippet: string | null
  created_at: number
}

// Contact
export interface Contact {
  id: string
  companyId: string
  researchRunId: string
  name: string
  title: string
  contactType: ContactType
  linkedinUrl: string | null
  email: string | null
  source: string
  relevanceScore: number | null
  notes: string | null
  outreachStatus: 'not_contacted' | 'contacted' | 'responded' | 'rejected'
  lastContactedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ContactRow {
  id: string
  company_id: string
  research_run_id: string
  name: string
  title: string
  contact_type: string
  linkedin_url: string | null
  email: string | null
  source: string
  relevance_score: number | null
  notes: string | null
  outreach_status: string
  last_contacted_at: number | null
  created_at: number
  updated_at: number
}

// Company-job link
export interface CompanyJobLink {
  companyId: string
  jobId: string
  confidence: number
  createdAt: Date
}

export interface CompanyJobLinkRow {
  company_id: string
  job_id: string
  confidence: number
  created_at: number
}

// Research agent config
export interface ResearchAgentBehaviorConfig {
  // For signal_worker
  maxIterations?: number
  minSignalsRequired?: number
  confidenceThreshold?: number
  signalCategories?: SignalCategory[]
  // For contact_worker
  maxContacts?: number
  contactTypes?: ContactType[]
  // For synthesizer
  summaryMaxLength?: number
  scoringWeights?: Record<SignalCategory, number>
}

export interface ResearchAgentToolsConfig {
  searchSources: ('google_cse' | 'serper' | 'tavily')[]
  enableWebScraping: boolean
  enableLinkedIn: boolean
  customQueryTemplates?: string[]
}

export interface ResearchAgentConfig {
  id: string
  agentType: ResearchAgentType
  systemPrompt: string
  behaviorConfig: ResearchAgentBehaviorConfig
  toolsConfig: ResearchAgentToolsConfig
  enabled: boolean
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface ResearchAgentConfigRow {
  id: string
  agent_type: string
  system_prompt: string
  behavior_config: string // JSON
  tools_config: string // JSON
  enabled: number
  version: string
  created_at: number
  updated_at: number
}

// API request/response types
export interface UpdateProfileRequest {
  targetRole: string
  seniority: string[]
  technicalSkills: {
    primary: string[]
    secondary: string[]
  }
  company: {
    stage: string[]
    industry: string[]
    sizeRange: string
  }
  location: {
    preferences: string[]
    remoteOk: boolean
  }
  compensation: {
    minimum: number
    target: number
  }
  avoid: string[]
  mustHave: string[]
  includedSites: string[]
  excludedSites: string[]
}

export interface UpdateAgentConfigRequest {
  systemPrompt: string
  searchPatterns?: string[]
  version: string
}

export interface UpdateJobRequest {
  status?: 'new' | 'saved' | 'applied' | 'dismissed'
  notes?: string
}

export interface JobListQuery {
  status?: 'new' | 'saved' | 'applied' | 'dismissed'
  minScore?: number
  limit?: number
  offset?: number
}

export interface JobListResponse {
  jobs: Job[]
  total: number
  limit: number
  offset: number
}

export interface SearchResponse {
  searchRunId: string
  status: 'running' | 'complete' | 'failed'
  resultsCount?: number
  queries?: string[]
  message?: string
}

// ============================================
// Company Discovery Types
// ============================================

export type DiscoveryStatus =
  | 'running'
  | 'discovering'
  | 'researching'
  | 'analyzing'
  | 'complete'
  | 'failed'

export type DiscoveryAgentType =
  | 'discovery_orchestrator'
  | 'company_finder'
  | 'company_researcher'
  | 'fit_analyzer'
  | 'discovery_synthesizer'

// Company discovery run - tracks a single discovery execution
export interface CompanyDiscoveryRun {
  id: string
  profileId: string
  startedAt: Date
  completedAt: Date | null
  status: DiscoveryStatus
  searchQueries: string[]
  companiesDiscovered: number
  companiesResearched: number
  errorMessage: string | null
  createdAt: Date
}

export interface CompanyDiscoveryRunRow {
  id: string
  profile_id: string
  started_at: number
  completed_at: number | null
  status: string
  search_queries: string // JSON array
  companies_discovered: number
  companies_researched: number
  error_message: string | null
  created_at: number
}

// Candidate fit analysis - personalized analysis of company-candidate match
export interface CandidateFitAnalysis {
  id: string
  companyId: string
  discoveryRunId: string
  profileId: string
  skillMatchScore: number        // 1-10: how well user skills match company needs
  cultureMatchScore: number      // 1-10: based on culture signals vs user preferences
  careerGrowthScore: number      // 1-10: growth opportunity for user
  locationMatchScore: number     // 1-10: remote/location alignment
  overallFitScore: number        // Weighted average of all scores
  skillsMatchAnalysis: string    // What skills align, which are gaps
  positioningStrategy: string    // How user should position themselves
  prioritizedContacts: string[]  // Contact IDs in priority order for outreach
  outreachTemplate: string | null // Suggested intro message template
  createdAt: Date
}

export interface CandidateFitAnalysisRow {
  id: string
  company_id: string
  discovery_run_id: string
  profile_id: string
  skill_match_score: number
  culture_match_score: number
  career_growth_score: number
  location_match_score: number
  overall_fit_score: number
  skills_match_analysis: string
  positioning_strategy: string
  prioritized_contacts: string  // JSON array of contact IDs
  outreach_template: string | null
  created_at: number
}

// Link discovered companies to discovery runs
export interface DiscoveryCompanyLink {
  discoveryRunId: string
  companyId: string
  discoverySource: string       // Which search query found it
  discoverySnippet: string | null // Original search snippet
  discoveryRank: number         // Order in which it was discovered
  createdAt: Date
}

export interface DiscoveryCompanyLinkRow {
  discovery_run_id: string
  company_id: string
  discovery_source: string
  discovery_snippet: string | null
  discovery_rank: number
  created_at: number
}

// Discovery result for API responses
export interface DiscoveredCompanyResult {
  company: Company
  discoverySource: string
  discoverySnippet: string | null
  researchComplete: boolean
  signals: CompanySignal[]
  contacts: Contact[]
  fitAnalysis: CandidateFitAnalysis | null
}

export interface CompanyDiscoveryResult {
  discoveryRunId: string
  status: DiscoveryStatus
  companiesDiscovered: number
  companiesResearched: number
  rankedCompanies: DiscoveredCompanyResult[]  // Sorted by overall fit score
  summary: string | null
  errors: string[]
}
