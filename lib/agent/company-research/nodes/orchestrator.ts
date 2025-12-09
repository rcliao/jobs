import { AIMessage } from '@langchain/core/messages'
import type { CompanyResearchStateType, SignalIterationState } from '../state'
import type { SignalCategory } from '@/types'
import { getResearchAgentConfig } from '@/lib/db/company-queries'

const SIGNAL_CATEGORIES: SignalCategory[] = [
  'growth_funding',
  'culture_work_style',
  'tech_stack_engineering',
  'leadership_changes',
  'job_openings'
]

/**
 * Orchestrator node - manages phase transitions and worker dispatch
 */
export async function orchestratorNode(
  state: CompanyResearchStateType
): Promise<Partial<CompanyResearchStateType>> {
  const { currentPhase, signalIterations, contactIteration, collectedSignals, discoveredContacts } = state

  // Load config to check which categories are enabled
  const config = await getResearchAgentConfig('orchestrator')
  const enabledCategories = config?.behaviorConfig.signalCategories || SIGNAL_CATEGORIES

  // Phase: Init - Start with signal gathering
  if (currentPhase === 'init') {
    const firstCategory = findNextIncompleteCategory(signalIterations, enabledCategories)

    if (firstCategory) {
      return {
        currentPhase: 'signals',
        currentSignalCategory: firstCategory,
        messages: [new AIMessage(`Starting company research for ${state.companyName}. Beginning with ${formatCategory(firstCategory)} signals.`)]
      }
    } else {
      // No signal categories to research, skip to contacts
      return {
        currentPhase: 'contacts',
        currentSignalCategory: null,
        messages: [new AIMessage(`No signal categories configured. Moving to contact discovery.`)]
      }
    }
  }

  // Phase: Signals - Find next category or move to contacts
  if (currentPhase === 'signals') {
    const nextCategory = findNextIncompleteCategory(signalIterations, enabledCategories)

    if (nextCategory) {
      const iter = signalIterations[nextCategory]
      return {
        currentSignalCategory: nextCategory,
        messages: [new AIMessage(`Researching ${formatCategory(nextCategory)} signals (iteration ${iter.iteration + 1}/${iter.maxIterations})`)]
      }
    }

    // All signal categories complete, move to contacts
    const totalSignals = collectedSignals.length
    return {
      currentPhase: 'contacts',
      currentSignalCategory: null,
      messages: [new AIMessage(`Signal gathering complete. Found ${totalSignals} signals across all categories. Moving to contact discovery.`)]
    }
  }

  // Phase: Contacts - Check if more contact iterations needed or move to synthesis
  if (currentPhase === 'contacts') {
    const contactConfig = await getResearchAgentConfig('contact_worker')
    const maxContacts = contactConfig?.behaviorConfig.maxContacts || 10

    if (discoveredContacts.length >= maxContacts ||
        contactIteration.iteration >= contactIteration.maxIterations) {
      // Move to synthesis
      return {
        currentPhase: 'synthesis',
        messages: [new AIMessage(`Contact discovery complete. Found ${discoveredContacts.length} contacts. Synthesizing research findings.`)]
      }
    }

    // Continue contact search
    return {
      messages: [new AIMessage(`Continuing contact discovery (iteration ${contactIteration.iteration + 1}/${contactIteration.maxIterations})`)]
    }
  }

  // Phase: Synthesis complete or error - do nothing
  if (currentPhase === 'synthesis' || currentPhase === 'complete' || currentPhase === 'error') {
    return {}
  }

  return {}
}

/**
 * Find the next signal category that needs more research
 */
function findNextIncompleteCategory(
  iterations: Record<SignalCategory, SignalIterationState>,
  enabledCategories: SignalCategory[]
): SignalCategory | null {
  for (const category of enabledCategories) {
    const iter = iterations[category]
    if (iter && iter.needsMoreResearch && iter.iteration < iter.maxIterations) {
      return category
    }
  }
  return null
}

/**
 * Format category name for display
 */
function formatCategory(category: SignalCategory): string {
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
