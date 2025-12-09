'use client'

import { useState } from 'react'
import type { CompanySignal, SignalCategory } from '@/types'

interface SignalCardProps {
  category: SignalCategory
  signals: CompanySignal[]
  categoryLabel: string
  categoryIcon: string
}

export function SignalCard({ category, signals, categoryLabel, categoryIcon }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const initialCount = 5
  const hasMore = signals.length > initialCount
  const displayedSignals = expanded ? signals : signals.slice(0, initialCount)

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>{categoryIcon}</span>
        {categoryLabel}
        <span className="text-sm font-normal text-gray-500">({signals.length})</span>
      </h3>
      <div className="space-y-3">
        {displayedSignals.map(signal => (
          <div key={signal.id} className="border-l-2 border-blue-200 pl-3">
            <p className="text-gray-700 text-sm">{signal.content}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="font-medium">Confidence: {signal.confidence}/10</span>
              {signal.signalDate && (
                <span className="text-gray-400">
                  {new Date(signal.signalDate).toLocaleDateString()}
                </span>
              )}
              <span className="text-gray-300">|</span>
              {signal.sourceUrl ? (
                <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {signal.source}
                </a>
              ) : (
                <span>{signal.source}</span>
              )}
            </div>
          </div>
        ))}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            {expanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
                Show less
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                Show {signals.length - initialCount} more signals
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
