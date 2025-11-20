export function containsAvoidKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) {
    return false
  }

  const normalizedText = text.toLowerCase()

  return keywords.some(keyword => {
    const trimmedKeyword = keyword.trim().toLowerCase()
    if (!trimmedKeyword) return false

    // Escape special regex characters in the keyword
    const escapedKeyword = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Use word boundaries (\b) to ensure we match whole words only
    // This prevents "Go" from matching "Google" or "Java" from matching "JavaScript"
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i')
    
    return regex.test(normalizedText)
  })
}
