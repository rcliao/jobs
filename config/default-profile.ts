import type { UpdateProfileRequest } from '@/types'

export const defaultProfile: UpdateProfileRequest = {
  targetRole: 'Staff Software Engineer',
  seniority: ['Staff', 'Senior', 'Principal'],
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
  compensation: {
    minimum: 180000,
    target: 220000
  },
  avoid: ['blockchain', 'crypto', 'web3', 'consultancy', 'agency'],
  mustHave: ['remote-friendly', 'equity', 'strong engineering culture']
}
