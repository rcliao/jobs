'use client'

import type { Company } from '@/types'

interface QuickActionsPanelProps {
  company: Company
}

interface ActionButton {
  label: string
  icon: string
  url: string | null
  fallbackSearchQuery?: string
  color: string
}

export function QuickActionsPanel({ company }: QuickActionsPanelProps) {
  const actions: ActionButton[] = [
    {
      label: 'Careers',
      icon: '💼',
      url: company.careersPageUrl,
      fallbackSearchQuery: `${company.name} careers jobs`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      label: 'Culture',
      icon: '🏢',
      url: company.culturePageUrl,
      fallbackSearchQuery: `${company.name} company culture values`,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      label: 'Reviews',
      icon: '⭐',
      url: company.glassdoorUrl,
      fallbackSearchQuery: `${company.name} glassdoor reviews`,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      label: 'Funding',
      icon: '📊',
      url: company.crunchbaseUrl,
      fallbackSearchQuery: `${company.name} crunchbase funding`,
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ]

  const handleClick = (action: ActionButton) => {
    if (action.url) {
      window.open(action.url, '_blank', 'noopener,noreferrer')
    } else if (action.fallbackSearchQuery) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(action.fallbackSearchQuery)}`
      window.open(searchUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleClick(action)}
            className={`${action.color} text-white py-2 px-3 rounded-md font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
              !action.url ? 'opacity-80' : ''
            }`}
            title={action.url ? action.label : `Search for ${action.label}`}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
            {!action.url && (
              <span className="text-xs opacity-75">🔍</span>
            )}
          </button>
        ))}
      </div>
      {company.foundedYear && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Founded: </span>
          <span className="text-sm font-medium text-gray-700">{company.foundedYear}</span>
        </div>
      )}
    </div>
  )
}
