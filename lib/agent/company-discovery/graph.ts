import { StateGraph, END } from '@langchain/langgraph'
import { CompanyDiscoveryState, type CompanyDiscoveryStateType } from './state'
import {
  discoveryOrchestratorNode,
  routeFromOrchestrator
} from './nodes/discovery-orchestrator'
import {
  companyFinderNode,
  shouldContinueFinding
} from './nodes/company-finder'
import {
  companyResearcherNode,
  shouldContinueResearching
} from './nodes/company-researcher'
import {
  fitAnalyzerNode,
  shouldContinueAnalyzing
} from './nodes/fit-analyzer'
import { discoverySynthesizerNode } from './nodes/discovery-synthesizer'

/**
 * Build the Company Discovery LangGraph
 *
 * Flow:
 * 1. orchestrator: Generate queries, manage phases
 * 2. company_finder: Execute queries, extract companies
 * 3. company_researcher: Research companies in parallel batches
 * 4. fit_analyzer: Analyze company-candidate fit
 * 5. discovery_synthesizer: Generate final summary
 */
function buildDiscoveryGraph() {
  const workflow = new StateGraph(CompanyDiscoveryState)
    // Add nodes
    .addNode('orchestrator', discoveryOrchestratorNode)
    .addNode('company_finder', companyFinderNode)
    .addNode('company_researcher', companyResearcherNode)
    .addNode('fit_analyzer', fitAnalyzerNode)
    .addNode('discovery_synthesizer', discoverySynthesizerNode)
    .addNode('complete', async (state: CompanyDiscoveryStateType) => {
      console.log('[Complete] Discovery workflow finished')
      return {}
    })

    // Entry point: start with orchestrator
    .addEdge('__start__', 'orchestrator')

    // From orchestrator - route based on phase
    .addConditionalEdges('orchestrator', routeFromOrchestrator, {
      company_finder: 'company_finder',
      company_researcher: 'company_researcher',
      fit_analyzer: 'fit_analyzer',
      discovery_synthesizer: 'discovery_synthesizer',
      complete: 'complete'
    })

    // From company_finder - continue finding or go back to orchestrator
    .addConditionalEdges('company_finder', shouldContinueFinding, {
      company_finder: 'company_finder',
      orchestrator: 'orchestrator'
    })

    // From company_researcher - continue researching or go back to orchestrator
    .addConditionalEdges('company_researcher', shouldContinueResearching, {
      company_researcher: 'company_researcher',
      orchestrator: 'orchestrator'
    })

    // From fit_analyzer - continue analyzing or go back to orchestrator
    .addConditionalEdges('fit_analyzer', shouldContinueAnalyzing, {
      fit_analyzer: 'fit_analyzer',
      orchestrator: 'orchestrator'
    })

    // From synthesizer - always to complete
    .addEdge('discovery_synthesizer', 'complete')

    // Complete goes to END
    .addEdge('complete', END)

  return workflow.compile()
}

// Export compiled graph
export const companyDiscoveryGraph = buildDiscoveryGraph()

// Export for testing/debugging
export { buildDiscoveryGraph }
