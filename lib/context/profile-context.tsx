'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Profile } from '@/types'

interface ProfileContextType {
  profileId: string
  profile: Profile | null
  profiles: Profile[]
  isLoading: boolean
  setProfileId: (id: string) => void
  createProfile: (name: string) => Promise<Profile>
  refreshProfiles: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

const PROFILE_STORAGE_KEY = 'jobscout_profile_id'

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfileIdState] = useState<string>('default')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Load profile ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      setProfileIdState(stored)
    }
    setInitialized(true)
  }, [])

  // Fetch profiles list once on mount
  useEffect(() => {
    refreshProfiles()
  }, [])

  // Fetch current profile when profileId changes (and after initialization)
  useEffect(() => {
    if (initialized && profileId) {
      fetchProfile(profileId)
    }
  }, [profileId, initialized])

  async function fetchProfile(id: string) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/profile?id=${encodeURIComponent(id)}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      } else if (res.status === 404) {
        // Profile doesn't exist, create it with defaults
        const newProfile = await createProfile(id)
        setProfile(newProfile)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles')
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (profileId) {
      await fetchProfile(profileId)
    }
  }, [profileId])

  function setProfileId(id: string) {
    localStorage.setItem(PROFILE_STORAGE_KEY, id)
    setProfileIdState(id)
  }

  async function createProfile(name: string): Promise<Profile> {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: name })
    })

    if (!res.ok) {
      throw new Error('Failed to create profile')
    }

    const newProfile = await res.json()
    await refreshProfiles()
    return newProfile
  }

  return (
    <ProfileContext.Provider value={{
      profileId,
      profile,
      profiles,
      isLoading,
      setProfileId,
      createProfile,
      refreshProfiles,
      refreshProfile
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
