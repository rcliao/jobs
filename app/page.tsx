import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { listJobs } from '@/lib/db/queries'
import { JobCard } from '@/components/job-card'
import { executeSearch } from '@/lib/agent/researcher'

// Server Action to trigger search
async function runSearch() {
  'use server'

  try {
    // Call search execution directly (no HTTP request needed)
    await executeSearch()

    revalidatePath('/')
    redirect('/?search=complete')
  } catch (error: any) {
    // Don't catch NEXT_REDIRECT errors - they're expected
    if (error.message === 'NEXT_REDIRECT') {
      throw error
    }

    console.error('Search action error:', error)
    revalidatePath('/')
    redirect('/?search=error')
  }
}

export default async function Dashboard({
  searchParams
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams

  // Fetch jobs from database
  const { jobs, total } = listJobs({
    status: params.status,
    limit: 100
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Job Search Dashboard</h1>
          <div className="flex gap-3">
            <form action={runSearch}>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium"
              >
                🔍 Run Search
              </button>
            </form>
            <a
              href="/config"
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
            >
              ⚙️ Configuration
            </a>
            <a
              href="/about"
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium"
            >
              ℹ️ About
            </a>
          </div>
        </div>

        {/* Search Status Messages */}
        {params.search === 'complete' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ Search completed successfully! Check the jobs list below.</p>
          </div>
        )}
        {params.search === 'error' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">✗ Search failed. Please check your API keys and try again.</p>
          </div>
        )}

        {/* Job Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Job Leads</h2>
              <p className="text-gray-600">
                {total === 0
                  ? 'No jobs found yet. Click "Run Search" to get started!'
                  : `Showing ${jobs.length} of ${total} jobs`}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{listJobs({ status: 'new' }).total}</div>
                <div className="text-sm text-gray-600">New</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{listJobs({ status: 'saved' }).total}</div>
                <div className="text-sm text-gray-600">Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{listJobs({ status: 'applied' }).total}</div>
                <div className="text-sm text-gray-600">Applied</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <a
            href="/"
            className={`px-4 py-2 rounded-md font-medium ${
              !params.status
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Jobs
          </a>
          <a
            href="/?status=new"
            className={`px-4 py-2 rounded-md font-medium ${
              params.status === 'new'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            New
          </a>
          <a
            href="/?status=saved"
            className={`px-4 py-2 rounded-md font-medium ${
              params.status === 'saved'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Saved
          </a>
          <a
            href="/?status=applied"
            className={`px-4 py-2 rounded-md font-medium ${
              params.status === 'applied'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Applied
          </a>
          <a
            href="/?status=dismissed"
            className={`px-4 py-2 rounded-md font-medium ${
              params.status === 'dismissed'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dismissed
          </a>
        </div>

        {/* Job List */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              {params.status
                ? `No jobs with status "${params.status}"`
                : 'No jobs found yet'}
            </p>
            <p className="text-gray-500 mb-6">
              Click the "🔍 Run Search" button above to find job opportunities that match your profile.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
