import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile, updateProfile, getAgentConfig, updateAgentConfig } from '@/lib/db/queries'

// Server Action for updating profile
async function updateProfileAction(formData: FormData) {
  'use server'

  const profile = {
    targetRole: formData.get('targetRole') as string,
    seniority: formData.get('seniority')?.toString().split(',').map(s => s.trim()) || [],
    technicalSkills: {
      primary: formData.get('primarySkills')?.toString().split(',').map(s => s.trim()) || [],
      secondary: formData.get('secondarySkills')?.toString().split(',').map(s => s.trim()) || []
    },
    company: {
      stage: formData.get('companyStage')?.toString().split(',').map(s => s.trim()) || [],
      industry: formData.get('industry')?.toString().split(',').map(s => s.trim()) || [],
      sizeRange: formData.get('sizeRange') as string
    },
    location: {
      preferences: formData.get('locationPrefs')?.toString().split(',').map(s => s.trim()) || [],
      remoteOk: formData.get('remoteOk') === 'on'
    },
    compensation: {
      minimum: parseInt(formData.get('minComp') as string) || 0,
      target: parseInt(formData.get('targetComp') as string) || 0
    },
    avoid: formData.get('avoid')?.toString().split(',').map(s => s.trim()) || [],
    mustHave: formData.get('mustHave')?.toString().split(',').map(s => s.trim()) || [],
    includedSites: formData.get('includedSites')?.toString().split(',').map(s => s.trim()) || [],
    excludedSites: formData.get('excludedSites')?.toString().split(',').map(s => s.trim()) || []
  }

  updateProfile(profile)
  revalidatePath('/config')
  revalidatePath('/')
  redirect('/config?saved=profile')
}

// Server Action for updating agent config
async function updateAgentConfigAction(formData: FormData) {
  'use server'

  const config = {
    systemPrompt: formData.get('systemPrompt') as string,
    searchPatterns: formData.get('searchPatterns')?.toString().split('\n').map(s => s.trim()).filter(Boolean),
    version: formData.get('version') as string
  }

  updateAgentConfig(config)
  revalidatePath('/config')
  revalidatePath('/')
  redirect('/config?saved=agent')
}

export default async function ConfigPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  // Await searchParams (Next.js 16 requirement)
  const params = await searchParams

  const profile = getProfile()
  const agentConfig = getAgentConfig()

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
          <h1 className="text-3xl font-bold text-gray-900">Configuration</h1>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Success Messages */}
        {params.saved === 'profile' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ Profile saved successfully!</p>
          </div>
        )}
        {params.saved === 'agent' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ Agent configuration saved successfully!</p>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Job Search Profile</h2>
          <form action={updateProfileAction} className="space-y-6">
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
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* Agent Config Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Agent Configuration</h2>
          <form action={updateAgentConfigAction} className="space-y-6">
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
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
            >
              Save Agent Config
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {new Date(profile.updatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
