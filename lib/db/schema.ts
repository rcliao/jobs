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

export const ALL_TABLES = [
  PROFILES_TABLE,
  AGENT_CONFIGS_TABLE,
  SEARCH_RUNS_TABLE,
  JOBS_TABLE
]
