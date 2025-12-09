import { HumanMessage } from '@langchain/core/messages'
import type { CompanyDiscoveryStateType, DiscoveryPhase, FitAnalysisResult } from '../state'
import { generateFitAnalysis } from '../gemini-discovery'
import { getCompanySignals, getCompanyContacts } from '@/lib/db/company-queries'
import { createFitAnalysis, updateDiscoveryRunStatus } from '@/lib/db/discovery-queries'

/**
 * Fit Analyzer Node
 *
 * Analyzes how well each researched company matches the user profile.
 * Generates personalized positioning strategies and outreach templates.
 */
export async function fitAnalyzerNode(
  state: CompanyDiscoveryStateType
): Promise<Partial<CompanyDiscoveryStateType>> {
  const { discoveredCompanies, fitAnalyses, profile, discoveryRunId, profileId } = state

  if (!profile) {
    return {
      currentPhase: 'error' as DiscoveryPhase,
      errors: ['No profile available for fit analysis']
    }
  }

  // Find researched companies that don't have fit analysis yet
  const researchedCompanies = discoveredCompanies.filter(c => c.researchComplete && c.companyId)
  const analyzedIds = new Set(fitAnalyses.map(f => f.companyId))
  const pendingAnalysis = researchedCompanies.filter(c => !analyzedIds.has(c.companyId!))

  if (pendingAnalysis.length === 0) {
    console.log('[Fit Analyzer] All companies analyzed, moving to synthesis')
    return {
      currentPhase: 'synthesizing' as DiscoveryPhase,
      messages: [new HumanMessage('All companies analyzed, generating summary')]
    }
  }

  console.log(`[Fit Analyzer] Analyzing ${pendingAnalysis.length} companies`)

  // Update status
  if (discoveryRunId) {
    updateDiscoveryRunStatus(discoveryRunId, 'analyzing')
  }

  // Analyze companies in parallel (batch of 3 to respect rate limits)
  const batch = pendingAnalysis.slice(0, 3)
  const analysisPromises = batch.map(async (company) => {
    try {
      const companyId = company.companyId!
      console.log(`[Fit Analyzer] Analyzing fit for: ${company.name}`)

      // Get signals and contacts for this company
      const signals = getCompanySignals(companyId)
      const contacts = getCompanyContacts(companyId)

      // Generate fit analysis
      const analysis = await generateFitAnalysis(
        companyId,
        company.name,
        signals,
        contacts,
        profile
      )

      // Save to database
      if (discoveryRunId) {
        createFitAnalysis({
          companyId,
          discoveryRunId,
          profileId,
          skillMatchScore: analysis.skillMatchScore,
          cultureMatchScore: analysis.cultureMatchScore,
          careerGrowthScore: analysis.careerGrowthScore,
          locationMatchScore: analysis.locationMatchScore,
          overallFitScore: analysis.overallFitScore,
          skillsMatchAnalysis: analysis.skillsMatchAnalysis,
          positioningStrategy: analysis.positioningStrategy,
          prioritizedContacts: analysis.prioritizedContacts,
          outreachTemplate: analysis.outreachTemplate
        })
      }

      return analysis
    } catch (error) {
      console.error(`[Fit Analyzer] Analysis failed for ${company.name}:`, error)
      return null
    }
  })

  const results = await Promise.all(analysisPromises)
  const newAnalyses = results.filter((r): r is FitAnalysisResult => r !== null)

  console.log(`[Fit Analyzer] Completed ${newAnalyses.length}/${batch.length} analyses`)

  // Check if more pending
  const totalAnalyzed = fitAnalyses.length + newAnalyses.length
  const stillPending = researchedCompanies.length - totalAnalyzed
  const nextPhase = stillPending > 0 ? 'analyzing' : 'synthesizing'

  return {
    fitAnalyses: newAnalyses,
    currentPhase: nextPhase as DiscoveryPhase,
    messages: [new HumanMessage(`Analyzed ${newAnalyses.length} companies. Total: ${totalAnalyzed}/${researchedCompanies.length}`)],
    apiCallsThisRun: newAnalyses.length
  }
}

/**
 * Determine if we should continue analyzing or move to synthesis
 */
export function shouldContinueAnalyzing(state: CompanyDiscoveryStateType): string {
  const { currentPhase, discoveredCompanies, fitAnalyses } = state

  if (currentPhase !== 'analyzing') {
    return 'orchestrator'
  }

  // Check for pending analysis
  const researchedCompanies = discoveredCompanies.filter(c => c.researchComplete && c.companyId)
  const analyzedIds = new Set(fitAnalyses.map(f => f.companyId))
  const pendingAnalysis = researchedCompanies.filter(c => !analyzedIds.has(c.companyId!))

  if (pendingAnalysis.length > 0) {
    return 'fit_analyzer'
  }

  return 'orchestrator'
}
