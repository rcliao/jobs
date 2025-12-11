# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beacon** - Company Intelligence. An AI-powered tool that discovers companies matching your criteria and performs deep research on signals (funding, culture, tech stack, leadership, hiring activity) and key contacts. Uses Gemini AI for discovery and analysis, Google Custom Search API for company discovery, and SQLite for persistence.

Core value prop: "Turn company signals into actionable insights" - useful for job seekers, networkers, recruiters, and sales/BD professionals.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Build for production (runs db:init first)
npm run lint         # Run ESLint

# Database
npm run db:init      # Initialize database and run migrations
npm run db:migrate   # Run migrations only
npm run db:seed      # Seed database with default data

# Run a single test file
npx tsx lib/utils/text-processing.test.ts
```

## Architecture

### Data Flow

1. **Company Discovery**: User triggers discovery → LangGraph workflow → Gemini generates queries → Google CSE finds companies → Gemini researches signals → SQLite stores companies
2. **Company Research**: For each company → AI agents gather signals (funding, culture, tech, leadership, hiring) → Identify key contacts → Score fit against profile
3. **Company Management**: Dashboard displays companies from SQLite → User actions update status via Server Actions

### Key Components

**Agent Layer** (`lib/agent/`)
- `graph.ts` - LangGraph state graph defining the search workflow (lead_agent → job_search nodes)
- `researcher.ts` - Core search orchestration: `executeSearch()` (entry point using graph) and `performSearch()` (actual search logic)
- `gemini.ts` - Gemini AI integration: `generateSearchQueries()` and `batchScoreJobs()`

**Database Layer** (`lib/db/`)
- `client.ts` - SQLite singleton using better-sqlite3 with WAL mode
- `schema.ts` - Table definitions: profiles, agent_configs, search_runs, jobs
- `queries.ts` - CRUD operations with row-to-type transformations (ProfileRow → Profile, etc.)

**Search Layer** (`lib/search/`)
- `google.ts` - Google Custom Search wrapper with parallel query execution and URL-based deduplication

**API Routes** (`app/api/`)
- Profile and agent config: GET/PUT for single-user settings (id="default")
- Jobs: list with filters, get by id, update status/notes
- Search: triggers `executeSearch()` workflow

### Database Schema

Four main tables: `profiles` (search criteria), `agent_configs` (LLM prompts), `search_runs` (execution history), `jobs` (discovered jobs with scores). Complex fields stored as JSON strings, parsed in queries.ts.

### Types

All TypeScript types in `types/index.ts`. Key interfaces: `Profile`, `AgentConfig`, `Job`, `SearchRun`. Corresponding `*Row` types for database representation.

### Company Research System (`lib/agent/company-research/`)

Multi-agent LangGraph workflow for deep company research:
- `graph.ts` - StateGraph with orchestrator → signal_worker/contact_worker → synthesizer nodes
- `state.ts` - LangGraph state with reducers for accumulating signals/contacts
- `trigger.ts` - Entry points: `triggerCompanyResearch()`, `queueCompaniesFromJobs()`
- `gemini-research.ts` - AI analysis functions wrapped with LangSmith tracing
- `nodes/` - Individual agent nodes (orchestrator, signal-worker, contact-worker, synthesizer)

**Signal Categories**: growth_funding, culture_work_style, tech_stack_engineering, leadership_changes
**Contact Types**: founder, executive, director, manager, team_lead, hiring_manager, recruiter

## Environment Variables

Required in `.env.local`:
- `GOOGLE_API_KEY` - For Gemini AI and Custom Search
- `GOOGLE_SEARCH_ENGINE_ID` - Custom Search Engine ID

Optional (for LangSmith tracing):
- `LANGCHAIN_TRACING_V2=true` - Enable LangSmith tracing
- `LANGCHAIN_API_KEY` - Your LangSmith API key
- `LANGCHAIN_PROJECT` - Project name (default: beacon-company-research)
