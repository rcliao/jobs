'use client'

import type { Company } from '@/types'

interface QuickActionsPanelProps {
  company: Company
}

interface ActionLink {
  label: string
  icon: string
  url: string | null
  fallbackSearchQuery?: string
}

export function QuickActionsPanel({ company }: QuickActionsPanelProps) {
  const actions: ActionLink[] = [
    {
      label: 'Careers',
      icon: '💼',
      url: company.careersPageUrl,
      fallbackSearchQuery: `${company.name} careers jobs`
    },
    {
      label: 'Culture',
      icon: '🏢',
      url: company.culturePageUrl,
      fallbackSearchQuery: `${company.name} company culture values`
    },
    {
      label: 'Reviews',
      icon: '⭐',
      url: company.glassdoorUrl,
      fallbackSearchQuery: `${company.name} glassdoor reviews`
    },
    {
      label: 'Funding',
      icon: '📊',
      url: company.crunchbaseUrl,
      fallbackSearchQuery: `${company.name} crunchbase funding`
    }
  ]

  const getUrl = (action: ActionLink): string => {
    if (action.url) {
      return action.url
    }
    if (action.fallbackSearchQuery) {
      return `https://www.google.com/search?q=${encodeURIComponent(action.fallbackSearchQuery)}`
    }
    return '#'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {actions.map((action) => (
          <a
            key={action.label}
            href={getUrl(action)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center gap-1.5 transition-colors"
            title={action.url ? action.label : `Search for ${action.label}`}
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
            {!action.url && (
              <span className="text-xs text-gray-400">🔍</span>
            )}
          </a>
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
