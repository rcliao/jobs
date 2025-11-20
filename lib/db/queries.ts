import { getDb } from './client'
import type {
  Profile,
  ProfileRow,
  AgentConfig,
  AgentConfigRow,
  Job,
  JobRow,
  SearchRun,
  SearchRunRow,
  UpdateProfileRequest,
  UpdateAgentConfigRequest,
  UpdateJobRequest
} from '@/types'

const db = getDb()

// Helper functions for type conversions
function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    targetRole: row.target_role,
    seniority: JSON.parse(row.seniority),
    technicalSkills: JSON.parse(row.technical_skills),
    company: JSON.parse(row.company),
    location: JSON.parse(row.location),
    compensation: JSON.parse(row.compensation),
    avoid: JSON.parse(row.avoid),
    mustHave: JSON.parse(row.must_have),
    includedSites: row.included_sites ? JSON.parse(row.included_sites) : [],
    excludedSites: row.excluded_sites ? JSON.parse(row.excluded_sites) : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

function rowToAgentConfig(row: AgentConfigRow): AgentConfig {
  return {
    id: row.id,
    systemPrompt: row.system_prompt,
    searchPatterns: row.search_patterns ? JSON.parse(row.search_patterns) : undefined,
    version: row.version,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  }
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    description: row.description,
    url: row.url,
    source: row.source,
    location: row.location,
    remote: row.remote === 1,
    postedDate: row.posted_date ? new Date(row.posted_date * 1000) : null,
    score: row.score,
    matchReasoning: row.match_reasoning,
    status: row.status as Job['status'],
    notes: row.notes,
    foundAt: new Date(row.found_at * 1000),
    searchId: row.search_id,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  }
}

function rowToSearchRun(row: SearchRunRow): SearchRun {
  return {
    id: row.id,
    executedAt: new Date(row.executed_at * 1000),
    queries: JSON.parse(row.queries),
    resultsCount: row.results_count,
    status: row.status as SearchRun['status'],
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at * 1000)
  }
}

// Profile queries
export function getProfile(id: string = 'default'): Profile | null {
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?')
  const row = stmt.get(id) as ProfileRow | undefined

  return row ? rowToProfile(row) : null
}

export function createProfile(data: UpdateProfileRequest, id: string = 'default'): Profile {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO profiles (
      id, target_role, seniority, technical_skills, company, location,
      compensation, avoid, must_have, included_sites, excluded_sites, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // If creating, we want to preserve the original createdAt if it exists (e.g., from an existing profile being replaced)
  const currentProfile = getProfile(id)
  const createdAt = currentProfile ? Math.floor(currentProfile.createdAt.getTime() / 1000) : now

  stmt.run(
    id,
    data.targetRole,
    JSON.stringify(data.seniority),
    JSON.stringify(data.technicalSkills),
    JSON.stringify(data.company),
    JSON.stringify(data.location),
    JSON.stringify(data.compensation),
    JSON.stringify(data.avoid),
    JSON.stringify(data.mustHave),
    JSON.stringify(data.includedSites || []),
    JSON.stringify(data.excludedSites || []),
    createdAt,
    now
  )

  return getProfile(id)!
}

export function updateProfile(data: UpdateProfileRequest, id: string = 'default'): Profile {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE profiles SET
      target_role = ?,
      seniority = ?,
      technical_skills = ?,
      company = ?,
      location = ?,
      compensation = ?,
      avoid = ?,
      must_have = ?,
      included_sites = ?,
      excluded_sites = ?,
      updated_at = ?
    WHERE id = ?
  `)

  const result = stmt.run(
    data.targetRole,
    JSON.stringify(data.seniority),
    JSON.stringify(data.technicalSkills),
    JSON.stringify(data.company),
    JSON.stringify(data.location),
    JSON.stringify(data.compensation),
    JSON.stringify(data.avoid),
    JSON.stringify(data.mustHave),
    JSON.stringify(data.includedSites || []),
    JSON.stringify(data.excludedSites || []),
    now,
    id
  )

  if (result.changes === 0) {
    // Profile doesn't exist, create it
    return createProfile(data, id)
  }

  return getProfile(id)!
}

// Agent Config queries
export function getAgentConfig(id: string = 'default'): AgentConfig | null {
  const stmt = db.prepare('SELECT * FROM agent_configs WHERE id = ?')
  const row = stmt.get(id) as AgentConfigRow | undefined

  return row ? rowToAgentConfig(row) : null
}

export function createAgentConfig(data: UpdateAgentConfigRequest, id: string = 'default'): AgentConfig {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO agent_configs (
      id, system_prompt, search_patterns, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    data.systemPrompt,
    data.searchPatterns ? JSON.stringify(data.searchPatterns) : null,
    data.version,
    now,
    now
  )

  return getAgentConfig(id)!
}

export function updateAgentConfig(data: UpdateAgentConfigRequest, id: string = 'default'): AgentConfig {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE agent_configs SET
      system_prompt = ?,
      search_patterns = ?,
      version = ?,
      updated_at = ?
    WHERE id = ?
  `)

  const result = stmt.run(
    data.systemPrompt,
    data.searchPatterns ? JSON.stringify(data.searchPatterns) : null,
    data.version,
    now,
    id
  )

  if (result.changes === 0) {
    // Config doesn't exist, create it
    return createAgentConfig(data, id)
  }

  return getAgentConfig(id)!
}

