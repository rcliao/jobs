import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getCompany,
  getCompanySignals,
  getCompanyContacts,
  getCompanyResearchRuns,
  updateContact
} from '@/lib/db/company-queries'
import { triggerCompanyResearch } from '@/lib/agent/company-research'
import type { SignalCategory, Contact } from '@/types'
import { ContactStatusSelect } from './ContactStatusSelect'
import { SignalCard } from './SignalCard'
import { QuickActionsPanel } from './QuickActionsPanel'
import { CopyEmailButton } from './CopyEmailButton'

// Server Action to trigger research
async function researchAction(formData: FormData) {
  'use server'

  const companyId = formData.get('companyId') as string
  const companyName = formData.get('companyName') as string

  triggerCompanyResearch(companyName).catch(err => {
    console.error(`Research failed for ${companyName}:`, err)
  })

  revalidatePath(`/companies/${companyId}`)
  redirect(`/companies/${companyId}?researching=true`)
}

// Server Action to update contact status
async function updateContactAction(formData: FormData) {
  'use server'

  const contactId = formData.get('contactId') as string
  const companyId = formData.get('companyId') as string
  const outreachStatus = formData.get('outreachStatus') as Contact['outreachStatus']

  updateContact(contactId, { outreachStatus })

  revalidatePath(`/companies/${companyId}`)
}

function getCategoryLabel(category: SignalCategory): string {
  const labels: Record<SignalCategory, string> = {
    growth_funding: 'Growth & Funding',
    culture_work_style: 'Culture & Work Style',
    tech_stack_engineering: 'Tech Stack & Engineering',
    leadership_changes: 'Leadership Changes',
    job_openings: 'Job Openings'
  }
  return labels[category] || category
}

function getCategoryIcon(category: SignalCategory): string {
  const icons: Record<SignalCategory, string> = {
    growth_funding: '📈',
    culture_work_style: '🏢',
    tech_stack_engineering: '💻',
    leadership_changes: '👔',
    job_openings: '💼'
  }
  return icons[category] || '📋'
}

function getContactTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    recruiter: '🎯',
    hiring_manager: '👤',
    team_lead: '🔧',
    executive: '🏆'
  }
  return icons[type] || '👤'
}

