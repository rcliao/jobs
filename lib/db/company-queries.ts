import { randomUUID } from 'crypto'
import { getDb } from './client'
import type {
  Company,
  CompanyRow,
  CompanyResearchRun,
  CompanyResearchRunRow,
  CompanySignal,
  CompanySignalRow,
  Contact,
  ContactRow,
  CompanyJobLink,
  CompanyJobLinkRow,
  ResearchAgentConfig,
  ResearchAgentConfigRow,
  ResearchAgentType,
  ResearchAgentBehaviorConfig,
  ResearchAgentToolsConfig,
  SignalCategory,
  ContactType
} from '@/types'

const db = getDb()

// ============================================
// Row to Entity Converters
// ============================================

function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    sizeEstimate: row.size_estimate,
    headquarters: row.headquarters,
    linkedinUrl: row.linkedin_url,
    websiteUrl: row.website_url,
    overallScore: row.overall_score,
    researchStatus: row.research_status as Company['researchStatus'],
    lastResearchedAt: row.last_researched_at ? new Date(row.last_researched_at * 1000) : null,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  }
}

function rowToCompanyResearchRun(row: CompanyResearchRunRow): CompanyResearchRun {
  return {
    id: row.id,
    companyId: row.company_id,
    startedAt: new Date(row.started_at * 1000),
    completedAt: row.completed_at ? new Date(row.completed_at * 1000) : null,
    status: row.status as CompanyResearchRun['status'],
    summary: row.summary,
    signalsFound: row.signals_found,
    contactsFound: row.contacts_found,
    apiCallsMade: row.api_calls_made,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at * 1000)
  }
}

function rowToCompanySignal(row: CompanySignalRow): CompanySignal {
  return {
    id: row.id,
    companyId: row.company_id,
    researchRunId: row.research_run_id,
    category: row.category as SignalCategory,
    content: row.content,
    source: row.source,
    sourceUrl: row.source_url,
    confidence: row.confidence,
    signalDate: row.signal_date ? new Date(row.signal_date * 1000) : null,
    rawSnippet: row.raw_snippet,
    createdAt: new Date(row.created_at * 1000)
  }
}

function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    companyId: row.company_id,
    researchRunId: row.research_run_id,
    name: row.name,
    title: row.title,
    contactType: row.contact_type as ContactType,
    linkedinUrl: row.linkedin_url,
    email: row.email,
    source: row.source,
    relevanceScore: row.relevance_score,
    notes: row.notes,
    outreachStatus: row.outreach_status as Contact['outreachStatus'],
    lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at * 1000) : null,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  }
}

function rowToResearchAgentConfig(row: ResearchAgentConfigRow): ResearchAgentConfig {
  return {
    id: row.id,
    agentType: row.agent_type as ResearchAgentType,
    systemPrompt: row.system_prompt,
    behaviorConfig: JSON.parse(row.behavior_config),
    toolsConfig: JSON.parse(row.tools_config),
    enabled: row.enabled === 1,
    version: row.version,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  }
}

// ============================================
// Company Queries
// ============================================

export function getCompany(id: string): Company | null {
  const stmt = db.prepare('SELECT * FROM companies WHERE id = ?')
  const row = stmt.get(id) as CompanyRow | undefined
  return row ? rowToCompany(row) : null
}

export function getCompanyByName(name: string): Company | null {
  const stmt = db.prepare('SELECT * FROM companies WHERE name = ?')
  const row = stmt.get(name) as CompanyRow | undefined
  return row ? rowToCompany(row) : null
}

