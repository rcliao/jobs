// Company Research Agent Module
// Multi-agent LangGraph workflow for proactive company intelligence

// State
export {
  CompanyResearchState,
  type CompanyResearchStateType,
  type SignalIterationState,
  type ContactIterationState,
  type CollectedSignal,
  type DiscoveredContact,
  type ResearchPhase,
  getDefaultSignalIterations,
  getDefaultContactIteration
} from './state'

// Graph
export {
  companyResearchGraph,
  buildCompanyResearchGraph
} from './graph'

// Nodes
export { orchestratorNode } from './nodes/orchestrator'
export { signalWorkerNode } from './nodes/signal-worker'
export { contactWorkerNode } from './nodes/contact-worker'
export { synthesizerNode } from './nodes/synthesizer'

// Gemini Integration
export {
  analyzeSignalsWithGemini,
  extractContactsWithGemini,
  synthesizeResearchWithGemini
} from './gemini-research'

// Triggers
export {
  triggerCompanyResearch,
  runScheduledResearch,
  type CompanyResearchResult
} from './trigger'
