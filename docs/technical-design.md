# Job Search Automation - Technical Design

**Version:** 1.0
**Created:** 2025-11-13
**Status:** Initial Design

---

## 1. Domain Storytelling

Domain storytelling uses narratives to describe how actors interact with the system through specific actions on work objects, showing data transformations throughout the process.

### Story 1: Configuring Job Search Profile

**Actors:** Eric (Job Seeker)
**Trigger:** Eric wants to set up his job search criteria

**Narrative Flow:**

```
Eric → opens → Configuration Page
  ↓
Configuration Page → loads → Profile Data (from database)
  ↓
Configuration Page → displays → Profile Form
  ↓
Eric → fills in → Search Criteria {
  - Target Role: "Staff Software Engineer"
  - Seniority: ["Staff", "Senior"]
  - Tech Skills: ["TypeScript", "Go", "Distributed Systems"]
  - Company Stage: ["Series A", "Series B"]
  - Industry: ["GenAI", "AI/ML"]
  - Location: ["Remote", "SF Bay Area"]
  - Compensation: {min: 180000, target: 220000}
  - Must Have: ["remote-friendly", "equity"]
  - Avoid: ["blockchain", "crypto", "consultancy"]
}
  ↓
Eric → edits → Agent System Prompt {
  - Search strategy instructions
  - Query generation patterns
  - Scoring criteria (1-10 scale)
}
  ↓
Eric → clicks → "Save Configuration"
  ↓
Configuration Page → validates → Form Data
  ↓
Configuration Page → sends → Profile Update (via Server Action)
  ↓
Server → saves → Profile (to profiles table)
  ↓
Server → saves → Agent Config (to agent_configs table)
  ↓
Server → redirects → Eric to Dashboard
  ↓
Dashboard → displays → "Configuration saved" message
```

**Key Work Objects:**
- Profile Data (input/output)
- Agent Config (input/output)
- Form Validation Results (intermediate)

**Data Transformations:**
- User Input → Validated Profile → Database Record
- Freeform Text Prompt → Structured Agent Config → Database Record

---

### Story 2: Executing Automated Job Search

**Actors:** Eric (Job Seeker), Search Agent (LLM), Google Custom Search API
**Trigger:** Eric clicks "Run Search" on dashboard

**Narrative Flow:**

```
Eric → clicks → "Run Search" button
  ↓
Dashboard → triggers → Search Execution (POST /api/search)
  ↓
Search API → creates → Search Run Record {
  id: "run_001"
  status: "running"
  executedAt: timestamp
}
  ↓
Search API → loads → Profile Data (from database)
  ↓
Search API → loads → Agent Config (from database)
  ↓
Search API → sends → Query Generation Request to Search Agent {
  prompt: agent.systemPrompt
  profile: profile data
  task: "Generate 5-7 Google Custom Search queries"
}
  ↓
Search Agent → analyzes → Profile Requirements
  ↓
Search Agent → generates → Search Queries [
  "site:greenhouse.io OR site:lever.co \"Staff Engineer\" TypeScript remote",
  "site:ashbyhq.com \"Senior Engineer\" Go distributed systems",
  "\"Staff Software Engineer\" GenAI Series A remote",
  "\"Staff Engineer\" AI/ML startup TypeScript remote-first",
  "site:greenhouse.io \"Senior Software Engineer\" GenAI equity"
]
  ↓
Search API → executes → Google Custom Search (for each query)
  ↓
Google API → returns → Raw Search Results [
  {title, link, snippet, source}...
]
  ↓
Search API → parses → Search Results into Job Records
  ↓
Search API → deduplicates → Jobs (by URL)
  ↓
Search API → sends → Scoring Request to Search Agent (for each job) {
  job: {title, company, description, location}
  profile: profile criteria
  task: "Score 1-10 with reasoning"
}
  ↓
Search Agent → evaluates → Job Match Quality
  ↓
Search Agent → returns → Job Score {
  score: 8,
  reasoning: "Strong match: Staff level role at Series B GenAI company, TypeScript stack, remote-first. Missing Go but has distributed systems focus."
}
  ↓
Search API → saves → Scored Jobs to database {
  id, title, company, url, score, matchReasoning, status: "new"
}
  ↓
Search API → updates → Search Run {status: "complete", resultsCount: 23}
  ↓
Search API → returns → Search Run ID
  ↓
Dashboard → refreshes → Job List
  ↓
Dashboard → displays → New Jobs (sorted by score)
```