export function getOrCreateCompany(name: string): Company {
  const existing = getCompanyByName(name)
  if (existing) return existing

  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO companies (id, name, research_status, created_at, updated_at)
    VALUES (?, ?, 'pending', ?, ?)
  `)
  stmt.run(id, name, now, now)

  return getCompany(id)!
}

export interface ListCompaniesParams {
  researchStatus?: string
  minScore?: number
  limit?: number
  offset?: number
}

export function listCompanies(params: ListCompaniesParams = {}) {
  const { researchStatus, minScore, limit = 50, offset = 0 } = params

  let query = 'SELECT * FROM companies WHERE 1=1'
  const queryParams: (string | number)[] = []

  if (researchStatus) {
    query += ' AND research_status = ?'
    queryParams.push(researchStatus)
  }

  if (minScore !== undefined) {
    query += ' AND overall_score >= ?'
    queryParams.push(minScore)
  }

  query += ' ORDER BY overall_score DESC NULLS LAST, updated_at DESC LIMIT ? OFFSET ?'
  queryParams.push(limit, offset)

  const stmt = db.prepare(query)
  const rows = stmt.all(...queryParams) as CompanyRow[]

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1'
  const countParams: (string | number)[] = []

  if (researchStatus) {
    countQuery += ' AND research_status = ?'
    countParams.push(researchStatus)
  }

  if (minScore !== undefined) {
    countQuery += ' AND overall_score >= ?'
    countParams.push(minScore)
  }

  const countStmt = db.prepare(countQuery)
  const { total } = countStmt.get(...countParams) as { total: number }

  return {
    companies: rows.map(rowToCompany),
    total,
    limit,
    offset
  }
}

export function updateCompany(
  id: string,
  data: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>
): Company | null {
  const now = Math.floor(Date.now() / 1000)

  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.domain !== undefined) {
    updates.push('domain = ?')
    params.push(data.domain)
  }
  if (data.industry !== undefined) {
    updates.push('industry = ?')
    params.push(data.industry)
  }
  if (data.sizeEstimate !== undefined) {
    updates.push('size_estimate = ?')
    params.push(data.sizeEstimate)
  }
  if (data.headquarters !== undefined) {
    updates.push('headquarters = ?')
    params.push(data.headquarters)
  }
  if (data.linkedinUrl !== undefined) {
    updates.push('linkedin_url = ?')
    params.push(data.linkedinUrl)
  }
  if (data.websiteUrl !== undefined) {
    updates.push('website_url = ?')
    params.push(data.websiteUrl)
  }
  if (data.overallScore !== undefined) {
    updates.push('overall_score = ?')
    params.push(data.overallScore)
  }
  if (data.researchStatus !== undefined) {
    updates.push('research_status = ?')
    params.push(data.researchStatus)
  }
  if (data.lastResearchedAt !== undefined) {
    updates.push('last_researched_at = ?')
    params.push(data.lastResearchedAt ? Math.floor(data.lastResearchedAt.getTime() / 1000) : null)
  }

  if (updates.length === 0) {
    return getCompany(id)
  }

  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)

  const stmt = db.prepare(`UPDATE companies SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...params)

  return getCompany(id)
}

export function getCompaniesNeedingResearch(limit: number = 5): Company[] {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  const stmt = db.prepare(`
    SELECT * FROM companies
    WHERE research_status = 'pending'
       OR (research_status = 'researched' AND last_researched_at < ?)
    ORDER BY last_researched_at ASC NULLS FIRST
    LIMIT ?
  `)

  const rows = stmt.all(thirtyDaysAgo, limit) as CompanyRow[]
  return rows.map(rowToCompany)
}

// ============================================
// Company Research Run Queries
// ============================================

export function getCompanyResearchRun(id: string): CompanyResearchRun | null {
  const stmt = db.prepare('SELECT * FROM company_research_runs WHERE id = ?')
  const row = stmt.get(id) as CompanyResearchRunRow | undefined
  return row ? rowToCompanyResearchRun(row) : null
}

export function createCompanyResearchRun(companyId: string): string {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO company_research_runs (id, company_id, started_at, status, created_at)
    VALUES (?, ?, ?, 'running', ?)
  `)
  stmt.run(id, companyId, now, now)

  // Update company status
  db.prepare('UPDATE companies SET research_status = ? WHERE id = ?').run('running', companyId)

  return id
}

export function updateCompanyResearchRun(
  id: string,
  data: Partial<Pick<CompanyResearchRun, 'status' | 'summary' | 'signalsFound' | 'contactsFound' | 'apiCallsMade' | 'errorMessage'>>
): CompanyResearchRun | null {
  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
    if (data.status === 'complete' || data.status === 'failed') {
      updates.push('completed_at = ?')
      params.push(Math.floor(Date.now() / 1000))
    }
  }
  if (data.summary !== undefined) {
    updates.push('summary = ?')
    params.push(data.summary)
  }
  if (data.signalsFound !== undefined) {
    updates.push('signals_found = ?')
    params.push(data.signalsFound)
  }
  if (data.contactsFound !== undefined) {
    updates.push('contacts_found = ?')
    params.push(data.contactsFound)
  }
  if (data.apiCallsMade !== undefined) {
    updates.push('api_calls_made = ?')
    params.push(data.apiCallsMade)
  }
  if (data.errorMessage !== undefined) {
    updates.push('error_message = ?')
    params.push(data.errorMessage)
  }

  if (updates.length === 0) {
    return getCompanyResearchRun(id)
  }

  params.push(id)

  const stmt = db.prepare(`UPDATE company_research_runs SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...params)

  // If completed, update company status
  const run = getCompanyResearchRun(id)
  if (run && (data.status === 'complete' || data.status === 'failed')) {
    const newStatus = data.status === 'complete' ? 'researched' : 'failed'
    db.prepare(`
      UPDATE companies SET research_status = ?, last_researched_at = ? WHERE id = ?
    `).run(newStatus, Math.floor(Date.now() / 1000), run.companyId)
  }

  return run
}

