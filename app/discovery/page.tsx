'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { CompanyDiscoveryRun } from '@/types'

export default function DiscoveryPage() {
  const [runs, setRuns] = useState<CompanyDiscoveryRun[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load discovery runs
  useEffect(() => {
    loadRuns()
  }, [])

  async function loadRuns() {
    try {
      const response = await fetch('/api/discovery')
      const data = await response.json()
      setRuns(data.runs || [])
    } catch (err) {
      setError('Failed to load discovery runs')
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
          maxCompanies: 10,
          researchBatchSize: 3
        })
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        // Reload runs
        await loadRuns()
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Discovery</h1>
            <p className="text-gray-600 mt-1">
              Find companies matching your profile preferences
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium"
            >
              Home
            </Link>
            <Link
              href="/companies"
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 font-medium"
            >
              Companies
            </Link>
            <button
              onClick={startDiscovery}
              disabled={starting}
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
            <p className="text-gray-600">Loading discovery history...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Discoveries Yet</h2>
            <p className="text-gray-600 mb-6">
              Click "Discover Companies" to find companies matching your profile.
            </p>
            <Link href="/config" className="text-blue-600 hover:text-blue-800">
              Configure your profile first →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discovered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Researched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {run.companiesDiscovered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {run.companiesResearched}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/discovery/${run.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Results →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Discovery Works</h3>
          <ol className="text-blue-800 text-sm space-y-2">
            <li>1. Generates search queries based on your profile (industries, skills, company stage)</li>
            <li>2. Searches funding news, tech blogs, and job boards for matching companies</li>
            <li>3. Researches each company for signals (funding, culture, tech stack, leadership)</li>
            <li>4. Discovers key contacts (founders, recruiters, hiring managers)</li>
            <li>5. Analyzes fit between your profile and each company</li>
            <li>6. Ranks companies and generates personalized outreach strategies</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
