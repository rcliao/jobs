'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useProfile } from '@/lib/context/profile-context'
import type { Profile } from '@/types'

function ConfigPageContent() {
  const { profileId, isLoading: profileLoading, refreshProfile } = useProfile()
  const searchParams = useSearchParams()
  const savedParam = searchParams.get('saved')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(savedParam === 'profile' ? 'Profile saved successfully!' : null)

  useEffect(() => {
    if (!profileLoading) {
      loadConfig()
    }
  }, [profileId, profileLoading])

  async function loadConfig() {
    setLoading(true)
    try {
      const profileRes = await fetch(`/api/profile?id=${encodeURIComponent(profileId)}`)

      if (profileRes.ok) {
        setProfile(await profileRes.json())
      }
    } catch {
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    const profileData = {
      targetRole: formData.get('targetRole') as string,
      technicalSkills: {
        primary: formData.get('primarySkills')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
        secondary: formData.get('secondarySkills')?.toString().split(',').map(s => s.trim()).filter(Boolean) || []
      },
      company: {
        stage: formData.get('companyStage')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
        industry: formData.get('industry')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
        sizeRange: formData.get('sizeRange') as string
      },
      location: {
        preferences: formData.get('locationPrefs')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
        remoteOk: formData.get('remoteOk') === 'on'
      },
      avoid: formData.get('avoid')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
      mustHave: formData.get('mustHave')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
      includedSites: formData.get('includedSites')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
      excludedSites: formData.get('excludedSites')?.toString().split(',').map(s => s.trim()).filter(Boolean) || []
    }

    try {
      const response = await fetch(`/api/profile?id=${encodeURIComponent(profileId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        setProfile(await response.json())
        setSuccess('Profile saved successfully!')
        refreshProfile()
      } else {
        setError('Failed to save profile')
      }
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Configuration</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Profile not found. Please run database seed.</p>
            <code className="text-sm text-red-600">npm run db:seed</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
            <p className="text-gray-600 mt-1">Editing profile: <span className="font-medium">{profileId}</span></p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Discovery Profile</h2>
          <p className="text-gray-600 text-sm mb-6">Define criteria for discovering and scoring companies</p>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label htmlFor="targetRole" className="block text-sm font-medium text-gray-700 mb-1">
                Focus Area
              </label>
              <input
                type="text"
                id="targetRole"
                name="targetRole"
                defaultValue={profile.targetRole}
                placeholder="e.g., Software Engineering, Product Management, Sales"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
              <p className="mt-1 text-xs text-gray-500">The domain or function you&apos;re interested in</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primarySkills" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Technologies / Skills
                </label>
                <input
                  type="text"
                  id="primarySkills"
                  name="primarySkills"
                  defaultValue={profile.technicalSkills.primary.join(', ')}
                  placeholder="TypeScript, Go, React, AI/ML"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Core technologies to match against company tech stacks</p>
              </div>
              <div>
                <label htmlFor="secondarySkills" className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Technologies / Skills
                </label>
                <input
                  type="text"
                  id="secondarySkills"
                  name="secondarySkills"
                  defaultValue={profile.technicalSkills.secondary.join(', ')}
                  placeholder="Python, Docker, Kubernetes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">Nice-to-have technologies for scoring</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyStage" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Stage
                </label>
                <input
                  type="text"
                  id="companyStage"
                  name="companyStage"
                  defaultValue={profile.company.stage.join(', ')}
                  placeholder="Series A, Series B"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  defaultValue={profile.company.industry.join(', ')}
                  placeholder="GenAI, SaaS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sizeRange" className="block text-sm font-medium text-gray-700 mb-1">
                Company Size Range
              </label>
              <input
                type="text"
                id="sizeRange"
                name="sizeRange"
                defaultValue={profile.company.sizeRange}
                placeholder="20-200"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="locationPrefs" className="block text-sm font-medium text-gray-700 mb-1">
                Location Preferences
              </label>
              <input
                type="text"
                id="locationPrefs"
                name="locationPrefs"
                defaultValue={profile.location.preferences.join(', ')}
                placeholder="Remote, SF Bay Area"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="remoteOk"
                    defaultChecked={profile.location.remoteOk}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Remote OK</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="mustHave" className="block text-sm font-medium text-gray-700 mb-1">
                Must Have Keywords (comma-separated)
              </label>
              <input
                type="text"
                id="mustHave"
                name="mustHave"
                defaultValue={profile.mustHave.join(', ')}
                placeholder="remote-friendly, series-b, hiring"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Companies must match at least one of these keywords</p>
            </div>

            <div>
              <label htmlFor="avoid" className="block text-sm font-medium text-gray-700 mb-1">
                Exclude Keywords (comma-separated)
              </label>
              <input
                type="text"
                id="avoid"
                name="avoid"
                defaultValue={profile.avoid.join(', ')}
                placeholder="blockchain, crypto, consultancy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Filter out companies with these keywords</p>
            </div>

            <div>
              <label htmlFor="includedSites" className="block text-sm font-medium text-gray-700 mb-1">
                Prioritized Sources (comma-separated)
              </label>
              <input
                type="text"
                id="includedSites"
                name="includedSites"
                defaultValue={profile.includedSites?.join(', ') || ''}
                placeholder="techcrunch.com, crunchbase.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Prioritize results from these domains</p>
            </div>

            <div>
              <label htmlFor="excludedSites" className="block text-sm font-medium text-gray-700 mb-1">
                Excluded Sources (comma-separated)
              </label>
              <input
                type="text"
                id="excludedSites"
                name="excludedSites"
                defaultValue={profile.excludedSites?.join(', ') || ''}
                placeholder="example.com, spam-site.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Never include results from these domains</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Unknown'}
        </div>
      </div>
    </div>
  )
}

export default function ConfigPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ConfigPageContent />
    </Suspense>
  )
}
