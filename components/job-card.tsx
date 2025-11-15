import type { Job } from '@/types'
import { revalidatePath } from 'next/cache'
import { updateJob } from '@/lib/db/queries'

// Server Actions for updating job status
async function updateJobStatus(jobId: string, status: Job['status']) {
  'use server'

  try {
    // Call database function directly (no HTTP request needed)
    updateJob(jobId, { status })
    revalidatePath('/')
  } catch (error) {
    console.error('Error updating job status:', error)
  }
}

export function JobCard({ job }: { job: Job }) {
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    saved: 'bg-yellow-100 text-yellow-800',
    applied: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800'
  }

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 font-bold'
    if (score >= 6) return 'text-blue-600 font-semibold'
    if (score >= 4) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <a
            href={`/jobs/${job.id}`}
            className="text-xl font-semibold text-gray-900 hover:text-blue-600"
          >
            {job.title}
          </a>
          <p className="text-gray-600 mt-1">{job.company}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${scoreColor(job.score)}`}>
            {job.score}/10
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status]}`}>
            {job.status}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        <span>{job.location || 'Location not specified'}</span>
        {job.remote && <span className="ml-3 text-green-600 font-medium">🌐 Remote</span>}
      </div>

      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
        {job.description}
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Match reasoning:</span> {job.matchReasoning}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {job.status === 'new' && (
          <>
            <form action={updateJobStatus.bind(null, job.id, 'saved')}>
              <button
                type="submit"
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
              >
                💾 Save
              </button>
            </form>
            <form action={updateJobStatus.bind(null, job.id, 'dismissed')}>
              <button
                type="submit"
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
              >
                ✕ Dismiss
              </button>
            </form>
          </>
        )}
        {job.status === 'saved' && (
          <>
            <form action={updateJobStatus.bind(null, job.id, 'applied')}>
              <button
                type="submit"
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                ✓ Mark Applied
              </button>
            </form>
            <form action={updateJobStatus.bind(null, job.id, 'new')}>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                ← Back to New
              </button>
            </form>
          </>
        )}
        {(job.status === 'applied' || job.status === 'dismissed') && (
          <form action={updateJobStatus.bind(null, job.id, 'new')}>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              ← Back to New
            </button>
          </form>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
        >
          🔗 View Posting
        </a>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Found {new Date(job.foundAt).toLocaleDateString()}
      </div>
    </div>
  )
}
