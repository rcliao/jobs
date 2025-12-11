import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About 🔦 Beacon</h1>
          <p className="text-xl text-gray-600 mb-8">
            Turn company signals into actionable insights
          </p>

          {/* The Problem */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">The Problem</h2>
            <p className="text-gray-700 mb-3">
              Finding the right companies is hard. Whether you&apos;re looking for your next role, building
              your professional network, sourcing candidates, or identifying business opportunities -
              the challenge is the same: there are millions of companies, and you need to find the ones
              that matter to you.
            </p>
            <p className="text-gray-700 mb-3">
              Traditional approaches are reactive. You wait for opportunities to surface, manually
              research companies one-by-one, or rely on incomplete data. By the time you find a
              relevant company, the moment may have passed.
            </p>
            <p className="text-gray-700">
              <strong>Beacon flips this: define what you&apos;re looking for, then let AI discover and
              deeply research companies that match - surfacing the signals that matter.</strong>
            </p>
          </section>

          {/* Use Cases */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Who Uses Beacon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Job Seekers</h3>
                <p className="text-gray-700 text-sm">
                  Find companies that match your skills and preferences before they post jobs.
                  Get ahead of the competition with proactive outreach.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Networkers</h3>
                <p className="text-gray-700 text-sm">
                  Discover companies and contacts aligned with your career interests. Build
                  relationships strategically, not randomly.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Recruiters</h3>
                <p className="text-gray-700 text-sm">
                  Find companies actively hiring for roles you can fill. Identify growth signals
                  that indicate upcoming talent needs.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Sales & BD</h3>
                <p className="text-gray-700 text-sm">
                  Discover companies matching your ideal customer profile. Research their tech stack,
                  growth stage, and key decision makers.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">How It Works</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Define Your Criteria</h3>
                <p className="text-gray-700">
                  Tell Beacon what you&apos;re looking for: industries, company stages (startup to enterprise),
                  technologies, locations, and keywords to include or avoid. Your criteria become the
                  lens through which companies are discovered and evaluated.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. AI Discovers Companies</h3>
                <p className="text-gray-700 mb-2">
                  Beacon&apos;s AI agents search across multiple sources to find companies matching your criteria:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Tech news and funding announcements</li>
                  <li>Industry publications and blogs</li>
                  <li>Company directories and databases</li>
                  <li>Engineering blogs and tech stack mentions</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Deep Signal Research</h3>
                <p className="text-gray-700 mb-2">
                  Each discovered company is researched across five signal categories:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li><strong>Growth & Funding:</strong> Recent raises, expansion plans, investor backing</li>
                  <li><strong>Culture & Work Style:</strong> Remote policies, team dynamics, values</li>
                  <li><strong>Tech Stack:</strong> Languages, frameworks, infrastructure, engineering practices</li>
                  <li><strong>Leadership:</strong> Recent hires, team changes, org structure</li>
                  <li><strong>Hiring Activity:</strong> Current openings as signals of growth areas</li>
                </ul>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Fit Scoring & Insights</h3>
                <p className="text-gray-700 mb-2">
                  Each company receives a fit score (1-10) based on how well it matches your criteria:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li><strong>8-10:</strong> Strong match - highly aligned with your criteria</li>
                  <li><strong>6-7:</strong> Good potential - worth exploring further</li>
                  <li><strong>4-5:</strong> Partial match - some alignment but gaps exist</li>
                  <li><strong>1-3:</strong> Low fit - significant misalignment</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  The AI provides detailed reasoning explaining <em>why</em> each company scored as it did,
                  helping you prioritize your time on the highest-value opportunities.
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Contact Discovery</h3>
                <p className="text-gray-700">
                  For each company, Beacon identifies key contacts - founders, executives, team leads,
                  and other relevant people. Use these to reach out strategically with context about
                  what the company is doing and why you&apos;re interested.
                </p>
              </div>
            </div>
          </section>

          {/* Visual Flow */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">The Discovery Flow</h2>
            <div className="bg-gray-100 rounded-lg p-6 font-mono text-sm">
              <div className="space-y-2 text-gray-700">
                <div>Define your search criteria</div>
                <div className="pl-6">↓</div>
                <div>AI generates targeted search queries</div>
                <div className="pl-6">↓</div>
                <div>Searches news, blogs, and company sources</div>
                <div className="pl-6">↓</div>
                <div>Discovers and deduplicates companies</div>
                <div className="pl-6">↓</div>
                <div>Researches each company across 5 signal categories</div>
                <div className="pl-6">↓</div>
                <div>Scores fit and surfaces key insights</div>
                <div className="pl-6">↓</div>
                <div>Identifies relevant contacts</div>
                <div className="pl-6">↓</div>
                <div>Presents ranked results with actionable intelligence</div>
              </div>
            </div>
          </section>

          {/* Key Features */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Proactive Discovery</h3>
                <p className="text-gray-700 text-sm">
                  Find relevant companies automatically instead of searching one by one
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Multi-Signal Research</h3>
                <p className="text-gray-700 text-sm">
                  Deep analysis across funding, culture, tech stack, leadership, and hiring activity
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Intelligent Scoring</h3>
                <p className="text-gray-700 text-sm">
                  AI-powered matching that explains why each company does or doesn&apos;t fit
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Contact Intelligence</h3>
                <p className="text-gray-700 text-sm">
                  Identifies key people at each company for strategic outreach
                </p>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Technology</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>Frontend:</strong> Next.js 14
              </div>
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>Orchestration:</strong> LangGraph
              </div>
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>Database:</strong> SQLite
              </div>
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>AI:</strong> Google Gemini
              </div>
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>Search:</strong> Google Custom Search
              </div>
              <div className="bg-gray-100 rounded px-3 py-2 text-gray-700">
                <strong>Styling:</strong> Tailwind CSS
              </div>
            </div>
          </section>

          {/* Cost */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cost Estimates</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Free Tier</h3>
              <ul className="text-green-800 text-sm space-y-1">
                <li><strong>Gemini AI:</strong> Generous free tier (60 requests/minute)</li>
                <li><strong>Google Custom Search:</strong> 100 queries/day free</li>
                <li><strong>Self-hosted:</strong> Run locally or deploy to any platform</li>
              </ul>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              With free tiers, you can run <strong>several discovery sessions per day</strong> at no cost.
              Each session discovers and researches multiple companies.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">What makes this different from LinkedIn or Crunchbase?</h3>
                <p className="text-gray-700 text-sm">
                  Those platforms require you to search manually and evaluate companies one by one.
                  Beacon proactively discovers companies matching your criteria and researches them
                  automatically, surfacing the signals that matter most.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">What signals does it research?</h3>
                <p className="text-gray-700 text-sm">
                  Five categories: Growth & Funding, Culture & Work Style, Tech Stack & Engineering,
                  Leadership Changes, and Hiring Activity.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">How often should I run discovery?</h3>
                <p className="text-gray-700 text-sm">
                  Weekly or bi-weekly is ideal. The landscape changes as companies raise funding,
                  expand teams, or shift priorities. Regular discovery keeps your pipeline fresh.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Is my data private?</h3>
                <p className="text-gray-700 text-sm">
                  Yes. All data is stored locally in SQLite. Your criteria are only sent to Google APIs
                  for search and AI analysis - nothing is shared elsewhere.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="mt-8 pt-8 border-t text-center">
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-medium"
            >
              Start Discovering Companies →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
