// Shared TypeScript type definitions for Beacon - Company Intelligence

// Profile: Discovery criteria for finding and scoring companies
export interface Profile {
  id: string
  targetRole: string  // Focus area (kept for DB compatibility)
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
  avoid: string[]
  mustHave: string[]
  includedSites: string[]
  excludedSites: string[]
  createdAt: Date
  updatedAt: Date
}

// Database row types (with JSON fields as strings)
export interface ProfileRow {
  id: string
  target_role: string
  seniority?: string // JSON (deprecated, kept for backward compatibility)
  technical_skills: string // JSON
  company: string // JSON
  location: string // JSON
  compensation?: string // JSON (deprecated, kept for backward compatibility)
  avoid: string // JSON
  must_have: string // JSON
  included_sites: string // JSON
  excluded_sites: string // JSON
  created_at: number // Unix timestamp
  updated_at: number // Unix timestamp
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

// Extracted URLs metadata from research
export interface ExtractedUrlsMetadata {
  lastExtractedAt: string
  alternativeUrls: {
    careers: string[]
    culture: string[]
    reviews: string[]
  }
  extractionConfidence: {
    careers: number
    culture: number
    glassdoor: number
    crunchbase: number
  }
}

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
  careersPageUrl: string | null
  culturePageUrl: string | null
  glassdoorUrl: string | null
  crunchbaseUrl: string | null
  foundedYear: number | null
  extractedUrlsMetadata: ExtractedUrlsMetadata | null
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
  careers_page_url: string | null
  culture_page_url: string | null
  glassdoor_url: string | null
  crunchbase_url: string | null
  founded_year: number | null
  extracted_urls_metadata: string | null  // JSON string
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
  avoid: string[]
  mustHave: string[]
  includedSites: string[]
  excludedSites: string[]
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

// Company fit analysis - analysis of how well a company matches profile criteria
export interface CompanyFitAnalysis {
  id: string
  companyId: string
  discoveryRunId: string
  profileId: string
  criteriaMatchScore: number     // 1-10: how well company matches profile criteria
  cultureMatchScore: number      // 1-10: based on culture signals vs preferences
  opportunityScore: number       // 1-10: opportunity/growth potential
  locationMatchScore: number     // 1-10: location/remote alignment
  overallFitScore: number        // Weighted average of all scores
  criteriaMatchAnalysis: string  // What criteria align, which are gaps
  positioningStrategy: string    // How to approach this company
  prioritizedContacts: string[]  // Contact IDs in priority order for outreach
  outreachTemplate: string | null // Suggested intro message template
  createdAt: Date
}

export interface CompanyFitAnalysisRow {
  id: string
  company_id: string
  discovery_run_id: string
  profile_id: string
  criteria_match_score: number
  culture_match_score: number
  opportunity_score: number
  location_match_score: number
  overall_fit_score: number
  criteria_match_analysis: string
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
  fitAnalysis: CompanyFitAnalysis | null
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
