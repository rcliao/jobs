#!/usr/bin/env tsx
import { getDb } from './client'
import { ALL_TABLES, ALL_INDEXES } from './schema'

// Check if a column exists in a table
function columnExists(db: ReturnType<typeof getDb>, tableName: string, columnName: string): boolean {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]
  return result.some(col => col.name === columnName)
}

// Migration: Add profile_id to tables for multi-profile support
function migrateAddProfileId(db: ReturnType<typeof getDb>) {
  console.log('Running migration: add profile_id columns...')

  const tablesToMigrate = [
    'search_runs',
    'jobs',
    'companies',
    'company_research_runs',
    'company_signals',
    'contacts'
  ]

  for (const table of tablesToMigrate) {
    if (!columnExists(db, table, 'profile_id')) {
      console.log(`  Adding profile_id to ${table}...`)
      db.exec(`ALTER TABLE ${table} ADD COLUMN profile_id TEXT DEFAULT 'default'`)
      db.exec(`UPDATE ${table} SET profile_id = 'default' WHERE profile_id IS NULL`)
    }
  }

  // Create indexes for profile_id columns
  const profileIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_search_runs_profile ON search_runs(profile_id);',
    'CREATE INDEX IF NOT EXISTS idx_jobs_profile ON jobs(profile_id);',
    'CREATE INDEX IF NOT EXISTS idx_companies_profile ON companies(profile_id);',
    'CREATE INDEX IF NOT EXISTS idx_company_research_runs_profile ON company_research_runs(profile_id);',
    'CREATE INDEX IF NOT EXISTS idx_company_signals_profile ON company_signals(profile_id);',
    'CREATE INDEX IF NOT EXISTS idx_contacts_profile ON contacts(profile_id);'
  ]

  for (const indexSql of profileIndexes) {
    db.exec(indexSql)
  }

  // Handle companies table unique constraint change (name must be unique per profile)
  // SQLite doesn't support adding constraints to existing tables, but we can create a unique index
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_profile ON companies(name, profile_id);')

  console.log('✓ Profile ID migration complete')
}

async function runMigrations() {
  console.log('Running database migrations...')

  const db = getDb()

  try {
    // Create tables
    for (const tableSchema of ALL_TABLES) {
      db.exec(tableSchema)
    }

    console.log('✓ Tables created')

    // Create indexes
    for (const indexSql of ALL_INDEXES) {
      db.exec(indexSql)
    }

    console.log('✓ Indexes created')

    // Run profile_id migration
    migrateAddProfileId(db)

    console.log('Database migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
