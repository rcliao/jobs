import { AIMessage } from '@langchain/core/messages'
import type { CompanyResearchStateType } from '../state'
import { getResearchAgentConfig } from '@/lib/db/company-queries'
import {
  updateCompanyResearchRun,
  updateCompany,
  saveCompanySignals,
  saveContacts,
  getCompanyResearchRun
} from '@/lib/db/company-queries'
import { synthesizeResearchWithGemini } from '../gemini-research'
import type { SignalCategory } from '@/types'

/**
 * Synthesizer node - generates final research summary and persists to database
 */
export async function synthesizerNode(
  state: CompanyResearchStateType
): Promise<Partial<CompanyResearchStateType>> {
  const {
    companyId,
    companyName,
    researchRunId,
    collectedSignals,
    discoveredContacts
  } = state

  // Load config
  const config = await getResearchAgentConfig('synthesizer')

  try {
    // Generate research summary with Gemini
    const synthesisResult = await synthesizeResearchWithGemini(
      companyName,
      collectedSignals,
      discoveredContacts,
      config?.systemPrompt,
      config?.behaviorConfig.scoringWeights
    )

    const { summary, score, keyInsights, recommendedApproach } = synthesisResult

    // Persist to database
    if (companyId && researchRunId) {
      // Save signals
      const signalsToSave = collectedSignals.map(s => ({
        category: s.category,
        content: s.content,
        source: s.source,
        sourceUrl: s.sourceUrl,
        confidence: s.confidence,
        signalDate: s.publishedAt ? new Date(s.publishedAt) : null,
        rawSnippet: s.rawSnippet
      }))
      await saveCompanySignals(companyId, researchRunId, signalsToSave)

      // Save contacts
      const contactsToSave = discoveredContacts.map(c => ({
        name: c.name,
        title: c.title,
        contactType: c.contactType,
        linkedinUrl: c.linkedinUrl,
        email: c.email,
        source: c.source,
        relevanceScore: c.relevanceScore,
        notes: null as string | null,
        outreachStatus: 'not_contacted' as const,
        lastContactedAt: null as Date | null
      }))
      await saveContacts(companyId, researchRunId, contactsToSave)

      // Update research run with summary
      await updateCompanyResearchRun(researchRunId, {
        status: 'complete',
        summary: summary,
        signalsFound: collectedSignals.length,
        contactsFound: discoveredContacts.length
      })

      // Update company score
      await updateCompany(companyId, {
        overallScore: score,
        researchStatus: 'researched',
        lastResearchedAt: new Date()
      })
    }

    // Format the summary message
    const insightsText = keyInsights && keyInsights.length > 0
      ? `\n\nKey Insights:\n${keyInsights.map((i: string) => `- ${i}`).join('\n')}`
      : ''

    const approachText = recommendedApproach
      ? `\n\nRecommended Approach: ${recommendedApproach}`
      : ''

    return {
      currentPhase: 'complete',
      researchSummary: summary,
      companyScore: score,
      apiCallsThisRun: 1,
      messages: [new AIMessage(
        `Research complete for ${companyName}.\n\n` +
        `Score: ${score}/10\n\n` +
        `Signals Found: ${collectedSignals.length}\n` +
        `Contacts Found: ${discoveredContacts.length}\n\n` +
        `Summary:\n${summary}` +
        insightsText +
        approachText
      )]
    }
  } catch (error) {
    console.error('Synthesizer error:', error)

    // Update research run as failed
    if (researchRunId) {
      await updateCompanyResearchRun(researchRunId, {
        status: 'failed',
        errorMessage: `Synthesis error: ${error}`
      })
    }

    if (companyId) {
      await updateCompany(companyId, {
        researchStatus: 'failed'
      })
    }

    return {
      currentPhase: 'error',
      errors: [`Synthesis error: ${error}`]
    }
  }
}
