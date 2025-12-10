'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { CompanyDiscoveryRun, Company } from '@/types'
import { useProfile } from '@/lib/context/profile-context'

interface DashboardData {
  recentRuns: CompanyDiscoveryRun[]
  topCompanies: Company[]
  stats: {
    totalCompanies: number
    totalResearched: number
    totalDiscoveryRuns: number
  }
}

export default function CompanyDiscoveryDashboard() {
  const { profileId, isLoading: profileLoading } = useProfile()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileLoading) {
      loadDashboard()
    }
  }, [profileId, profileLoading])

  async function loadDashboard() {
    setLoading(true)
    try {
      // Fetch discovery runs and companies in parallel (filtered by profileId)
      const [runsResponse, companiesResponse] = await Promise.all([
        fetch(`/api/discovery?profileId=${encodeURIComponent(profileId)}`),
        fetch(`/api/companies?profileId=${encodeURIComponent(profileId)}&limit=5&status=researched`)
      ])

      const runsData = await runsResponse.json()
      const companiesData = await companiesResponse.json()

      setData({
        recentRuns: (runsData.runs || []).slice(0, 5),
        topCompanies: companiesData.companies || [],
        stats: {
          totalCompanies: companiesData.total || 0,
          totalResearched: companiesData.companies?.length || 0,
          totalDiscoveryRuns: runsData.runs?.length || 0
        }
      })
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function startDiscovery() {
    setStarting(true)
    setError(null)

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          maxCompanies: 10,
          researchBatchSize: 3
        })
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        // Reload dashboard
        await loadDashboard()
      }
    } catch (err) {
      setError('Failed to start discovery')
    } finally {
      setStarting(false)
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      running: 'bg-blue-100 text-blue-800',
      discovering: 'bg-blue-100 text-blue-800',
      researching: 'bg-yellow-100 text-yellow-800',
      analyzing: 'bg-purple-100 text-purple-800',
      complete: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  function getScoreColor(score: number | null): string {
    if (!score) return 'text-gray-400'
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Discovery</h1>
            <p className="text-gray-600 mt-1">
              Find companies matching your profile before job postings go public
            </p>
          </div>
          <button
            onClick={startDiscovery}
            disabled={starting || profileLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {starting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Discovering...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover Companies
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-blue-600">{data?.stats.totalCompanies || 0}</div>
                <div className="text-gray-600">Total Companies</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-green-600">{data?.stats.totalResearched || 0}</div>
                <div className="text-gray-600">Fully Researched</div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-purple-600">{data?.stats.totalDiscoveryRuns || 0}</div>
                <div className="text-gray-600">Discovery Runs</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Recent Discovery Runs */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Recent Discoveries</h2>
                </div>
                {data?.recentRuns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No discoveries yet. Click "Discover Companies" to start!
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {data?.recentRuns.map(run => (
                      <Link
                        key={run.id}
                        href={`/discovery/${run.id}`}
                        className="block p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(run.startedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {run.companiesDiscovered} discovered, {run.companiesResearched} researched
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(run.status)}`}>
                            {run.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Companies */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Top Researched Companies</h2>
                  <Link href="/companies" className="text-blue-600 hover:text-blue-800 text-sm">
                    View all →
                  </Link>
                </div>
                {data?.topCompanies.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No companies researched yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {data?.topCompanies.map(company => (
                      <Link
                        key={company.id}
                        href={`/companies/${company.id}`}
                        className="block p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            <div className="text-xs text-gray-500">
                              {company.industry || 'Unknown industry'} • {company.sizeEstimate || 'Unknown size'}
                            </div>
                          </div>
                          <div className={`text-xl font-bold ${getScoreColor(company.overallScore)}`}>
                            {company.overallScore || '-'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* How it Works */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">How Company Discovery Works</h3>
              <div className="grid grid-cols-3 gap-6 text-sm text-blue-800">
                <div>
                  <div className="font-medium mb-1">1. Find Companies</div>
                  <p>Searches funding news, tech blogs, and industry sources based on your profile preferences.</p>
                </div>
                <div>
                  <div className="font-medium mb-1">2. Research Signals</div>
                  <p>Gathers 5 signal types: funding, culture, tech stack, leadership changes, and job openings.</p>
                </div>
                <div>
                  <div className="font-medium mb-1">3. Rank & Connect</div>
                  <p>Scores companies on fit and discovers key contacts for networking outreach.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
