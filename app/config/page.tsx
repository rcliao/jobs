'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useProfile } from '@/lib/context/profile-context'
import type { Profile, AgentConfig } from '@/types'

function ConfigPageContent() {
  const { profileId, profile: contextProfile, isLoading: profileLoading, refreshProfile } = useProfile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const savedParam = searchParams.get('saved')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(savedParam === 'profile' ? 'Profile saved successfully!' : savedParam === 'agent' ? 'Agent configuration saved successfully!' : null)

  useEffect(() => {
    if (!profileLoading) {
      loadConfig()
    }
  }, [profileId, profileLoading])

  async function loadConfig() {
    setLoading(true)
    try {
      const [profileRes, agentRes] = await Promise.all([
        fetch(`/api/profile?id=${encodeURIComponent(profileId)}`),
        fetch('/api/agent-config')
      ])

      if (profileRes.ok) {
        setProfile(await profileRes.json())
      }
      if (agentRes.ok) {
        setAgentConfig(await agentRes.json())
      }
    } catch (err) {
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving('profile')
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    const profileData = {
      targetRole: formData.get('targetRole') as string,
      seniority: formData.get('seniority')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
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
      compensation: {
        minimum: parseInt(formData.get('minComp') as string) || 0,
        target: parseInt(formData.get('targetComp') as string) || 0
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
    } catch (err) {
      setError('Failed to save profile')
    } finally {
      setSaving(null)
    }
  }

  async function handleAgentConfigSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving('agent')
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)

    const configData = {
      systemPrompt: formData.get('systemPrompt') as string,
      searchPatterns: formData.get('searchPatterns')?.toString().split('\n').map(s => s.trim()).filter(Boolean),
      version: formData.get('version') as string
    }

    try {
      const response = await fetch('/api/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      })

      if (response.ok) {
        setAgentConfig(await response.json())
        setSuccess('Agent configuration saved successfully!')
      } else {
        setError('Failed to save agent config')
      }
    } catch (err) {
      setError('Failed to save agent config')
    } finally {
      setSaving(null)
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

  if (!profile || !agentConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Configuration</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Configuration data not found. Please run database seed.</p>
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Job Search Profile</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label htmlFor="targetRole" className="block text-sm font-medium text-gray-700 mb-1">
                Target Role
              </label>
              <input
                type="text"
                id="targetRole"
                name="targetRole"
                defaultValue={profile.targetRole}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="seniority" className="block text-sm font-medium text-gray-700 mb-1">
                Seniority Levels (comma-separated)
              </label>
              <input
                type="text"
                id="seniority"
                name="seniority"
                defaultValue={profile.seniority.join(', ')}
                placeholder="Staff, Senior, Principal"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primarySkills" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Technical Skills
                </label>
                <input
                  type="text"
                  id="primarySkills"
                  name="primarySkills"
                  defaultValue={profile.technicalSkills.primary.join(', ')}
                  placeholder="TypeScript, Go, React"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label htmlFor="secondarySkills" className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Technical Skills
                </label>
                <input
                  type="text"
                  id="secondarySkills"
                  name="secondarySkills"
                  defaultValue={profile.technicalSkills.secondary.join(', ')}
                  placeholder="Python, Docker"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minComp" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Compensation ($)
                </label>
                <input
                  type="number"
                  id="minComp"
                  name="minComp"
                  defaultValue={profile.compensation.minimum}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="targetComp" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Compensation ($)
                </label>
                <input
                  type="number"
                  id="targetComp"
                  name="targetComp"
                  defaultValue={profile.compensation.target}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mustHave" className="block text-sm font-medium text-gray-700 mb-1">
                Must Have (comma-separated)
              </label>
              <input
                type="text"
                id="mustHave"
                name="mustHave"
                defaultValue={profile.mustHave.join(', ')}
                placeholder="remote-friendly, equity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="avoid" className="block text-sm font-medium text-gray-700 mb-1">
                Keywords to Avoid (comma-separated)
              </label>
              <input
                type="text"
                id="avoid"
                name="avoid"
                defaultValue={profile.avoid.join(', ')}
                placeholder="blockchain, crypto, consultancy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="includedSites" className="block text-sm font-medium text-gray-700 mb-1">
                Included Sites (prioritize these)
              </label>
              <input
                type="text"
                id="includedSites"
                name="includedSites"
                defaultValue={profile.includedSites?.join(', ') || ''}
                placeholder="greenhouse.io, lever.co"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="excludedSites" className="block text-sm font-medium text-gray-700 mb-1">
                Excluded Sites (do not include)
              </label>
              <input
                type="text"
                id="excludedSites"
                name="excludedSites"
                defaultValue={profile.excludedSites?.join(', ') || ''}
                placeholder="example.com, bad-site.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving === 'profile'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === 'profile' ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Agent Config Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agent Configuration</h2>
          <form onSubmit={handleAgentConfigSubmit} className="space-y-6">
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                Config Version
              </label>
              <input
                type="text"
                id="version"
                name="version"
                defaultValue={agentConfig.version}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <textarea
                id="systemPrompt"
                name="systemPrompt"
                rows={15}
                defaultValue={agentConfig.systemPrompt}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Define how the AI should generate queries and score jobs
              </p>
            </div>

            <div>
              <label htmlFor="searchPatterns" className="block text-sm font-medium text-gray-700 mb-1">
                Search Patterns (optional, one per line)
              </label>
              <textarea
                id="searchPatterns"
                name="searchPatterns"
                rows={4}
                defaultValue={agentConfig.searchPatterns?.join('\n') || ''}
                placeholder="site:greenhouse.io OR site:lever.co"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving === 'agent'}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving === 'agent' ? 'Saving...' : 'Save Agent Config'}
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
