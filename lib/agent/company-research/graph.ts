import { StateGraph, END } from '@langchain/langgraph'
import { CompanyResearchState, type ResearchPhase } from './state'
import { orchestratorNode } from './nodes/orchestrator'
import { signalWorkerNode } from './nodes/signal-worker'
import { contactWorkerNode } from './nodes/contact-worker'
import { synthesizerNode } from './nodes/synthesizer'

/**
 * Route from orchestrator to the appropriate worker based on current phase
 */
function routeFromOrchestrator(state: typeof CompanyResearchState.State): string {
  const { currentPhase } = state

  switch (currentPhase) {
    case 'signals':
      return 'signal_worker'
    case 'contacts':
      return 'contact_worker'
    case 'synthesis':
      return 'synthesizer'
    case 'complete':
    case 'error':
      return END
    default:
      // For 'init' or unknown, stay in orchestrator (shouldn't happen)
      return 'orchestrator'
  }
}

/**
 * After signal worker completes, check if more research is needed
 */
function shouldContinueFromSignalWorker(state: typeof CompanyResearchState.State): string {
  // Always route back to orchestrator to decide next step
  return 'orchestrator'
}

/**
 * After contact worker completes, check if more contacts needed
 */
function shouldContinueFromContactWorker(state: typeof CompanyResearchState.State): string {
  // Always route back to orchestrator to decide next step
  return 'orchestrator'
}

/**
 * Build the company research graph
 */
function buildCompanyResearchGraph() {
  const workflow = new StateGraph(CompanyResearchState)
    // Add all nodes
    .addNode('orchestrator', orchestratorNode)
    .addNode('signal_worker', signalWorkerNode)
    .addNode('contact_worker', contactWorkerNode)
    .addNode('synthesizer', synthesizerNode)

    // Entry point: start with orchestrator
    .addEdge('__start__', 'orchestrator')

    // Orchestrator dispatches to workers based on phase
    .addConditionalEdges('orchestrator', routeFromOrchestrator, {
      'signal_worker': 'signal_worker',
      'contact_worker': 'contact_worker',
      'synthesizer': 'synthesizer',
      [END]: END
    })

    // Workers route back to orchestrator
    .addConditionalEdges('signal_worker', shouldContinueFromSignalWorker, {
      'orchestrator': 'orchestrator'
    })

    .addConditionalEdges('contact_worker', shouldContinueFromContactWorker, {
      'orchestrator': 'orchestrator'
    })

    // Synthesizer ends the workflow
    .addEdge('synthesizer', END)

  return workflow.compile()
}

// Export the compiled graph
export const companyResearchGraph = buildCompanyResearchGraph()

// Export for testing/debugging
export { buildCompanyResearchGraph }
