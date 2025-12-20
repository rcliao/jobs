'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import type { CompanyDiscoveryRun, DiscoveredCompanyResult } from '@/types'

interface DiscoveryDetails {
  run: CompanyDiscoveryRun
  rankedCompanies: DiscoveredCompanyResult[]
  summary: {
    totalDiscovered: number
    totalResearched: number
    totalAnalyzed: number
  }
}

export default function DiscoveryDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [data, setData] = useState<DiscoveryDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadDiscovery()
  }, [id])

  async function loadDiscovery() {
    try {
      const response = await fetch(`/api/discovery/${id}`)
      if (!response.ok) {
        throw new Error('Discovery not found')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, companyId: string) {
    navigator.clipboard.writeText(text)
    setCopiedTemplate(companyId)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getScoreBgColor(score: number): string {
    if (score >= 8) return 'bg-green-100 text-green-800'
    if (score >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading discovery results...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error || 'Discovery not found'}</p>
            <Link href="/discovery" className="text-red-600 hover:text-red-800 mt-4 inline-block">
              ← Back to Discovery
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discovery Results</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              {new Date(data.run.startedAt).toLocaleString()} • {data.summary.totalDiscovered} discovered, {data.summary.totalResearched} researched
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="bg-gray-100 text-gray-700 py-2 px-3 sm:px-4 rounded-md hover:bg-gray-200 font-medium text-sm sm:text-base"
            >
              Home
            </Link>
            <Link
              href="/discovery"
              className="bg-purple-600 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-purple-700 font-medium text-sm sm:text-base"
            >
              All Discoveries
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{data.summary.totalDiscovered}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Companies Discovered</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{data.summary.totalResearched}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Fully Researched</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{data.summary.totalAnalyzed}</div>
            <div className="text-gray-600 text-xs sm:text-sm">Fit Analyzed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <div className="text-2xl sm:text-3xl font-bold text-gray-600">
              {data.rankedCompanies[0]?.fitAnalysis?.overallFitScore || '-'}
            </div>
            <div className="text-gray-600 text-xs sm:text-sm">Top Fit Score</div>
          </div>
        </div>

        {/* Ranked Companies */}
        <div className="space-y-4 sm:space-y-6">
          {data.rankedCompanies.map((result, index) => (
            <div key={result.company.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Company Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl font-bold text-gray-400">#{index + 1}</span>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                        <Link href={`/companies/${result.company.id}?from=/discovery/${id}`} className="hover:text-blue-600">
                          {result.company.name}
                        </Link>
                      </h2>
                      {result.fitAnalysis && (
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getScoreBgColor(result.fitAnalysis.overallFitScore)}`}>
                          {result.fitAnalysis.overallFitScore}/10 Fit
                        </span>
                      )}
                    </div>
                    {result.discoverySnippet && (
                      <p className="text-gray-600 mt-2 text-xs sm:text-sm">{result.discoverySnippet}</p>
                    )}
                    {result.company.industry && (
                      <p className="text-gray-500 text-xs sm:text-sm mt-1">
                        {result.company.industry} • {result.company.sizeEstimate || 'Unknown size'}
                      </p>
                    )}
                  </div>
                  <div className="flex sm:flex-col sm:text-right gap-3 sm:gap-0">
                    <div className="text-xs sm:text-sm text-gray-500 sm:mb-2">
                      {result.signals.length} signals • {result.contacts.length} contacts
                    </div>
                    {result.company.websiteUrl && (
                      <a
                        href={result.company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                      >
                        Website →
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Fit Analysis */}
              {result.fitAnalysis && (
                <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">Fit Analysis</h3>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(result.fitAnalysis.criteriaMatchScore)}`}>
                        {result.fitAnalysis.criteriaMatchScore}
                      </div>
                      <div className="text-xs text-gray-500">Criteria</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(result.fitAnalysis.cultureMatchScore)}`}>
                        {result.fitAnalysis.cultureMatchScore}
                      </div>
                      <div className="text-xs text-gray-500">Culture</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(result.fitAnalysis.opportunityScore)}`}>
                        {result.fitAnalysis.opportunityScore}
                      </div>
                      <div className="text-xs text-gray-500">Opportunity</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(result.fitAnalysis.locationMatchScore)}`}>
                        {result.fitAnalysis.locationMatchScore}
                      </div>
                      <div className="text-xs text-gray-500">Location</div>
                    </div>
                  </div>

                  {/* Analysis Text */}
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Criteria Match: </span>
                      <span className="text-gray-600">{result.fitAnalysis.criteriaMatchAnalysis}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Strategy: </span>
                      <span className="text-gray-600">{result.fitAnalysis.positioningStrategy}</span>
                    </div>
                  </div>

                  {/* Outreach Template */}
                  {result.fitAnalysis.outreachTemplate && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-700 text-xs sm:text-sm">Outreach Template</span>
                        <button
                          onClick={() => copyToClipboard(result.fitAnalysis!.outreachTemplate!, result.company.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm flex items-center gap-1"
                        >
                          {copiedTemplate === result.company.id ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-600 text-xs sm:text-sm italic">&quot;{result.fitAnalysis.outreachTemplate}&quot;</p>
                    </div>
                  )}
                </div>
              )}

              {/* Top Contacts */}
              {result.contacts.length > 0 && (
                <div className="p-4 sm:p-6">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm sm:text-base">Key Contacts</h3>
                  <div className="space-y-2">
                    {result.contacts.slice(0, 3).map(contact => (
                      <div key={contact.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{contact.name}</span>
                          <span className="text-gray-500 ml-2">{contact.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">{contact.contactType}</span>
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              LinkedIn →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {result.contacts.length > 3 && (
                      <Link
                        href={`/companies/${result.company.id}?from=/discovery/${id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                      >
                        +{result.contacts.length - 3} more contacts →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No results */}
        {data.rankedCompanies.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No companies discovered in this run.</p>
          </div>
        )}
      </div>
    </div>
  )
}
