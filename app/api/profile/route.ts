import { NextRequest, NextResponse } from 'next/server'
import { getProfile, updateProfile } from '@/lib/db/queries'
import type { UpdateProfileRequest } from '@/types'

export async function GET() {
  try {
    const profile = getProfile()

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
    const data: UpdateProfileRequest = await request.json()

    // Basic validation
    if (!data.targetRole || !data.seniority || !data.technicalSkills) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const profile = updateProfile(data)

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
