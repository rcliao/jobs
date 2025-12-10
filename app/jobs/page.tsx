'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useProfile } from '@/lib/context/profile-context'
import { JobCard } from '@/components/job-card'
import type { Job } from '@/types'

interface Stats {
  total: number
  new: number
  saved: number
  applied: number
}

function LegacyJobsDashboardContent() {
  const { profileId, isLoading: profileLoading } = useProfile()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') || undefined
  const searchResult = searchParams.get('search')

  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, saved: 0, applied: 0 })
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileLoading) {
      loadJobs()
    }
  }, [profileId, profileLoading, statusFilter])

  async function loadJobs() {
    setLoading(true)
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : ''
      const response = await fetch(`/api/jobs?profileId=${encodeURIComponent(profileId)}&limit=100${statusParam}`)
      const data = await response.json()
      setJobs(data.jobs || [])

      // Fetch counts for stats
      const [newRes, savedRes, appliedRes] = await Promise.all([
        fetch(`/api/jobs?profileId=${encodeURIComponent(profileId)}&status=new&limit=1`),
        fetch(`/api/jobs?profileId=${encodeURIComponent(profileId)}&status=saved&limit=1`),
        fetch(`/api/jobs?profileId=${encodeURIComponent(profileId)}&status=applied&limit=1`)
      ])
      const [newData, savedData, appliedData] = await Promise.all([
        newRes.json(),
        savedRes.json(),
        appliedRes.json()
      ])

      setStats({
        total: data.total || 0,
        new: newData.total || 0,
        saved: savedData.total || 0,
        applied: appliedData.total || 0
      })
    } catch (err) {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  async function runSearch() {
    setSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })

      const result = await response.json()
      if (response.ok) {
        await loadJobs()
      } else {
        setError(result.error || 'Search failed')
      }
    } catch (err) {
      setError('Search failed. Please check your API keys and try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Deprecation Notice */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 font-medium">
            This job search view is being phased out. Please use the new{' '}
            <Link href="/" className="underline hover:text-amber-900">Company Discovery</Link>{' '}
            flow for a better experience finding opportunities before they're posted.
          </p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Job Search (Legacy)</h1>
          <button
            onClick={runSearch}
            disabled={searching || profileLoading}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? 'Searching...' : 'Run Search'}
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}
        {searchResult === 'complete' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Search completed successfully! Check the jobs list below.</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading jobs...</p>
          </div>
        ) : (
          <>
            {/* Job Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">Job Leads</h2>
                  <p className="text-gray-600">
                    {stats.total === 0
                      ? 'No jobs found yet. Click "Run Search" to get started!'
                      : `Showing ${jobs.length} of ${stats.total} jobs`}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                    <div className="text-sm text-gray-600">New</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.saved}</div>
                    <div className="text-sm text-gray-600">Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.applied}</div>
                    <div className="text-sm text-gray-600">Applied</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Link
                href="/jobs"
                className={`px-4 py-2 rounded-md font-medium ${!statusFilter ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                All Jobs
              </Link>
              <Link
                href="/jobs?status=new"
                className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'new' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                New
              </Link>
              <Link
                href="/jobs?status=saved"
                className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'saved' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Saved
              </Link>
              <Link
                href="/jobs?status=applied"
                className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'applied' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Applied
              </Link>
              <Link
                href="/jobs?status=dismissed"
                className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'dismissed' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Dismissed
              </Link>
            </div>

            {/* Job List */}
            {jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg mb-4">
                  {statusFilter ? `No jobs with status "${statusFilter}"` : 'No jobs found yet'}
                </p>
                <p className="text-gray-500 mb-6">
                  Click the "Run Search" button above to find job opportunities that match your profile.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function LegacyJobsDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LegacyJobsDashboardContent />
    </Suspense>
  )
}