// Job queries
export function getJob(id: string): Job | null {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?')
  const row = stmt.get(id) as JobRow | undefined

  return row ? rowToJob(row) : null
}

export interface ListJobsParams {
  status?: string
  minScore?: number
  limit?: number
  offset?: number
}

export function listJobs(params: ListJobsParams = {}) {
  const { status, minScore, limit = 50, offset = 0 } = params

  let query = 'SELECT * FROM jobs WHERE 1=1'
  const queryParams: (string | number)[] = []

  if (status) {
    query += ' AND status = ?'
    queryParams.push(status)
  }

  if (minScore !== undefined) {
    query += ' AND score >= ?'
    queryParams.push(minScore)
  }

  query += ' ORDER BY score DESC, found_at DESC LIMIT ? OFFSET ?'
  queryParams.push(limit, offset)

  const stmt = db.prepare(query)
  const rows = stmt.all(...queryParams) as JobRow[]

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE 1=1'
  const countParams: (string | number)[] = []

  if (status) {
    countQuery += ' AND status = ?'
    countParams.push(status)
  }

  if (minScore !== undefined) {
    countQuery += ' AND score >= ?'
    countParams.push(minScore)
  }

  const countStmt = db.prepare(countQuery)
  const { total } = countStmt.get(...countParams) as { total: number }

  return {
    jobs: rows.map(rowToJob),
    total,
    limit,
    offset
  }
}

export function updateJob(id: string, data: UpdateJobRequest): Job | null {
  const now = Math.floor(Date.now() / 1000)

  const updates: string[] = []
  const params: (string | number)[] = []

  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }

  if (data.notes !== undefined) {
    updates.push('notes = ?')
    params.push(data.notes)
  }

  if (updates.length === 0) {
    return getJob(id)
  }

  updates.push('updated_at = ?')
  params.push(now)

  params.push(id)

  const stmt = db.prepare(`
    UPDATE jobs SET ${updates.join(', ')} WHERE id = ?
  `)

  stmt.run(...params)

  return getJob(id)
}

export function createJob(job: Omit<Job, 'createdAt' | 'updatedAt'>): Job {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO jobs (
      id, title, company, description, url, source, location, remote,
      posted_date, score, match_reasoning, status, notes, found_at,
      search_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    job.id,
    job.title,
    job.company,
    job.description,
    job.url,
    job.source,
    job.location,
    job.remote ? 1 : 0,
    job.postedDate ? Math.floor(job.postedDate.getTime() / 1000) : null,
    job.score,
    job.matchReasoning,
    job.status,
    job.notes,
    Math.floor(job.foundAt.getTime() / 1000),
    job.searchId,
    now,
    now
  )

  return getJob(job.id)!
}

// Search Run queries
export function getSearchRun(id: string): SearchRun | null {
  const stmt = db.prepare('SELECT * FROM search_runs WHERE id = ?')
  const row = stmt.get(id) as SearchRunRow | undefined

  return row ? rowToSearchRun(row) : null
}

export function createSearchRun(data: Omit<SearchRun, 'createdAt'>): SearchRun {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO search_runs (
      id, executed_at, queries, results_count, status, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    data.id,
    Math.floor(data.executedAt.getTime() / 1000),
    JSON.stringify(data.queries),
    data.resultsCount,
    data.status,
    data.errorMessage,
    now
  )

  return getSearchRun(data.id)!
}

export function updateSearchRun(
  id: string,
  data: Partial<Pick<SearchRun, 'status' | 'resultsCount' | 'errorMessage'>>
): SearchRun | null {
  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }

  if (data.resultsCount !== undefined) {
    updates.push('results_count = ?')
    params.push(data.resultsCount)
  }

  if (data.errorMessage !== undefined) {
    updates.push('error_message = ?')
    params.push(data.errorMessage)
  }

  if (updates.length === 0) {
    return getSearchRun(id)
  }

  params.push(id)

  const stmt = db.prepare(`
    UPDATE search_runs SET ${updates.join(', ')} WHERE id = ?
  `)

  stmt.run(...params)

  return getSearchRun(id)
}
