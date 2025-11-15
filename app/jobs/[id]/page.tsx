import { getJob, updateJob } from '@/lib/db/queries'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Job } from '@/types'

// Server Actions
async function updateJobStatus(jobId: string, status: Job['status']) {
  'use server'
  updateJob(jobId, { status })
  revalidatePath(`/jobs/${jobId}`)
}

async function updateJobNotes(jobId: string, formData: FormData) {
  'use server'
  const notes = formData.get('notes') as string
  updateJob(jobId, { notes })
  revalidatePath(`/jobs/${jobId}`)
}

export default async function JobDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Job not found</p>
            <a href="/" className="text-blue-600 underline mt-2 inline-block">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    saved: 'bg-yellow-100 text-yellow-800',
    applied: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800'
  }

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-blue-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-xl text-gray-600">{job.company}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${scoreColor(job.score)} mb-2`}>
                {job.score}/10
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[job.status]}`}>
                {job.status}
              </span>
            </div>
          </div>

          {/* Job Info */}
          <div className="mb-6 flex gap-6 text-gray-600">
            <div>
              <span className="font-medium">Location:</span> {job.location || 'Not specified'}
            </div>
            {job.remote && (
              <div className="text-green-600 font-medium">🌐 Remote</div>
            )}
            <div>
              <span className="font-medium">Found:</span> {new Date(job.foundAt).toLocaleDateString()}
            </div>
          </div>

          {/* Match Reasoning */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Why this match?</h2>
            <p className="text-gray-700">{job.matchReasoning}</p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Job Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Notes</h2>
            <form action={updateJobNotes.bind(null, job.id)}>
              <textarea
                name="notes"
                rows={4}
                defaultValue={job.notes || ''}
                placeholder="Add your thoughts, questions, or follow-up items..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Save Notes
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap border-t pt-6">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              🔗 View Job Posting
            </a>

            {job.status === 'new' && (
              <>
                <form action={updateJobStatus.bind(null, job.id, 'saved')}>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium"
                  >
                    💾 Save for Later
                  </button>
                </form>
                <form action={updateJobStatus.bind(null, job.id, 'dismissed')}>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
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
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    ✓ Mark as Applied
                  </button>
                </form>
                <form action={updateJobStatus.bind(null, job.id, 'new')}>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
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
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  ← Back to New
                </button>
              </form>
            )}
          </div>

          {/* Metadata */}
          <div className="mt-6 pt-6 border-t text-sm text-gray-500">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Source:</span> {job.source}
              </div>
              <div>
                <span className="font-medium">Job ID:</span> {job.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
