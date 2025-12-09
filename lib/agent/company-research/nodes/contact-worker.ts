import { randomUUID } from 'crypto'
import { AIMessage } from '@langchain/core/messages'
import type { CompanyResearchStateType, DiscoveredContact } from '../state'
import type { ContactType } from '@/types'
import { getResearchAgentConfig } from '@/lib/db/company-queries'
import { searchGoogle } from '@/lib/search/google'
import { extractContactsWithGemini } from '../gemini-research'

// Contact discovery query templates - expanded for companies without dedicated recruiters
const CONTACT_QUERY_TEMPLATES = [
  // Leadership / C-suite
  'site:linkedin.com/in "{company}" CEO OR CTO OR "Chief Technology Officer" OR "Chief Executive"',
  'site:linkedin.com/in "{company}" "Co-founder" OR "Founder" OR "Co-Founder"',
  // Directors and VPs
  'site:linkedin.com/in "{company}" "VP Engineering" OR "VP Product" OR "Vice President"',
  'site:linkedin.com/in "{company}" "Director of Engineering" OR "Director of Product" OR "Engineering Director"',
  // Managers
  'site:linkedin.com/in "{company}" "Engineering Manager" OR "Product Manager" OR "Hiring Manager"',
  'site:linkedin.com/in "{company}" "Technical Program Manager" OR "Program Manager"',
  // Tech leads and senior ICs
  'site:linkedin.com/in "{company}" "Tech Lead" OR "Staff Engineer" OR "Principal Engineer"',
  'site:linkedin.com/in "{company}" "Senior Software Engineer" OR "Lead Engineer"',
  // Recruiters (still useful for larger companies)
  'site:linkedin.com/in "{company}" recruiter OR "talent acquisition" OR "people operations"',
  // Alternative sources - company announcements
  '"{company}" "head of engineering" OR "engineering lead" announcement OR hired OR joins',
  '"{company}" startup founder CTO CEO site:techcrunch.com OR site:crunchbase.com OR site:linkedin.com'
]

/**
 * Contact Worker node - discovers key contacts at the target company
 */
export async function contactWorkerNode(
  state: CompanyResearchStateType
): Promise<Partial<CompanyResearchStateType>> {
  const { companyName, contactIteration, discoveredContacts } = state

  // Load config
  const config = await getResearchAgentConfig('contact_worker')
  const maxContacts = config?.behaviorConfig.maxContacts ?? 10
  const enabledContactTypes = config?.behaviorConfig.contactTypes ?? [
    'founder', 'executive', 'director', 'manager',
    'team_lead', 'hiring_manager', 'recruiter'
  ] as ContactType[]

  // Get query templates (from config or defaults)
  const templates = config?.toolsConfig.customQueryTemplates?.length
    ? config.toolsConfig.customQueryTemplates
    : CONTACT_QUERY_TEMPLATES

  // Select query for this iteration
  const queryIndex = contactIteration.iteration % templates.length
  const queryTemplate = templates[queryIndex]
  const query = queryTemplate
    .replace(/\{company\}/g, companyName)
    .replace(/"{company}"/g, `"${companyName}"`)

  try {
    // Execute search (no date restriction for people search)
    const results = await searchGoogle(query, '')

    if (results.length === 0) {
      return {
        contactIteration: {
          ...contactIteration,
          iteration: contactIteration.iteration + 1
        },
        apiCallsThisRun: 1,
        messages: [new AIMessage(`No contact search results found for iteration ${contactIteration.iteration + 1}.`)]
      }
    }

    // Extract contacts with Gemini
    const extractedContacts = await extractContactsWithGemini(
      results,
      companyName,
      config?.systemPrompt
    )

    // Filter by enabled contact types
    const filteredContacts = extractedContacts.filter(
      c => enabledContactTypes.includes(c.contactType)
    )

    // Deduplicate against existing contacts (by LinkedIn URL or name+title)
    const existingUrls = new Set(discoveredContacts.map(c => c.linkedinUrl).filter(Boolean))
    const existingNameTitles = new Set(discoveredContacts.map(c => `${c.name}|${c.title}`))

    const uniqueContacts: DiscoveredContact[] = filteredContacts
      .filter(c => {
        if (c.linkedinUrl && existingUrls.has(c.linkedinUrl)) return false
        if (existingNameTitles.has(`${c.name}|${c.title}`)) return false
        return true
      })
      .map(c => ({
        id: randomUUID(),
        name: c.name,
        title: c.title,
        linkedinUrl: c.linkedinUrl,
        email: c.email || null,
        contactType: c.contactType,
        relevanceScore: c.relevanceScore,
        source: 'Google Search'
      }))

    // Limit to max contacts
    const totalContacts = discoveredContacts.length + uniqueContacts.length
    const contactsToAdd = uniqueContacts.slice(0, Math.max(0, maxContacts - discoveredContacts.length))

    return {
      discoveredContacts: contactsToAdd,
      contactIteration: {
        iteration: contactIteration.iteration + 1,
        maxIterations: contactIteration.maxIterations,
        contactsFound: totalContacts
      },
      apiCallsThisRun: 2, // 1 search + 1 LLM call
      messages: [new AIMessage(
        `Found ${contactsToAdd.length} new contacts (${discoveredContacts.length + contactsToAdd.length} total).`
      )]
    }
  } catch (error) {
    console.error('Contact worker error:', error)

    return {
      contactIteration: {
        ...contactIteration,
        iteration: contactIteration.maxIterations // Stop on error
      },
      errors: [`Contact worker error: ${error}`]
    }
  }
}