export function getCompanyResearchRuns(companyId: string): CompanyResearchRun[] {
  const stmt = db.prepare('SELECT * FROM company_research_runs WHERE company_id = ? ORDER BY started_at DESC')
  const rows = stmt.all(companyId) as CompanyResearchRunRow[]
  return rows.map(rowToCompanyResearchRun)
}

// ============================================
// Company Signal Queries
// ============================================

export function createCompanySignal(signal: Omit<CompanySignal, 'createdAt'>): CompanySignal {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO company_signals (
      id, company_id, research_run_id, category, content, source,
      source_url, confidence, signal_date, raw_snippet, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    signal.id,
    signal.companyId,
    signal.researchRunId,
    signal.category,
    signal.content,
    signal.source,
    signal.sourceUrl,
    signal.confidence,
    signal.signalDate ? Math.floor(signal.signalDate.getTime() / 1000) : null,
    signal.rawSnippet,
    now
  )

  const row = db.prepare('SELECT * FROM company_signals WHERE id = ?').get(signal.id) as CompanySignalRow
  return rowToCompanySignal(row)
}

export function getCompanySignals(companyId: string, category?: SignalCategory): CompanySignal[] {
  let query = 'SELECT * FROM company_signals WHERE company_id = ?'
  const params: string[] = [companyId]

  if (category) {
    query += ' AND category = ?'
    params.push(category)
  }

  query += ' ORDER BY confidence DESC, created_at DESC'

  const stmt = db.prepare(query)
  const rows = stmt.all(...params) as CompanySignalRow[]
  return rows.map(rowToCompanySignal)
}

export function saveCompanySignals(companyId: string, researchRunId: string, signals: Omit<CompanySignal, 'id' | 'companyId' | 'researchRunId' | 'createdAt'>[]): CompanySignal[] {
  return signals.map(signal => createCompanySignal({
    id: randomUUID(),
    companyId,
    researchRunId,
    ...signal
  }))
}

// ============================================
// Contact Queries
// ============================================

export function createContact(contact: Omit<Contact, 'createdAt' | 'updatedAt'>): Contact {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO contacts (
      id, company_id, research_run_id, name, title, contact_type,
      linkedin_url, email, source, relevance_score, notes,
      outreach_status, last_contacted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    contact.id,
    contact.companyId,
    contact.researchRunId,
    contact.name,
    contact.title,
    contact.contactType,
    contact.linkedinUrl,
    contact.email,
    contact.source,
    contact.relevanceScore,
    contact.notes,
    contact.outreachStatus,
    contact.lastContactedAt ? Math.floor(contact.lastContactedAt.getTime() / 1000) : null,
    now,
    now
  )

  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact.id) as ContactRow
  return rowToContact(row)
}

export function getCompanyContacts(companyId: string, contactType?: ContactType): Contact[] {
  let query = 'SELECT * FROM contacts WHERE company_id = ?'
  const params: string[] = [companyId]

  if (contactType) {
    query += ' AND contact_type = ?'
    params.push(contactType)
  }

  query += ' ORDER BY relevance_score DESC NULLS LAST, created_at DESC'

  const stmt = db.prepare(query)
  const rows = stmt.all(...params) as ContactRow[]
  return rows.map(rowToContact)
}

