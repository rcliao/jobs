import { getDb } from './client'
import type {
  Profile,
  ProfileRow,
  UpdateProfileRequest
} from '@/types'

const db = getDb()

// Helper functions for type conversions
function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    targetRole: row.target_role,
    technicalSkills: JSON.parse(row.technical_skills),
    company: JSON.parse(row.company),
    location: JSON.parse(row.location),
    avoid: JSON.parse(row.avoid),
    mustHave: JSON.parse(row.must_have),
    includedSites: row.included_sites ? JSON.parse(row.included_sites) : [],
    excludedSites: row.excluded_sites ? JSON.parse(row.excluded_sites) : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Profile queries
export function getProfile(id: string = 'default'): Profile | null {
  const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?')
  const row = stmt.get(id) as ProfileRow | undefined

  return row ? rowToProfile(row) : null
}

export function getAllProfiles(): Profile[] {
  const stmt = db.prepare('SELECT * FROM profiles ORDER BY created_at')
  const rows = stmt.all() as ProfileRow[]
  return rows.map(rowToProfile)
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

  // Keep seniority and compensation columns in DB for backward compatibility, but use empty/default values
  stmt.run(
    id,
    data.targetRole,
    JSON.stringify([]),  // seniority - deprecated
    JSON.stringify(data.technicalSkills),
    JSON.stringify(data.company),
    JSON.stringify(data.location),
    JSON.stringify({ minimum: 0, target: 0 }),  // compensation - deprecated
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

  // Keep seniority and compensation columns in DB for backward compatibility, but use empty/default values
  const result = stmt.run(
    data.targetRole,
    JSON.stringify([]),  // seniority - deprecated
    JSON.stringify(data.technicalSkills),
    JSON.stringify(data.company),
    JSON.stringify(data.location),
    JSON.stringify({ minimum: 0, target: 0 }),  // compensation - deprecated
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