**Key Work Objects:**
- Search Run (tracking)
- Profile Data (input)
- Agent Config (input)
- Search Queries (intermediate)
- Raw Search Results (intermediate)
- Scored Job Records (output)

**Data Transformations:**
1. Profile + Agent Config → Search Queries (via LLM)
2. Search Queries → Raw Results (via Google API)
3. Raw Results → Parsed Jobs (deduplication)
4. Parsed Jobs + Profile → Scored Jobs (via LLM)
5. Scored Jobs → Database Records

---

### Story 3: Reviewing and Managing Job Leads

**Actors:** Eric (Job Seeker)
**Trigger:** Eric wants to review search results and track applications

**Narrative Flow:**

```
Eric → views → Dashboard
  ↓
Dashboard → loads → Job List (from /api/jobs?status=new)
  ↓
Dashboard → displays → Job Cards [
  {title, company, score, matchReasoning, status}
] (sorted by score descending)
  ↓
Eric → applies → Status Filter ("Show only New jobs")
  ↓
Dashboard → filters → Job List (client-side or re-fetch)
  ↓
Eric → clicks → Job Card
  ↓
Browser → navigates → Job Detail Page (/jobs/[id])
  ↓
Detail Page → loads → Full Job Data
  ↓
Detail Page → displays → Complete Information {
  - Full description
  - Full match reasoning
  - Original job posting link
  - Notes field
  - Status actions
}
  ↓
Eric → reads → Job Description
  ↓
Eric → decides → "This looks promising"
  ↓
Eric → clicks → "Save for Later"
  ↓
Detail Page → sends → Status Update (PATCH /api/jobs/[id])
  ↓
API → updates → Job Record {status: "new" → "saved"}
  ↓
API → returns → Updated Job
  ↓
Detail Page → displays → Updated Status Badge
  ↓
Eric → navigates back → Dashboard
  ↓
Dashboard → shows → Updated Job List (saved job moved to "Saved" section)
  ↓
---
Eric → applies to job externally
  ↓
Eric → returns to Dashboard
  ↓
Eric → finds job → clicks "Mark as Applied"
  ↓
Dashboard → updates → Job Status to "applied"
  ↓
---
Eric → sees → Irrelevant Job
  ↓
Eric → clicks → "Dismiss"
  ↓
Dashboard → updates → Job Status to "dismissed"
  ↓
Dashboard → hides → Dismissed Job (unless "Show Dismissed" filter active)
```

**Key Work Objects:**
- Job List (filtered view)
- Job Card (display item)
- Job Detail (full record)
- Status Update (action)
- Filter State (UI state)

**Data Transformations:**
- Database Jobs → Filtered List → Displayed Cards
- User Action → Status Update Request → Updated Database Record
- Filter Selection → Query Parameters → Filtered Results

---

## 2. Data Model

### Database: SQLite Schema

#### Table: `profiles`

Stores job search criteria for the user.

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  target_role TEXT NOT NULL,
  seniority TEXT NOT NULL,           -- JSON array: ["Staff", "Senior"]
  technical_skills TEXT NOT NULL,    -- JSON: {"primary": [...], "secondary": [...]}
  company TEXT NOT NULL,             -- JSON: {"stage": [...], "industry": [...], "sizeRange": "..."}
  location TEXT NOT NULL,            -- JSON: {"preferences": [...], "remoteOk": boolean}
  compensation TEXT NOT NULL,        -- JSON: {"minimum": number, "target": number}
  avoid TEXT NOT NULL,               -- JSON array: ["blockchain", "crypto", ...]
  must_have TEXT NOT NULL,           -- JSON array: ["remote-friendly", ...]
  created_at INTEGER NOT NULL,       -- Unix timestamp
  updated_at INTEGER NOT NULL        -- Unix timestamp
);
```

**Notes:**
- Single-user system: only one profile record (id = "default")
- Complex fields stored as JSON strings (parsed in application layer)
- Timestamps in Unix epoch for SQLite compatibility

---

#### Table: `agent_configs`

Stores LLM system prompts and search strategy configuration.

```sql
CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,       -- Full prompt for query generation & scoring
  search_patterns TEXT,              -- JSON array (optional): ["site:greenhouse.io", ...]
  version TEXT NOT NULL,             -- Config version for tracking changes
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Notes:**
- Single config record (id = "default")
- `search_patterns` allows manual override of query patterns
- `version` helps track prompt iterations during testing

