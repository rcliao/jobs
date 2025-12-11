import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile, createProfile } from '@/lib/db/queries'
import { defaultProfile } from '@/config/default-profile'
import type { UpdateProfileRequest } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || 'default'

    const profile = getProfile(id)

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') || 'default'

    const data: UpdateProfileRequest = await request.json()

    // Basic validation
    if (!data.targetRole || !data.technicalSkills) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if profile exists, if not create it first
    const existing = getProfile(id)
    if (!existing) {
      createProfile(defaultProfile, id)
    }

    const profile = updateProfile(data, id)

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
