import { getDb } from './client'
import type {
  CompanyDiscoveryRun,
  CompanyDiscoveryRunRow,
  CompanyFitAnalysis,
  CompanyFitAnalysisRow,
  DiscoveryCompanyLink,
  DiscoveryCompanyLinkRow,
  DiscoveryStatus
} from '@/types'

// ============================================
// Row to Type Transformations
// ============================================

function rowToDiscoveryRun(row: CompanyDiscoveryRunRow): CompanyDiscoveryRun {
  return {
    id: row.id,
    profileId: row.profile_id,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    status: row.status as DiscoveryStatus,
    searchQueries: JSON.parse(row.search_queries),
    companiesDiscovered: row.companies_discovered,
    companiesResearched: row.companies_researched,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at)
  }
}

function rowToFitAnalysis(row: CompanyFitAnalysisRow): CompanyFitAnalysis {
  return {
    id: row.id,
    companyId: row.company_id,
    discoveryRunId: row.discovery_run_id,
    profileId: row.profile_id,
    criteriaMatchScore: row.criteria_match_score,
    cultureMatchScore: row.culture_match_score,
    opportunityScore: row.opportunity_score,
    locationMatchScore: row.location_match_score,
    overallFitScore: row.overall_fit_score,
    criteriaMatchAnalysis: row.criteria_match_analysis,
    positioningStrategy: row.positioning_strategy,
    prioritizedContacts: JSON.parse(row.prioritized_contacts),
    outreachTemplate: row.outreach_template,
    createdAt: new Date(row.created_at)
  }
}

function rowToDiscoveryLink(row: DiscoveryCompanyLinkRow): DiscoveryCompanyLink {
  return {
    discoveryRunId: row.discovery_run_id,
    companyId: row.company_id,
    discoverySource: row.discovery_source,
    discoverySnippet: row.discovery_snippet,
    discoveryRank: row.discovery_rank,
    createdAt: new Date(row.created_at)
  }
}

// ============================================
// Company Discovery Run Queries
// ============================================

export function createDiscoveryRun(profileId: string): CompanyDiscoveryRun {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO company_discovery_runs (
      id, profile_id, started_at, status, search_queries,
      companies_discovered, companies_researched, created_at
    ) VALUES (?, ?, ?, 'running', '[]', 0, 0, ?)
  `).run(id, profileId, now, now)

  return getDiscoveryRun(id)!
}

export function getDiscoveryRun(id: string): CompanyDiscoveryRun | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM company_discovery_runs WHERE id = ?
  `).get(id) as CompanyDiscoveryRunRow | undefined

  return row ? rowToDiscoveryRun(row) : null
}

export function listDiscoveryRuns(profileId?: string, limit = 20): CompanyDiscoveryRun[] {
  const db = getDb()

  let query = 'SELECT * FROM company_discovery_runs'
  const params: (string | number)[] = []

  if (profileId) {
    query += ' WHERE profile_id = ?'
    params.push(profileId)
  }

  query += ' ORDER BY started_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(query).all(...params) as CompanyDiscoveryRunRow[]
  return rows.map(rowToDiscoveryRun)
}

export function updateDiscoveryRunStatus(
  id: string,
  status: DiscoveryStatus,
  updates?: {
    searchQueries?: string[]
    companiesDiscovered?: number
    companiesResearched?: number
    errorMessage?: string | null
  }
): void {
  const db = getDb()
  const now = Date.now()

  let sql = 'UPDATE company_discovery_runs SET status = ?'
  const params: (string | number | null)[] = [status]

  if (updates?.searchQueries) {
    sql += ', search_queries = ?'
    params.push(JSON.stringify(updates.searchQueries))
  }

  if (updates?.companiesDiscovered !== undefined) {
    sql += ', companies_discovered = ?'
    params.push(updates.companiesDiscovered)
  }

  if (updates?.companiesResearched !== undefined) {
    sql += ', companies_researched = ?'
    params.push(updates.companiesResearched)
  }

  if (updates?.errorMessage !== undefined) {
    sql += ', error_message = ?'
    params.push(updates.errorMessage)
  }

  if (status === 'complete' || status === 'failed') {
    sql += ', completed_at = ?'
    params.push(now)
  }

  sql += ' WHERE id = ?'
  params.push(id)

  db.prepare(sql).run(...params)
}

export function incrementDiscoveryCount(
  id: string,
  field: 'discovered' | 'researched',
  increment = 1
): void {
  const db = getDb()
  const column = field === 'discovered' ? 'companies_discovered' : 'companies_researched'

  db.prepare(`
    UPDATE company_discovery_runs
    SET ${column} = ${column} + ?
    WHERE id = ?
  `).run(increment, id)
}

