#!/usr/bin/env tsx
import { getProfile, updateProfile, getAgentConfig, updateAgentConfig } from './queries'
import { defaultProfile } from '@/config/default-profile'
import { defaultAgentConfig } from '@/config/default-agent-config'

async function seed() {
  console.log('Seeding database with default data...')

  try {
    // Seed profile
    const existingProfile = getProfile()
    if (existingProfile) {
      console.log('Profile already exists, skipping...')
    } else {
      updateProfile(defaultProfile)
      console.log('✓ Profile created')
    }

    // Seed agent config
    const existingConfig = getAgentConfig()
    if (existingConfig) {
      console.log('Agent config already exists, skipping...')
    } else {
      updateAgentConfig(defaultAgentConfig)
      console.log('✓ Agent config created')
    }

    console.log('Database seeding complete!')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seed()