export function updateContact(
  id: string,
  data: Partial<Pick<Contact, 'notes' | 'outreachStatus' | 'lastContactedAt'>>
): Contact | null {
  const now = Math.floor(Date.now() / 1000)

  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (data.notes !== undefined) {
    updates.push('notes = ?')
    params.push(data.notes)
  }
  if (data.outreachStatus !== undefined) {
    updates.push('outreach_status = ?')
    params.push(data.outreachStatus)
  }
  if (data.lastContactedAt !== undefined) {
    updates.push('last_contacted_at = ?')
    params.push(data.lastContactedAt ? Math.floor(data.lastContactedAt.getTime() / 1000) : null)
  }

  if (updates.length === 0) {
    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined
    return row ? rowToContact(row) : null
  }

  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)

  const stmt = db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`)
  stmt.run(...params)

  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined
  return row ? rowToContact(row) : null
}

export function saveContacts(companyId: string, researchRunId: string, contacts: Omit<Contact, 'id' | 'companyId' | 'researchRunId' | 'createdAt' | 'updatedAt'>[]): Contact[] {
  const savedContacts: Contact[] = []

  for (const contact of contacts) {
    // Try to find existing contact by LinkedIn URL or name+title
    let existingContact: ContactRow | undefined

    if (contact.linkedinUrl) {
      const stmt = db.prepare('SELECT * FROM contacts WHERE company_id = ? AND linkedin_url = ?')
      existingContact = stmt.get(companyId, contact.linkedinUrl) as ContactRow | undefined
    }

    if (!existingContact) {
      const stmt = db.prepare('SELECT * FROM contacts WHERE company_id = ? AND name = ? AND title = ?')
      existingContact = stmt.get(companyId, contact.name, contact.title) as ContactRow | undefined
    }

    if (existingContact) {
      // Update existing contact, preserving user-managed fields
      const now = Math.floor(Date.now() / 1000)
      const updateStmt = db.prepare(`
        UPDATE contacts SET
          research_run_id = ?,
          contact_type = ?,
          linkedin_url = COALESCE(?, linkedin_url),
          email = COALESCE(?, email),
          source = ?,
          relevance_score = ?,
          updated_at = ?
        WHERE id = ?
      `)
      updateStmt.run(
        researchRunId,
        contact.contactType,
        contact.linkedinUrl,
        contact.email,
        contact.source,
        contact.relevanceScore,
        now,
        existingContact.id
      )

      const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(existingContact.id) as ContactRow
      savedContacts.push(rowToContact(row))
    } else {
      // Create new contact
      const newContact = createContact({
        id: randomUUID(),
        companyId,
        researchRunId,
        ...contact
      })
      savedContacts.push(newContact)
    }
  }

  return savedContacts
}

// ============================================
// Company-Job Link Queries
// ============================================

export function linkCompanyToJob(companyId: string, jobId: string, confidence: number = 1.0): void {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO company_job_links (company_id, job_id, confidence, created_at)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(companyId, jobId, confidence, now)
}

export function getCompanyJobs(companyId: string): string[] {
  const stmt = db.prepare('SELECT job_id FROM company_job_links WHERE company_id = ?')
  const rows = stmt.all(companyId) as { job_id: string }[]
  return rows.map(r => r.job_id)
}

export function getJobCompany(jobId: string): string | null {
  const stmt = db.prepare('SELECT company_id FROM company_job_links WHERE job_id = ?')
  const row = stmt.get(jobId) as { company_id: string } | undefined
  return row ? row.company_id : null
}

// ============================================
// Research Agent Config Queries
// ============================================

export function getResearchAgentConfig(agentType: ResearchAgentType): ResearchAgentConfig | null {
  const stmt = db.prepare('SELECT * FROM research_agent_configs WHERE agent_type = ?')
  const row = stmt.get(agentType) as ResearchAgentConfigRow | undefined
  return row ? rowToResearchAgentConfig(row) : null
}

export function getAllResearchAgentConfigs(): ResearchAgentConfig[] {
  const stmt = db.prepare('SELECT * FROM research_agent_configs ORDER BY agent_type')
  const rows = stmt.all() as ResearchAgentConfigRow[]
  return rows.map(rowToResearchAgentConfig)
}

export function createOrUpdateResearchAgentConfig(
  agentType: ResearchAgentType,
  data: {
    systemPrompt: string
    behaviorConfig: ResearchAgentBehaviorConfig
    toolsConfig: ResearchAgentToolsConfig
    enabled?: boolean
    version?: string
  }
): ResearchAgentConfig {
  const now = Math.floor(Date.now() / 1000)
  const existing = getResearchAgentConfig(agentType)

  if (existing) {
    const stmt = db.prepare(`
      UPDATE research_agent_configs SET
        system_prompt = ?,
        behavior_config = ?,
        tools_config = ?,
        enabled = ?,
        version = ?,
        updated_at = ?
      WHERE agent_type = ?
    `)
    stmt.run(
      data.systemPrompt,
      JSON.stringify(data.behaviorConfig),
      JSON.stringify(data.toolsConfig),
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : existing.enabled ? 1 : 0,
      data.version || existing.version,
      now,
      agentType
    )
  } else {
    const id = randomUUID()
    const stmt = db.prepare(`
      INSERT INTO research_agent_configs (
        id, agent_type, system_prompt, behavior_config, tools_config,
        enabled, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      agentType,
      data.systemPrompt,
      JSON.stringify(data.behaviorConfig),
      JSON.stringify(data.toolsConfig),
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
      data.version || '1.0.0',
      now,
      now
    )
  }

  return getResearchAgentConfig(agentType)!
}

export function updateResearchAgentConfigEnabled(agentType: ResearchAgentType, enabled: boolean): ResearchAgentConfig | null {
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    UPDATE research_agent_configs SET enabled = ?, updated_at = ? WHERE agent_type = ?
  `)
  stmt.run(enabled ? 1 : 0, now, agentType)

  return getResearchAgentConfig(agentType)
}
