export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About JobScout</h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered job search automation that saves you hours of manual searching
          </p>

          {/* The Problem */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">The Problem</h2>
            <p className="text-gray-700 mb-3">
              Job seekers spend 1-2 hours daily manually searching job boards with the same criteria.
              Most tools don't proactively search multiple sources, rank results by relevance, or efficiently track status.
            </p>
            <p className="text-gray-700">
              <strong>JobScout turns 2 hours of daily searching into 10 minutes of reviewing pre-filtered leads.</strong>
            </p>
          </section>

          {/* How It Works */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">How It Works</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Configure Your Profile</h3>
                <p className="text-gray-700">
                  Tell JobScout about your target role, technical skills, preferred company stage,
                  location preferences, compensation requirements, and keywords to avoid. Customize
                  the AI agent's search strategy to match your unique needs.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">2. AI Generates Smart Queries</h3>
                <p className="text-gray-700 mb-2">
                  When you click "Run Search", JobScout uses Gemini AI to generate 5-7 optimized
                  Google Custom Search queries based on your profile. The AI combines:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Job board targeting (Greenhouse, Lever, Ashby, etc.)</li>
                  <li>Role-specific keywords from your seniority level</li>
                  <li>Your primary technical skills</li>
                  <li>Company stage and industry signals</li>
                  <li>Location preferences</li>
                  <li>Exclusion of unwanted keywords</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Parallel Search Execution</h3>
                <p className="text-gray-700">
                  All queries run simultaneously via Google Custom Search API. Results are fetched
                  from job application platforms (up to 10 per query), then automatically deduplicated
                  by URL to remove redundant postings.
                </p>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">4. AI-Powered Scoring</h3>
                <p className="text-gray-700 mb-2">
                  Each unique job is scored 1-10 by Gemini AI based on how well it matches your profile:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li><strong>10:</strong> Perfect match - ideal role, company, tech stack, location</li>
                  <li><strong>8-9:</strong> Strong match - most criteria aligned</li>
                  <li><strong>6-7:</strong> Good match - worth reviewing</li>
                  <li><strong>4-5:</strong> Possible match - some fit</li>
                  <li><strong>1-3:</strong> Poor match - misaligned or contains excluded keywords</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  The AI also provides 2-3 sentences explaining <em>why</em> each job received its score.
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Review & Track</h3>
                <p className="text-gray-700">
                  Jobs are displayed sorted by score (highest first). You can filter by status,
                  read AI reasoning, visit job postings, save promising opportunities, mark applications,
                  add notes, and dismiss irrelevant listings.
                </p>
              </div>
            </div>
          </section>

          {/* Visual Flow */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">The Complete Flow</h2>
            <div className="bg-gray-100 rounded-lg p-6 font-mono text-sm">
              <div className="space-y-2 text-gray-700">
                <div>👤 You click "Run Search"</div>
                <div className="pl-6">↓</div>
                <div>🤖 AI generates 5-7 optimized search queries</div>
                <div className="pl-6">↓</div>
                <div>🔍 Google searches multiple job boards in parallel</div>
                <div className="pl-6">↓</div>
                <div>🧹 Deduplicates results by URL</div>
                <div className="pl-6">↓</div>
                <div>⭐ AI scores each job 1-10 with reasoning</div>
                <div className="pl-6">↓</div>
                <div>💾 Saves jobs to database</div>
                <div className="pl-6">↓</div>
                <div>📊 Displays ranked results for your review</div>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              <strong>Time to complete:</strong> 30-60 seconds
            </p>
          </section>

          {/* Key Features */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">🤖 AI-Powered</h3>
                <p className="text-gray-700 text-sm">
                  Uses Google Gemini to generate queries and intelligently score matches
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">🎯 Highly Customizable</h3>
                <p className="text-gray-700 text-sm">
                  Configure your profile and even edit the AI's system prompt
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">⚡ Fast & Parallel</h3>
                <p className="text-gray-700 text-sm">
                  Executes multiple searches simultaneously for maximum coverage
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Smart Tracking</h3>
                <p className="text-gray-700 text-sm">
                  Track jobs through New → Saved → Applied → Dismissed
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
                <strong>Backend:</strong> Server Components
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
                <li>• <strong>Gemini AI:</strong> Generous free tier (60 requests/minute)</li>
                <li>• <strong>Google Custom Search:</strong> 100 queries/day free</li>
                <li>• <strong>Railway Hosting:</strong> $5 credit/month (enough for personal use)</li>
              </ul>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              With free tiers, you can run <strong>10-15 searches per day at no cost</strong>.
              Each search uses ~7 API calls (1 for query generation + 6 for batch scoring).
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">How often should I run searches?</h3>
                <p className="text-gray-700 text-sm">
                  Run daily or every few days to catch new postings. The system deduplicates by URL,
                  so you won't see the same job twice.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Can I customize the AI's search strategy?</h3>
                <p className="text-gray-700 text-sm">
                  Yes! Visit the Configuration page and edit the "System Prompt" to change how the AI
                  generates queries and scores jobs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">What job boards does it search?</h3>
                <p className="text-gray-700 text-sm">
                  By default: Greenhouse, Lever, Ashby, Workable, and other ATS platforms. You can
                  customize this in the agent configuration.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Is my data private?</h3>
                <p className="text-gray-700 text-sm">
                  Yes. All data is stored in your own SQLite database on Railway. Profile data is only
                  sent to Google APIs for search and scoring.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="mt-8 pt-8 border-t text-center">
            <a
              href="/"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-medium"
            >
              Start Finding Jobs →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