---

#### Table: `search_runs`

Tracks each search execution for debugging and history.

```sql
CREATE TABLE search_runs (
  id TEXT PRIMARY KEY,               -- UUID
  executed_at INTEGER NOT NULL,      -- Unix timestamp
  queries TEXT NOT NULL,             -- JSON array of search query strings
  results_count INTEGER NOT NULL,    -- Total jobs found in this run
  status TEXT NOT NULL,              -- 'running' | 'complete' | 'failed'
  error_message TEXT,                -- If status = 'failed'
  created_at INTEGER NOT NULL
);
```

**Notes:**
- Each "Run Search" click creates a new record
- Useful for debugging search quality over time
- `queries` stores what the LLM generated

---

#### Table: `jobs`

Stores discovered job leads with scores and tracking status.

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,               -- UUID
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,         -- Full text from search result
  url TEXT NOT NULL UNIQUE,          -- Deduplication key
  source TEXT NOT NULL,              -- 'google_custom_search' (extensible)
  location TEXT,
  remote INTEGER NOT NULL,           -- Boolean: 1 = true, 0 = false
  posted_date INTEGER,               -- Unix timestamp (if available)
  score INTEGER NOT NULL,            -- 1-10
  match_reasoning TEXT NOT NULL,     -- LLM explanation of score
  status TEXT NOT NULL,              -- 'new' | 'saved' | 'applied' | 'dismissed'
  notes TEXT,                        -- User's personal notes
  found_at INTEGER NOT NULL,         -- Unix timestamp when discovered
  search_id TEXT NOT NULL,           -- FK to search_runs.id
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (search_id) REFERENCES search_runs(id)
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_score ON jobs(score DESC);
CREATE INDEX idx_jobs_url ON jobs(url);
```

**Notes:**
- `url` is unique to prevent duplicates across searches
- `remote` stored as integer (SQLite doesn't have native boolean)
- Indexed on `status` and `score` for fast filtering/sorting
- `search_id` links back to which search run found this job

---

### TypeScript Type Definitions

```typescript
// Profile
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
  createdAt: Date
  updatedAt: Date
}

// Agent Config
export interface AgentConfig {
  id: string
  systemPrompt: string
  searchPatterns?: string[]
  version: string
  createdAt: Date
  updatedAt: Date
}

// Job
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

