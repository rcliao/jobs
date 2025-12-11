import type { UpdateProfileRequest } from '@/types'

export const defaultProfile: UpdateProfileRequest = {
  targetRole: 'Software Engineering',  // Focus area
  technicalSkills: {
    primary: ['TypeScript', 'Go', 'Distributed Systems'],
    secondary: ['Python', 'Kubernetes', 'PostgreSQL']
  },
  company: {
    stage: ['Series A', 'Series B', 'Series C'],
    industry: ['GenAI', 'AI/ML', 'Infrastructure', 'SaaS'],
    sizeRange: '20-200'
  },
  location: {
    preferences: ['Remote', 'SF Bay Area'],
    remoteOk: true
  },
  avoid: ['blockchain', 'crypto', 'web3', 'consultancy', 'agency'],
  mustHave: ['remote-friendly', 'strong engineering culture'],
  includedSites: ['techcrunch.com', 'crunchbase.com'],
  excludedSites: []
}
