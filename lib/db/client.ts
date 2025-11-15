import Database from 'better-sqlite3'
import path from 'path'

// Singleton database connection
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './jobs.db'
    const fullPath = path.resolve(process.cwd(), dbPath)

    db = new Database(fullPath)

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL')

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    console.log(`Database connected: ${fullPath}`)
  }

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

// Export default instance
export default getDb()
