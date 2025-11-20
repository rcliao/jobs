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