// ============================================
// Company Fit Analysis Queries
// ============================================

export function createFitAnalysis(
  analysis: Omit<CompanyFitAnalysis, 'id' | 'createdAt'>
): CompanyFitAnalysis {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO company_fit_analyses (
      id, company_id, discovery_run_id, profile_id,
      criteria_match_score, culture_match_score, opportunity_score,
      location_match_score, overall_fit_score,
      criteria_match_analysis, positioning_strategy,
      prioritized_contacts, outreach_template, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    analysis.companyId,
    analysis.discoveryRunId,
    analysis.profileId,
    analysis.criteriaMatchScore,
    analysis.cultureMatchScore,
    analysis.opportunityScore,
    analysis.locationMatchScore,
    analysis.overallFitScore,
    analysis.criteriaMatchAnalysis,
    analysis.positioningStrategy,
    JSON.stringify(analysis.prioritizedContacts),
    analysis.outreachTemplate,
    now
  )

  return getFitAnalysis(id)!
}

export function getFitAnalysis(id: string): CompanyFitAnalysis | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM company_fit_analyses WHERE id = ?
  `).get(id) as CompanyFitAnalysisRow | undefined

  return row ? rowToFitAnalysis(row) : null
}

export function getFitAnalysisByCompany(
  companyId: string,
  discoveryRunId: string
): CompanyFitAnalysis | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM company_fit_analyses
    WHERE company_id = ? AND discovery_run_id = ?
  `).get(companyId, discoveryRunId) as CompanyFitAnalysisRow | undefined

  return row ? rowToFitAnalysis(row) : null
}

export function getFitAnalysesByRun(discoveryRunId: string): CompanyFitAnalysis[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM company_fit_analyses
    WHERE discovery_run_id = ?
    ORDER BY overall_fit_score DESC
  `).all(discoveryRunId) as CompanyFitAnalysisRow[]

  return rows.map(rowToFitAnalysis)
}

// ============================================
// Discovery Company Link Queries
// ============================================

export function createDiscoveryLink(
  discoveryRunId: string,
  companyId: string,
  source: string,
  snippet: string | null,
  rank: number
): DiscoveryCompanyLink {
  const db = getDb()
  const now = Date.now()

  db.prepare(`
    INSERT OR IGNORE INTO discovery_company_links (
      discovery_run_id, company_id, discovery_source,
      discovery_snippet, discovery_rank, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(discoveryRunId, companyId, source, snippet, rank, now)

  return getDiscoveryLink(discoveryRunId, companyId)!
}

export function getDiscoveryLink(
  discoveryRunId: string,
  companyId: string
): DiscoveryCompanyLink | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM discovery_company_links
    WHERE discovery_run_id = ? AND company_id = ?
  `).get(discoveryRunId, companyId) as DiscoveryCompanyLinkRow | undefined

  return row ? rowToDiscoveryLink(row) : null
}

export function getDiscoveryLinksByRun(discoveryRunId: string): DiscoveryCompanyLink[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM discovery_company_links
    WHERE discovery_run_id = ?
    ORDER BY discovery_rank ASC
  `).all(discoveryRunId) as DiscoveryCompanyLinkRow[]

  return rows.map(rowToDiscoveryLink)
}

// ============================================
// Combined Queries for Discovery Results
// ============================================

import { getCompany, getCompanySignals, getCompanyContacts } from './company-queries'
import type { DiscoveredCompanyResult } from '@/types'

export function getDiscoveryResults(discoveryRunId: string): DiscoveredCompanyResult[] {
  const links = getDiscoveryLinksByRun(discoveryRunId)
  const fitAnalyses = getFitAnalysesByRun(discoveryRunId)

  const results: DiscoveredCompanyResult[] = []

  for (const link of links) {
    const company = getCompany(link.companyId)
    if (!company) continue

    const signals = getCompanySignals(link.companyId)
    const contacts = getCompanyContacts(link.companyId)
    const fitAnalysis = fitAnalyses.find(fa => fa.companyId === link.companyId) || null

    results.push({
      company,
      discoverySource: link.discoverySource,
      discoverySnippet: link.discoverySnippet,
      researchComplete: company.researchStatus === 'researched',
      signals,
      contacts,
      fitAnalysis
    })
  }

  // Sort by overall fit score (highest first)
  return results.sort((a, b) => {
    const scoreA = a.fitAnalysis?.overallFitScore ?? 0
    const scoreB = b.fitAnalysis?.overallFitScore ?? 0
    return scoreB - scoreA
  })
}
