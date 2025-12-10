import { NextRequest, NextResponse } from 'next/server'
import { getAllProfiles, getProfile, createProfile } from '@/lib/db/queries'
import { defaultProfile } from '@/config/default-profile'

// GET /api/profiles - List all profiles
export async function GET() {
  try {
    const profiles = getAllProfiles()
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error listing profiles:', error)
    return NextResponse.json({ error: 'Failed to list profiles' }, { status: 500 })
  }
}

// POST /api/profiles - Create a new profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Sanitize profile ID (lowercase, no spaces, alphanumeric + dash)
    const sanitizedId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')

    if (sanitizedId.length < 2 || sanitizedId.length > 50) {
      return NextResponse.json({ error: 'Profile ID must be 2-50 characters' }, { status: 400 })
    }

    // Check if profile already exists
    const existing = getProfile(sanitizedId)
    if (existing) {
      return NextResponse.json(existing)
    }

    // Create with default values
    const profile = createProfile(defaultProfile, sanitizedId)
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
