// SQLite schema definitions

export const PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  target_role TEXT NOT NULL,
  seniority TEXT NOT NULL,
  technical_skills TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  compensation TEXT NOT NULL,
  avoid TEXT NOT NULL,
  must_have TEXT NOT NULL,
  included_sites TEXT NOT NULL,
  excluded_sites TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`

export const AGENT_CONFIGS_TABLE = `
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  search_patterns TEXT,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`

export const SEARCH_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS search_runs (
  id TEXT PRIMARY KEY,
  executed_at INTEGER NOT NULL,
  queries TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
`

export const JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  location TEXT,
  remote INTEGER NOT NULL DEFAULT 0,
  posted_date INTEGER,
  score INTEGER NOT NULL,
  match_reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  found_at INTEGER NOT NULL,
  search_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (search_id) REFERENCES search_runs(id)
);
`

export const JOBS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);',
  'CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC);',
  'CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url);',
  'CREATE INDEX IF NOT EXISTS idx_jobs_search_id ON jobs(search_id);'
]

// ============================================
// Company Research Tables
// ============================================

export const COMPANIES_TABLE = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  domain TEXT,
  industry TEXT,
  size_estimate TEXT,
  headquarters TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  overall_score INTEGER,
  research_status TEXT NOT NULL DEFAULT 'pending',
  last_researched_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`

export const COMPANY_RESEARCH_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS company_research_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  summary TEXT,
  signals_found INTEGER DEFAULT 0,
  contacts_found INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
`

export const COMPANY_SIGNALS_TABLE = `
CREATE TABLE IF NOT EXISTS company_signals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  research_run_id TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  confidence INTEGER NOT NULL,
  signal_date INTEGER,
  raw_snippet TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (research_run_id) REFERENCES company_research_runs(id)
);
`

export const CONTACTS_TABLE = `
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  research_run_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  linkedin_url TEXT,
  email TEXT,
  source TEXT NOT NULL,
  relevance_score INTEGER,
  notes TEXT,
  outreach_status TEXT DEFAULT 'not_contacted',
  last_contacted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (research_run_id) REFERENCES company_research_runs(id)
);
`

export const COMPANY_JOB_LINKS_TABLE = `
CREATE TABLE IF NOT EXISTS company_job_links (
  company_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (company_id, job_id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
`

export const RESEARCH_AGENT_CONFIGS_TABLE = `
CREATE TABLE IF NOT EXISTS research_agent_configs (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  behavior_config TEXT NOT NULL,
  tools_config TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`

export const COMPANY_RESEARCH_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);',
  'CREATE INDEX IF NOT EXISTS idx_companies_score ON companies(overall_score DESC);',
  'CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(research_status);',
  'CREATE INDEX IF NOT EXISTS idx_research_runs_company ON company_research_runs(company_id);',
  'CREATE INDEX IF NOT EXISTS idx_research_runs_status ON company_research_runs(status);',
  'CREATE INDEX IF NOT EXISTS idx_signals_company ON company_signals(company_id);',
  'CREATE INDEX IF NOT EXISTS idx_signals_category ON company_signals(category);',
  'CREATE INDEX IF NOT EXISTS idx_signals_research_run ON company_signals(research_run_id);',
  'CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);',
  'CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);',
  'CREATE INDEX IF NOT EXISTS idx_contacts_outreach ON contacts(outreach_status);',
  'CREATE INDEX IF NOT EXISTS idx_company_jobs_company ON company_job_links(company_id);',
  'CREATE INDEX IF NOT EXISTS idx_company_jobs_job ON company_job_links(job_id);',
  'CREATE INDEX IF NOT EXISTS idx_research_agent_configs_type ON research_agent_configs(agent_type);'
]

// ============================================
// Company Discovery Tables
// ============================================

export const COMPANY_DISCOVERY_RUNS_TABLE = `
CREATE TABLE IF NOT EXISTS company_discovery_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  search_queries TEXT NOT NULL DEFAULT '[]',
  companies_discovered INTEGER DEFAULT 0,
  companies_researched INTEGER DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
`

export const CANDIDATE_FIT_ANALYSES_TABLE = `
CREATE TABLE IF NOT EXISTS candidate_fit_analyses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  discovery_run_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  skill_match_score INTEGER NOT NULL,
  culture_match_score INTEGER NOT NULL,
  career_growth_score INTEGER NOT NULL,
  location_match_score INTEGER NOT NULL,
  overall_fit_score INTEGER NOT NULL,
  skills_match_analysis TEXT NOT NULL,
  positioning_strategy TEXT NOT NULL,
  prioritized_contacts TEXT NOT NULL DEFAULT '[]',
  outreach_template TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (discovery_run_id) REFERENCES company_discovery_runs(id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
`

export const DISCOVERY_COMPANY_LINKS_TABLE = `
CREATE TABLE IF NOT EXISTS discovery_company_links (
  discovery_run_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  discovery_source TEXT NOT NULL,
  discovery_snippet TEXT,
  discovery_rank INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (discovery_run_id, company_id),
  FOREIGN KEY (discovery_run_id) REFERENCES company_discovery_runs(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
`

export const COMPANY_DISCOVERY_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_discovery_runs_profile ON company_discovery_runs(profile_id);',
  'CREATE INDEX IF NOT EXISTS idx_discovery_runs_status ON company_discovery_runs(status);',
  'CREATE INDEX IF NOT EXISTS idx_fit_analyses_company ON candidate_fit_analyses(company_id);',
  'CREATE INDEX IF NOT EXISTS idx_fit_analyses_discovery ON candidate_fit_analyses(discovery_run_id);',
  'CREATE INDEX IF NOT EXISTS idx_fit_analyses_score ON candidate_fit_analyses(overall_fit_score DESC);',
  'CREATE INDEX IF NOT EXISTS idx_discovery_links_discovery ON discovery_company_links(discovery_run_id);',
  'CREATE INDEX IF NOT EXISTS idx_discovery_links_company ON discovery_company_links(company_id);'
]

export const ALL_TABLES = [
  PROFILES_TABLE,
  AGENT_CONFIGS_TABLE,
  SEARCH_RUNS_TABLE,
  JOBS_TABLE,
  COMPANIES_TABLE,
  COMPANY_RESEARCH_RUNS_TABLE,
  COMPANY_SIGNALS_TABLE,
  CONTACTS_TABLE,
  COMPANY_JOB_LINKS_TABLE,
  RESEARCH_AGENT_CONFIGS_TABLE,
  COMPANY_DISCOVERY_RUNS_TABLE,
  CANDIDATE_FIT_ANALYSES_TABLE,
  DISCOVERY_COMPANY_LINKS_TABLE
]

export const ALL_INDEXES = [
  ...JOBS_INDEXES,
  ...COMPANY_RESEARCH_INDEXES,
  ...COMPANY_DISCOVERY_INDEXES
]