function getOutreachStatusColor(status: string): string {
  switch (status) {
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800'
    case 'responded':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 8) return 'text-green-600 bg-green-50'
  if (score >= 6) return 'text-yellow-600 bg-yellow-50'
  if (score >= 4) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

export default async function CompanyDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ researching?: string }>
}) {
  const { id } = await params
  const query = await searchParams

  const company = getCompany(id)
  if (!company) {
    notFound()
  }

  const signals = getCompanySignals(id)
  const contacts = getCompanyContacts(id)
  const researchRuns = getCompanyResearchRuns(id)

  // Group signals by category
  const signalsByCategory: Record<SignalCategory, typeof signals> = {
    growth_funding: [],
    culture_work_style: [],
    tech_stack_engineering: [],
    leadership_changes: [],
    job_openings: []
  }
  for (const signal of signals) {
    if (signalsByCategory[signal.category]) {
      signalsByCategory[signal.category].push(signal)
    }
  }

  // Sort signals within each category by date (most recent first)
  for (const category of Object.keys(signalsByCategory) as SignalCategory[]) {
    signalsByCategory[category].sort((a, b) => {
      // Signals with dates come before those without
      if (!a.signalDate && !b.signalDate) return 0
      if (!a.signalDate) return 1
      if (!b.signalDate) return -1
      // Most recent first
      return new Date(b.signalDate).getTime() - new Date(a.signalDate).getTime()
    })
  }

  // Get latest research run summary
  const latestRun = researchRuns[0]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <div>
            <Link href="/companies" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
              ← Back to Companies
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{company.name}</h1>
              {company.overallScore !== null && (
                <span className={`text-xl sm:text-2xl font-bold px-2 sm:px-3 py-1 rounded-lg ${getScoreColor(company.overallScore)}`}>
                  {company.overallScore}/10
                </span>
              )}
            </div>
            <div className="text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm sm:text-base">
              {company.industry && <span>Industry: {company.industry}</span>}
              {company.sizeEstimate && <span>Size: {company.sizeEstimate}</span>}
              {company.headquarters && <span>HQ: {company.headquarters}</span>}
            </div>
            {company.websiteUrl && (
              <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 inline-block break-all">
                {company.websiteUrl}
              </a>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {company.linkedinUrl && (
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-700 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-blue-800 font-medium text-sm sm:text-base flex-1 sm:flex-none text-center"
              >
                LinkedIn
              </a>
            )}
            <form action={researchAction} className="flex-1 sm:flex-none">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="companyName" value={company.name} />
              <button
                type="submit"
                disabled={company.researchStatus === 'running'}
                className="bg-blue-600 text-white py-2 px-4 sm:px-6 rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 text-sm sm:text-base w-full"
              >
                {company.researchStatus === 'running' ? 'Researching...' : 'Re-research'}
              </button>
            </form>
          </div>
        </div>

        {/* Research Status */}
        {query.researching === 'true' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">Research is running in the background. Refresh the page to see updates.</p>
          </div>
        )}

        {/* Research Summary */}
        {latestRun?.summary && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Research Summary</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap text-sm sm:text-base">
              {latestRun.summary}
            </div>
            <div className="mt-4 text-xs sm:text-sm text-gray-500">
              Last updated: {new Date(latestRun.startedAt).toLocaleString()}
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        <div className="mb-6 sm:mb-8">
          <QuickActionsPanel company={company} />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{signals.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Signals</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{contacts.length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Contacts</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{researchRuns.filter(r => r.status === 'complete').length}</div>
            <div className="text-xs sm:text-sm text-gray-600">Research Runs</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-2xl font-bold text-gray-600">
              {company.lastResearchedAt ? new Date(company.lastResearchedAt).toLocaleDateString() : 'Never'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Last Researched</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Signals Section */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Research Signals</h2>
            {signals.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                No signals yet. Run research to discover company intelligence.
              </div>
            ) : (
              <div className="space-y-4">
                {(Object.keys(signalsByCategory) as SignalCategory[]).map(category => {
                  const categorySignals = signalsByCategory[category]
                  if (categorySignals.length === 0) return null

                  return (
                    <SignalCard
                      key={category}
                      category={category}
                      signals={categorySignals}
                      categoryLabel={getCategoryLabel(category)}
                      categoryIcon={getCategoryIcon(category)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Contacts Section */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Key Contacts</h2>
            {contacts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                No contacts yet. Run research to discover key people.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Priority Contacts (score >= 7) */}
                {contacts.filter(c => (c.relevanceScore ?? 0) >= 7).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <span className="text-yellow-500">★</span> Priority Contacts
                    </h3>
                    <div className="space-y-2">
                      {contacts
                        .filter(c => (c.relevanceScore ?? 0) >= 7)
                        .map(contact => (
                          <div key={contact.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-400">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{getContactTypeIcon(contact.contactType)}</span>
                                  <span className="font-semibold text-gray-900">{contact.name}</span>
                                  {contact.relevanceScore && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">
                                      {contact.relevanceScore}/10
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{contact.title}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getOutreachStatusColor(contact.outreachStatus)}`}>
                                    {contact.outreachStatus.replace('_', ' ')}
                                  </span>
                                  {contact.linkedinUrl && (
                                    <a
                                      href={contact.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                                    >
                                      LinkedIn
                                    </a>
                                  )}
                                  {contact.email && (
                                    <CopyEmailButton email={contact.email} />
                                  )}
                                </div>
                              </div>
                              <ContactStatusSelect
                                contactId={contact.id}
                                companyId={company.id}
                                defaultValue={contact.outreachStatus}
                                action={updateContactAction}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {/* Other Contacts */}
                {contacts.filter(c => (c.relevanceScore ?? 0) < 7).length > 0 && (
                  <div>
                    {contacts.filter(c => (c.relevanceScore ?? 0) >= 7).length > 0 && (
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Other Contacts</h3>
                    )}
                    <div className="space-y-2">
                      {contacts
                        .filter(c => (c.relevanceScore ?? 0) < 7)
                        .map(contact => (
                          <div key={contact.id} className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span>{getContactTypeIcon(contact.contactType)}</span>
                                  <span className="font-semibold text-gray-900">{contact.name}</span>
                                  {contact.relevanceScore && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      {contact.relevanceScore}/10
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{contact.title}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getOutreachStatusColor(contact.outreachStatus)}`}>
                                    {contact.outreachStatus.replace('_', ' ')}
                                  </span>
                                  {contact.linkedinUrl && (
                                    <a
                                      href={contact.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      LinkedIn
                                    </a>
                                  )}
                                </div>
                              </div>
                              <ContactStatusSelect
                                contactId={contact.id}
                                companyId={company.id}
                                defaultValue={contact.outreachStatus}
                                action={updateContactAction}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Research History */}
        {researchRuns.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Research History</h2>
            {/* Mobile: Card layout */}
            <div className="sm:hidden space-y-3">
              {researchRuns.slice(0, 10).map(run => (
                <div key={run.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-900">
                      {new Date(run.startedAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      run.status === 'complete' ? 'bg-green-100 text-green-800' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{run.signalsFound} signals</span>
                    <span>{run.contactsFound} contacts</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Table layout */}
            <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signals</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {researchRuns.slice(0, 10).map(run => (
                    <tr key={run.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          run.status === 'complete' ? 'bg-green-100 text-green-800' :
                          run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.signalsFound}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.contactsFound}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
