import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listCompanies, getOrCreateCompany } from '@/lib/db/company-queries'
import { triggerCompanyResearch } from '@/lib/agent/company-research'

// Server Action to add and research a company
async function addCompanyAction(formData: FormData) {
  'use server'

  const name = formData.get('companyName') as string
  if (!name || name.trim().length < 2) {
    redirect('/companies?error=invalid_name')
  }

  const company = getOrCreateCompany(name.trim())

  // Trigger research in background
  triggerCompanyResearch(name.trim()).catch(err => {
    console.error(`Background research failed for ${name}:`, err)
  })

  revalidatePath('/companies')
  redirect(`/companies/${company.id}?researching=true`)
}

// Server Action to trigger research for existing company
async function researchCompanyAction(formData: FormData) {
  'use server'

  const companyId = formData.get('companyId') as string
  const companyName = formData.get('companyName') as string

  if (!companyId || !companyName) {
    redirect('/companies?error=missing_data')
  }

  // Trigger research in background
  triggerCompanyResearch(companyName).catch(err => {
    console.error(`Background research failed for ${companyName}:`, err)
  })

  revalidatePath('/companies')
  redirect(`/companies/${companyId}?researching=true`)
}

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

export default async function CompaniesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; error?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status

  const { companies, total } = listCompanies({
    researchStatus: statusFilter,
    limit: 100
  })

  // Count by status
  const pendingCount = listCompanies({ researchStatus: 'pending', limit: 1 }).total
  const researchedCount = listCompanies({ researchStatus: 'researched', limit: 1 }).total
  const runningCount = listCompanies({ researchStatus: 'running', limit: 1 }).total

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Research</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium"
            >
              Home
            </Link>
            <Link
              href="/discovery"
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium"
            >
              Discover Companies
            </Link>
            <Link
              href="/settings/research-agents"
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
            >
              Agent Config
            </Link>
          </div>
        </div>

        {/* Error Messages */}
        {params.error === 'invalid_name' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Please enter a valid company name (at least 2 characters).</p>
          </div>
        )}

        {/* Add Company Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Company to Research</h2>
          <form action={addCompanyAction} className="flex gap-4">
            <input
              type="text"
              name="companyName"
              placeholder="Enter company name (e.g., Stripe, Airbnb)"
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={2}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium"
            >
              Add & Research
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Companies</h2>
              <p className="text-gray-600">
                {total === 0
                  ? 'No companies yet. Add one above to start researching!'
                  : `Showing ${companies.length} of ${total} companies`}
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/companies" className="text-center">
                <div className="text-2xl font-bold text-gray-600">{pendingCount + researchedCount + runningCount}</div>
                <div className="text-sm text-gray-600">Total</div>
              </Link>
              <Link href="/companies?status=researched" className="text-center">
                <div className="text-2xl font-bold text-green-600">{researchedCount}</div>
                <div className="text-sm text-gray-600">Researched</div>
              </Link>
              <Link href="/companies?status=running" className="text-center">
                <div className="text-2xl font-bold text-blue-600">{runningCount}</div>
                <div className="text-sm text-gray-600">Running</div>
              </Link>
              <Link href="/companies?status=pending" className="text-center">
                <div className="text-2xl font-bold text-gray-500">{pendingCount}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Link
            href="/companies"
            className={`px-4 py-2 rounded-md font-medium ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            All
          </Link>
          <Link
            href="/companies?status=researched"
            className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'researched' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Researched
          </Link>
          <Link
            href="/companies?status=running"
            className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'running' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Running
          </Link>
          <Link
            href="/companies?status=pending"
            className={`px-4 py-2 rounded-md font-medium ${statusFilter === 'pending' ? 'bg-gray-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Pending
          </Link>
        </div>

        {/* Company List */}
        <div className="space-y-4">
          {companies.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No companies found. Add a company above to get started.
            </div>
          ) : (
            companies.map(company => (
              <div key={company.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/companies/${company.id}`} className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                        {company.name}
                      </Link>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(company.researchStatus)}`}>
                        {company.researchStatus}
                      </span>
                      {company.overallScore !== null && (
                        <span className={`text-lg font-bold ${getScoreColor(company.overallScore)}`}>
                          {company.overallScore}/10
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-x-4">
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
                  <div className="flex gap-2">
                    <Link
                      href={`/companies/${company.id}`}
                      className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 font-medium text-sm"
                    >
                      View Details
                    </Link>
                    {company.researchStatus !== 'running' && (
                      <form action={researchCompanyAction}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="companyName" value={company.name} />
                        <button
                          type="submit"
                          className="bg-blue-100 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-200 font-medium text-sm"
                        >
                          Re-research
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