// Search Run
export interface SearchRun {
  id: string
  executedAt: Date
  queries: string[]
  resultsCount: number
  status: 'running' | 'complete' | 'failed'
  errorMessage: string | null
  createdAt: Date
}
```

---

## 3. API Contracts

### 3.1 Profile Management

#### `GET /api/profile`

**Purpose:** Retrieve current job search profile

**Request:**
```http
GET /api/profile
```

**Response (200 OK):**
```json
{
  "id": "default",
  "targetRole": "Staff Software Engineer",
  "seniority": ["Staff", "Senior"],
  "technicalSkills": {
    "primary": ["TypeScript", "Go", "Distributed Systems"],
    "secondary": ["Python", "Kubernetes"]
  },
  "company": {
    "stage": ["Series A", "Series B"],
    "industry": ["GenAI", "AI/ML", "Infrastructure"],
    "sizeRange": "20-200"
  },
  "location": {
    "preferences": ["Remote", "SF Bay Area"],
    "remoteOk": true
  },
  "compensation": {
    "minimum": 180000,
    "target": 220000
  },
  "avoid": ["blockchain", "crypto", "web3", "consultancy"],
  "mustHave": ["remote-friendly", "equity"],
  "createdAt": "2025-11-13T10:00:00Z",
  "updatedAt": "2025-11-13T10:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Profile not yet created

---

#### `PUT /api/profile`

**Purpose:** Update job search profile

**Request:**
```http
PUT /api/profile
Content-Type: application/json

{
  "targetRole": "Staff Software Engineer",
  "seniority": ["Staff", "Senior"],
  "technicalSkills": {
    "primary": ["TypeScript", "Go"],
    "secondary": ["Python"]
  },
  "company": {
    "stage": ["Series A", "Series B"],
    "industry": ["GenAI"],
    "sizeRange": "20-200"
  },
  "location": {
    "preferences": ["Remote"],
    "remoteOk": true
  },
  "compensation": {
    "minimum": 180000,
    "target": 220000
  },
  "avoid": ["blockchain", "crypto"],
  "mustHave": ["remote-friendly", "equity"]
}
```

**Response (200 OK):**
```json
{
  "id": "default",
  "targetRole": "Staff Software Engineer",
  ...
  "updatedAt": "2025-11-13T11:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data (missing required fields, wrong types)
- `422 Unprocessable Entity` - Validation errors

---

### 3.2 Agent Configuration

#### `GET /api/agent-config`

**Purpose:** Retrieve LLM agent configuration

**Request:**
```http
GET /api/agent-config
```

**Response (200 OK):**
```json
{
  "id": "default",
  "systemPrompt": "You are a Lead Researcher agent...",
  "searchPatterns": [
    "site:greenhouse.io OR site:lever.co",
    "\"Staff Engineer\" OR \"Senior Engineer\""
  ],
  "version": "1.0",
  "createdAt": "2025-11-13T10:00:00Z",
  "updatedAt": "2025-11-13T10:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Config not yet created

---

#### `PUT /api/agent-config`

**Purpose:** Update agent configuration

**Request:**
```http
PUT /api/agent-config
Content-Type: application/json

{
  "systemPrompt": "You are a Lead Researcher agent finding job postings...",
  "searchPatterns": ["site:greenhouse.io"],
  "version": "1.1"
}
```

**Response (200 OK):**
```json
{
  "id": "default",
  "systemPrompt": "You are a Lead Researcher agent...",
  "searchPatterns": ["site:greenhouse.io"],
  "version": "1.1",
  "updatedAt": "2025-11-13T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid prompt format

---

### 3.3 Search Execution

#### `POST /api/search`

**Purpose:** Trigger automated job search

**Request:**
```http
POST /api/search
Content-Type: application/json

{}
```

**Response (202 Accepted):**
```json
{
  "searchRunId": "run_abc123",
  "status": "running",
  "message": "Search started. Generating queries..."
}
```

**Note:** Search executes synchronously but returns immediately with run ID. Client can poll or refresh to see results.

**Full Success Response (when complete):**
```json
{
  "searchRunId": "run_abc123",
  "status": "complete",
  "resultsCount": 23,
  "queries": [
    "site:greenhouse.io \"Staff Engineer\" TypeScript remote",
    "site:lever.co \"Senior Engineer\" GenAI Series A"
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Profile or agent config not configured
- `500 Internal Server Error` - Google API error, LLM error, etc.
- `503 Service Unavailable` - Rate limit exceeded

**Behavior:**
1. Loads profile and agent config
2. Calls Claude API to generate 5-7 search queries
3. Executes queries via Google Custom Search API
4. Parses and deduplicates results by URL
5. Calls Claude API to score each job (1-10)
6. Saves jobs to database with status="new"
7. Updates search_runs record with results count

---

### 3.4 Job Management

#### `GET /api/jobs`

**Purpose:** List jobs with optional filters

**Request:**
```http
GET /api/jobs?status=new&minScore=6&limit=20&offset=0
```

**Query Parameters:**
- `status` (optional): Filter by status (new, saved, applied, dismissed)
- `minScore` (optional): Minimum score (1-10)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "job_001",
      "title": "Staff Software Engineer - Platform",
      "company": "Acme AI",
      "description": "We're looking for a Staff Engineer...",
      "url": "https://jobs.ashbyhq.com/acme/staff-engineer",
      "source": "google_custom_search",
      "location": "Remote",
      "remote": true,
      "postedDate": "2025-11-10T00:00:00Z",
      "score": 9,
      "matchReasoning": "Perfect match: Staff level, GenAI startup, TypeScript/Go stack, remote-first...",
      "status": "new",
      "notes": null,
      "foundAt": "2025-11-13T10:30:00Z",
      "searchId": "run_abc123"
    }
  ],
  "total": 23,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters

---

#### `GET /api/jobs/[id]`

**Purpose:** Get single job details

**Request:**
```http
GET /api/jobs/job_001
```

**Response (200 OK):**
```json
{
  "id": "job_001",
  "title": "Staff Software Engineer - Platform",
  "company": "Acme AI",
  ...
}
```

**Error Responses:**
- `404 Not Found` - Job doesn't exist

---

#### `PATCH /api/jobs/[id]`

**Purpose:** Update job status or notes

**Request:**
```http
PATCH /api/jobs/job_001
Content-Type: application/json

{
  "status": "saved",
  "notes": "Great team, interesting product. Apply next week."
}
```

**Response (200 OK):**
```json
{
  "id": "job_001",
  "title": "Staff Software Engineer - Platform",
  "status": "saved",
  "notes": "Great team, interesting product. Apply next week.",
  "updatedAt": "2025-11-13T14:00:00Z",
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status value
- `404 Not Found` - Job doesn't exist

---

## 4. System Flow Summary

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTP (Server-Rendered Pages)
       │
┌──────▼──────────────────────────────────┐
│         Next.js App (Server)            │
│  ┌────────────────────────────────────┐ │
│  │   Pages (Server Components)        │ │
│  │   - /config (Profile & Agent)      │ │
│  │   - /      (Dashboard)             │ │
│  │   - /jobs/[id] (Job Detail)        │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │   API Routes                       │ │
│  │   - /api/profile                   │ │
│  │   - /api/agent-config              │ │
│  │   - /api/search                    │ │
│  │   - /api/jobs                      │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │   Business Logic                   │ │
│  │   - Search Agent (query gen)       │ │
│  │   - Job Scorer (LLM ranking)       │ │
│  │   - Search Orchestrator            │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │   Database Layer (SQLite)          │ │
│  │   - profiles, agent_configs        │ │
│  │   - jobs, search_runs              │ │
│  └────────────────────────────────────┘ │
└────────┬────────────────────┬───────────┘
         │                    │
         │                    │
    ┌────▼─────┐        ┌─────▼──────────┐
    │ Claude   │        │ Google Custom  │
    │   API    │        │   Search API   │
    └──────────┘        └────────────────┘
```

---

## 5. Implementation Notes

### 5.1 Next.js Server Components Approach

- **All pages are Server Components by default** (no `"use client"`)
- **Data fetching happens in components** (async functions)
- **Forms use Server Actions** (functions with `'use server'` directive)
- **No client-side state management needed** for MVP

Example pattern:
```tsx
// app/config/page.tsx
async function updateProfile(formData: FormData) {
  'use server'
  const profile = parseFormData(formData)
  await db.updateProfile(profile)
  revalidatePath('/config')
}

export default async function ConfigPage() {
  const profile = await db.getProfile()
  return <form action={updateProfile}>
    {/* form fields */}
  </form>
}
```

### 5.2 Database Client Pattern

Use better-sqlite3 with singleton pattern:

```typescript
// lib/db/client.ts
import Database from 'better-sqlite3'

const db = new Database('jobs.db')
db.pragma('journal_mode = WAL')

export default db
```

### 5.3 Error Handling Strategy

- API routes return appropriate HTTP status codes
- Server Actions can throw errors (Next.js shows error boundary)
- Display user-friendly messages in UI
- Log detailed errors server-side for debugging

### 5.4 LLM Call Optimization

- **Batch scoring**: Score multiple jobs in parallel with Promise.all()
- **Caching**: Consider caching scores by job URL to avoid re-scoring duplicates
- **Rate limiting**: Handle Claude API rate limits gracefully
- **Logging**: Log all LLM calls with token counts for cost tracking

### 5.5 Google Custom Search Quotas

- Free tier: 100 queries/day
- Each search run uses 5-7 queries
- Budget: ~10-15 searches/day
- Store raw results for debugging without re-fetching

---

## 6. Extension Points (Future)

### 6.1 Additional Job Sources

Create abstraction:
```typescript
interface JobSource {
  name: string
  search(criteria: Profile): Promise<RawJob[]>
  parse(raw: any): Job
}
```

Potential sources:
- LinkedIn Jobs API
- Y Combinator jobs board
- AngelList
- Company-specific career pages

### 6.2 Scheduling

- Add cron job to run searches daily
- Store results and email digest
- Track new jobs since last run

### 6.3 Multi-User Support

- Add authentication (NextAuth.js)
- Add user_id foreign key to all tables
- Row-level security for data isolation

---

**End of Technical Design Document**

This document serves as the single source of truth for implementation. All code should align with these data flows, models, and API contracts.
