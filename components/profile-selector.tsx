'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/context/profile-context'

export function ProfileSelector() {
  const { profileId, profiles, setProfileId, createProfile, isLoading } = useProfile()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return

    setCreating(true)
    setError(null)

    try {
      const profile = await createProfile(newName.trim().toLowerCase().replace(/\s+/g, '-'))
      setProfileId(profile.id)
      setShowCreate(false)
      setNewName('')
    } catch (err) {
      setError('Failed to create profile')
    } finally {
      setCreating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      setShowCreate(false)
      setNewName('')
      setError(null)
    }
  }

  if (isLoading) {
    return <div className="h-9 w-32 bg-gray-200 animate-pulse rounded" />
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === 'default' ? 'Default' : p.id}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Create new profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showCreate && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
          <div className="text-sm font-medium text-gray-700 mb-2">New Profile</div>
          <input
            type="text"
            placeholder="e.g. alice, test-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && (
            <div className="text-red-600 text-xs mt-1">{error}</div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setShowCreate(false)
                setNewName('')
                setError(null)
              }}
              className="flex-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
