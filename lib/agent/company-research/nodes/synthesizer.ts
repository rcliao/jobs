import { AIMessage } from '@langchain/core/messages'
import type { CompanyResearchStateType } from '../state'
import { getResearchAgentConfig, getCompany } from '@/lib/db/company-queries'
import {
  updateCompanyResearchRun,
  updateCompany,
  updateCompanyUrls,
  saveCompanySignals,
  saveContacts
} from '@/lib/db/company-queries'
import { synthesizeResearchWithGemini, discoverCompanyUrls, mergeExtractedUrls } from '../gemini-research'
import { validateExtractedUrls } from '../url-validator'
import type { ExtractedUrlsMetadata } from '@/types'

/**
 * Synthesizer node - generates final research summary and persists to database
 */
export async function synthesizerNode(
  state: CompanyResearchStateType
): Promise<Partial<CompanyResearchStateType>> {
  const {
    companyId,
    companyName,
    companyDomain,
    researchRunId,
    collectedSignals,
    discoveredContacts,
    extractedUrls
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

      // === URL Discovery ===
      // Get company info for URL discovery
      const company = getCompany(companyId)
      const websiteUrl = company?.websiteUrl

      // Run dedicated URL discovery with targeted searches
      console.log(`Running dedicated URL discovery for ${companyName}...`)
      const discoveredUrls = await discoverCompanyUrls(companyName, companyDomain, websiteUrl)

      // Merge discovered URLs with any URLs extracted from signal searches
      const mergedUrls = mergeExtractedUrls(extractedUrls, discoveredUrls)

      // Validate merged URLs before saving
      console.log(`Validating URLs for ${companyName}...`)
      const validatedUrls = await validateExtractedUrls(mergedUrls, companyName, {
        useLLM: true,
        validateReachability: true
      })

      // Log validation results
      const validationSummary = Object.entries(validatedUrls.validationResults)
        .map(([type, result]) => `${type}: ${result.isValid ? 'valid' : 'rejected'} (${result.reason})`)
        .join(', ')
      if (validationSummary) {
        console.log(`URL validation results: ${validationSummary}`)
      }

      // Only save URLs that passed validation
      const hasValidUrls = validatedUrls.careersPageUrl ||
        validatedUrls.culturePageUrl ||
        validatedUrls.glassdoorUrl ||
        validatedUrls.crunchbaseUrl ||
        validatedUrls.foundedYear

      if (hasValidUrls) {
        const urlMetadata: ExtractedUrlsMetadata = {
          lastExtractedAt: new Date().toISOString(),
          alternativeUrls: mergedUrls.alternatives,
          extractionConfidence: mergedUrls.confidence
        }
        await updateCompanyUrls(companyId, {
          careersPageUrl: validatedUrls.careersPageUrl,
          culturePageUrl: validatedUrls.culturePageUrl,
          glassdoorUrl: validatedUrls.glassdoorUrl,
          crunchbaseUrl: validatedUrls.crunchbaseUrl,
          foundedYear: validatedUrls.foundedYear,
          metadata: urlMetadata
        })
        console.log(`Saved validated URLs for ${companyName}: careers=${validatedUrls.careersPageUrl ? 'yes' : 'no'}, culture=${validatedUrls.culturePageUrl ? 'yes' : 'no'}, glassdoor=${validatedUrls.glassdoorUrl ? 'yes' : 'no'}`)
      } else {
        console.log(`No valid URLs found for ${companyName} after validation`)
      }
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
