#!/usr/bin/env tsx
import { getProfile, updateProfile, getAgentConfig, updateAgentConfig } from './queries'
import { getResearchAgentConfig, createOrUpdateResearchAgentConfig } from './company-queries'
import { defaultProfile } from '@/config/default-profile'
import { defaultAgentConfig } from '@/config/default-agent-config'
import { defaultResearchAgentConfigs } from '@/config/default-research-agent-configs'

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

    // Seed research agent configs
    for (const config of defaultResearchAgentConfigs) {
      const existing = getResearchAgentConfig(config.agentType)
      if (existing) {
        console.log(`Research agent config '${config.agentType}' already exists, skipping...`)
      } else {
        createOrUpdateResearchAgentConfig(config.agentType, {
          systemPrompt: config.systemPrompt,
          behaviorConfig: config.behaviorConfig,
          toolsConfig: config.toolsConfig,
          version: config.version
        })
        console.log(`✓ Research agent config '${config.agentType}' created`)
      }
    }

    console.log('Database seeding complete!')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seed()
