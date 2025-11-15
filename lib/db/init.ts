#!/usr/bin/env tsx
// Database initialization script for Railway deployment
import { getProfile, getAgentConfig } from './queries'
import { defaultProfile } from '@/config/default-profile'
import { defaultAgentConfig } from '@/config/default-agent-config'

// Import migration and seed scripts
import './migrations'

async function init() {
  console.log('Initializing database for production...')

  // Wait a moment for migrations to complete
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    // Check if profile exists, if not create it
    const profile = getProfile()
    if (!profile) {
      const { updateProfile } = await import('./queries')
      updateProfile(defaultProfile)
      console.log('✓ Default profile created')
    } else {
      console.log('✓ Profile already exists')
    }

    // Check if agent config exists, if not create it
    const agentConfig = getAgentConfig()
    if (!agentConfig) {
      const { updateAgentConfig } = await import('./queries')
      updateAgentConfig(defaultAgentConfig)
      console.log('✓ Default agent config created')
    } else {
      console.log('✓ Agent config already exists')
    }

    console.log('Database initialization complete!')
  } catch (error) {
    console.error('Initialization failed:', error)
    process.exit(1)
  }
}

init()
