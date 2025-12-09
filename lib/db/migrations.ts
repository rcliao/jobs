#!/usr/bin/env tsx
import { getDb } from './client'
import { ALL_TABLES, ALL_INDEXES } from './schema'

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

    console.log('Database migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
