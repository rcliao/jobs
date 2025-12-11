# Search Provider Comparison

This document compares search API providers for the job search and company research system.

## Current Usage

**Provider**: Google Custom Search API

**Usage Pattern** (from company research flow):
- Up to **15 searches per company** researched
- Signal research: 11 searches (4 categories × 2-3 iterations each)
- Contact discovery: 4 searches (rotating through 11 query templates)

**Features Used**:
- `dateRestrict` parameter (e.g., `m1`, `m6`, `y1`, `y2`)
- `site:` operator in queries
- `pagemap.metatags` for published date extraction
- 10 results per query

**Example Daily Cost**: ~$12.48 for ~2,596 searches (~173-325 companies researched)

---

## Provider Comparison

### Pricing Summary

| Provider | Cost per 1,000 | Free Tier | Daily Cap |
|----------|----------------|-----------|-----------|
| **Google Custom Search** | $5.00 | 100/day | 10,000 |
| **Serper.dev** | $1.25 | 2,500 total | None |
| **Parallel** | $5.00 | 16-20k total | None |
| **Tavily** | $8.00 | 1,000/month | None |
| **SerpAPI** | $2.75-7.50 | 100/month | None |
| **Perplexity Sonar** | $5.00 + tokens | $5 credit | None |

### Cost Comparison for 2,596 Searches (Example Day)

| Provider | Estimated Cost | Savings vs Google |
|----------|----------------|-------------------|
| Google Custom Search | $12.48 | - |
| Serper.dev | $3.25 | $9.23 (74%) |
| SerpAPI (reserved) | $7.14 | $5.34 (43%) |
| Parallel | $12.98 | -$0.50 |
| Tavily | $20.77 | -$8.29 |

---

## Feature Comparison

| Feature | Google CSE | Serper.dev | Parallel | Tavily |
|---------|------------|------------|----------|--------|
| **Date filtering** | `dateRestrict` (m1, y1) | `tbs` param (qdr:m) | Unclear | `days` param |
| **Site filtering** | `siteSearch` param | `site:` in query | Supported | `include_domains` |
| **Pagemap/metadata** | Rich metatags | Limited | Limited | None |
| **News search** | Via search type | Dedicated endpoint | Supported | Supported |
| **Image search** | Supported | Supported | Unknown | Not supported |
| **Scholar search** | Not supported | Supported | Unknown | Not supported |
| **Maps/Places** | Not supported | Supported | Unknown | Not supported |
| **AI-optimized output** | No | No | Yes | Yes |
| **Page extraction** | No | No | Yes (+$0.001/page) | Yes (built-in) |
| **Rate limit** | 10k/day | High | 600/min | High |

---

## Provider Details

### Google Custom Search (Current)

**Pros**:
- Already integrated
- Rich `pagemap.metatags` for date extraction
- Reliable, well-documented
- Flexible `dateRestrict` syntax

**Cons**:
- 10,000 queries/day cap
- No AI optimization
- Middle-tier pricing

**Documentation**: https://developers.google.com/custom-search/v1/overview

### Serper.dev

**Pros**:
- **75% cheaper** than Google
- No daily cap
- Fast (1-2 second response)
- Dedicated endpoints: News, Scholar, Patents, Maps
- 2,500 free queries to test

**Cons**:
- Different date filter syntax (`tbs=qdr:m` vs `dateRestrict=m1`)
- May not return rich pagemap metatags
- Need to update date extraction logic

**Migration Effort**: Low-Medium
- Update `dateRestrict` to `tbs` parameter
- Rely more on snippet-based date parsing (already implemented as fallback)

**Documentation**: https://serper.dev/

### Parallel

**Pros**:
- AI-optimized results (better for LLM consumption)
- No daily cap
- Optional page extraction (+$0.001/page)
- May reduce downstream Gemini token costs
- Large free tier (16-20k searches)
- Founded by ex-Twitter CEO, well-funded ($100M Series A)

**Cons**:
- Same price as Google
- Newer API, less documentation
- `dateRestrict` support unclear
- No pagemap metatags

**Migration Effort**: Medium
- New response format
- May need post-query date filtering
- Update date extraction logic

**Documentation**: https://parallel.ai/

### Tavily

**Pros**:
- AI-optimized, structured output
- Built-in page extraction
- Domain filtering (`include_domains`, `exclude_domains`)
- Can return synthesized answers
- Reduces need for post-processing

**Cons**:
- **60% more expensive** than Google
- No pagemap metatags
- Different response structure

**Migration Effort**: Medium-High
- Different API structure
- New response parsing needed

**Documentation**: https://docs.tavily.com/

### SerpAPI

**Pros**:
- Full SERP features (knowledge graph, related searches)
- Only successful searches count
- Response caching
- Established since 2016

**Cons**:
- Complex pricing tiers
- Reserved vs on-demand pricing
- Higher base cost than Serper

**Documentation**: https://serpapi.com/

### Perplexity Sonar

**Pros**:
- AI-synthesized answers
- Good for complex queries
- Multiple model tiers

**Cons**:
- Token costs on top of search costs
- Better suited for research queries than bulk searches

**Documentation**: https://docs.perplexity.ai/

---

## Impact on Current Implementation

### Code Location
`lib/search/google.ts`

### Features Currently Used

```typescript
// Date restriction
url.searchParams.set('dateRestrict', dateRestrict)  // e.g., 'm1', 'y1', 'm6'

// Results per query
url.searchParams.set('num', '10')

// Date extraction from pagemap
const metatags = item.pagemap?.metatags?.[0]
const dateString = metatags['article:published_time']
  || metatags['datePublished']
  || metatags['og:updated_time']
  // ... fallback to snippet parsing
```

### Migration Considerations

| Feature | Serper Equivalent | Parallel Equivalent |
|---------|-------------------|---------------------|
| `dateRestrict=m1` | `tbs=qdr:m` | Filter post-query? |
| `dateRestrict=y1` | `tbs=qdr:y` | Filter post-query? |
| `dateRestrict=m6` | `tbs=qdr:m6` | Filter post-query? |
| `pagemap.metatags` | May have `date` field | Likely unavailable |
| `site:` in query | Same syntax | Same syntax |

---

## Recommendations

### For Cost Optimization
**Serper.dev** - Saves ~$9/day at current usage, similar feature set.

Required changes:
1. Adapt `dateRestrict` to use `tbs` parameter syntax
2. Update date extraction to rely more on snippet parsing (fallback already exists)
3. Test with free tier before switching

### For AI Quality
**Parallel** - Same cost as Google, but AI-optimized results may reduce Gemini post-processing.

Required changes:
1. New API integration
2. Handle different response format
3. Implement post-query date filtering if needed
4. Test extensively with 16-20k free searches

### Hybrid Approach
Consider abstracting the search provider to allow:
- Easy switching between providers
- A/B testing different providers
- Fallback if one provider has issues

---

## Next Steps

1. [ ] Test Serper.dev with free tier on sample company research
2. [ ] Test Parallel with free tier on sample company research
3. [ ] Compare result quality between providers
4. [ ] Create search provider abstraction layer if switching
5. [ ] Benchmark Gemini token usage with different providers

---

## References

- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [Serper.dev](https://serper.dev/)
- [Parallel AI](https://parallel.ai/)
- [Parallel Pricing](https://parallel.ai/pricing)
- [Tavily Documentation](https://docs.tavily.com/)
- [SerpAPI Pricing](https://serpapi.com/pricing)
- [Perplexity API Pricing](https://docs.perplexity.ai/getting-started/pricing)
- [Web Search APIs Comparison 2025](https://www.firecrawl.dev/blog/top_web_search_api_2025)
