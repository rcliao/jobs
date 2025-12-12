'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useProfile } from '@/lib/context/profile-context'
import type { Company } from '@/types'

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'researched':
      return 'bg-green-100 text-green-800'
    case 'running':
      return 'bg-blue-100 text-blue-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 8) return 'text-green-600'
  if (score >= 6) return 'text-yellow-600'
  if (score >= 4) return 'text-orange-600'
  return 'text-red-600'
}

interface Stats {
  total: number
  pending: number
  researched: number
  running: number
}

function CompaniesPageContent() {
  const { profileId, isLoading: profileLoading } = useProfile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusFilter = searchParams.get('status') || undefined

  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, researched: 0, running: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [adding, setAdding] = useState(false)
  const [researchingId, setResearchingId] = useState<string | null>(null)

  useEffect(() => {
    if (!profileLoading) {
      loadCompanies()
    }
  }, [profileId, profileLoading, statusFilter])

  async function loadCompanies() {
    setLoading(true)
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : ''
      const response = await fetch(`/api/companies?profileId=${encodeURIComponent(profileId)}&limit=100${statusParam}`)
      const data = await response.json()
      setCompanies(data.companies || [])

      // Fetch counts for stats
      const [pendingRes, researchedRes, runningRes] = await Promise.all([
        fetch(`/api/companies?profileId=${encodeURIComponent(profileId)}&status=pending&limit=1`),
        fetch(`/api/companies?profileId=${encodeURIComponent(profileId)}&status=researched&limit=1`),
        fetch(`/api/companies?profileId=${encodeURIComponent(profileId)}&status=running&limit=1`)
      ])
      const [pendingData, researchedData, runningData] = await Promise.all([
        pendingRes.json(),
        researchedRes.json(),
        runningRes.json()
      ])

      setStats({
        total: pendingData.total + researchedData.total + runningData.total,
        pending: pendingData.total,
        researched: researchedData.total,
        running: runningData.total
      })
    } catch (err) {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  async function addCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || companyName.trim().length < 2) {
      setError('Please enter a valid company name (at least 2 characters)')
      return
    }

    setAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName.trim(),
          profileId,
          triggerResearchNow: true
        })
      })

      const company = await response.json()
      if (response.ok) {
        setCompanyName('')
        router.push(`/companies/${company.id}?researching=true`)
      } else {
        setError(company.error || 'Failed to add company')
      }
    } catch (err) {
      setError('Failed to add company')
    } finally {
      setAdding(false)
    }
  }

  async function triggerResearch(companyId: string, companyName: string) {
    setResearchingId(companyId)
    try {
      await fetch(`/api/companies/${companyId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })
      router.push(`/companies/${companyId}?researching=true`)
    } catch (err) {
      setError(`Failed to start research for ${companyName}`)
    } finally {
      setResearchingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Company Research</h1>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Add Company Form */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Add Company to Research</h2>
          <form onSubmit={addCompany} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name (e.g., Stripe, Airbnb)"
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={2}
            />
            <button
              type="submit"
              disabled={adding || profileLoading}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {adding ? 'Adding...' : 'Add & Research'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading companies...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">Companies</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    {stats.total === 0
                      ? 'No companies yet. Add one above to start researching!'
                      : `Showing ${companies.length} of ${stats.total} companies`}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-4">
                  <Link href="/companies" className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.total}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total</div>
                  </Link>
                  <Link href="/companies?status=researched" className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.researched}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Researched</div>
                  </Link>
                  <Link href="/companies?status=running" className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.running}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Running</div>
                  </Link>
                  <Link href="/companies?status=pending" className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-gray-500">{stats.pending}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Pending</div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
              <Link
                href="/companies"
                className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base whitespace-nowrap ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                All
              </Link>
              <Link
                href="/companies?status=researched"
                className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base whitespace-nowrap ${statusFilter === 'researched' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Researched
              </Link>
              <Link
                href="/companies?status=running"
                className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base whitespace-nowrap ${statusFilter === 'running' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Running
              </Link>
              <Link
                href="/companies?status=pending"
                className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base whitespace-nowrap ${statusFilter === 'pending' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              >
                Pending
              </Link>
            </div>

            {/* Company List */}
            <div className="space-y-3 sm:space-y-4">
              {companies.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center text-gray-500">
                  No companies found. Add a company above to get started.
                </div>
              ) : (
                companies.map(company => (
                  <div key={company.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <Link href={`/companies/${company.id}`} className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-blue-600 truncate">
                            {company.name}
                          </Link>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(company.researchStatus)}`}>
                            {company.researchStatus}
                          </span>
                          {company.overallScore !== null && (
                            <span className={`text-base sm:text-lg font-bold ${getScoreColor(company.overallScore)}`}>
                              {company.overallScore}/10
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                          {company.industry && <span>Industry: {company.industry}</span>}
                          {company.sizeEstimate && <span>Size: {company.sizeEstimate}</span>}
                          {company.headquarters && <span>HQ: {company.headquarters}</span>}
                        </div>
                        {company.lastResearchedAt && (
                          <div className="text-xs text-gray-400 mt-2">
                            Last researched: {new Date(company.lastResearchedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                          href={`/companies/${company.id}`}
                          className="bg-gray-100 text-gray-700 py-2 px-3 sm:px-4 rounded-md hover:bg-gray-200 font-medium text-sm flex-1 sm:flex-none text-center"
                        >
                          View Details
                        </Link>
                        {company.researchStatus !== 'running' && (
                          <button
                            onClick={() => triggerResearch(company.id, company.name)}
                            disabled={researchingId === company.id}
                            className="bg-blue-100 text-blue-700 py-2 px-3 sm:px-4 rounded-md hover:bg-blue-200 font-medium text-sm disabled:opacity-50 flex-1 sm:flex-none"
                          >
                            {researchingId === company.id ? 'Starting...' : 'Re-research'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CompaniesPageContent />
    </Suspense>
  )
}
