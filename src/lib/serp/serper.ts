// ============================================================
// BlogAssurance — Serper.dev SERP Client
// ============================================================

export interface SERPResult {
  organic: SERPOrganic[]
  peopleAlsoAsk: PeopleAlsoAsk[]
  relatedSearches: RelatedSearch[]
  searchParameters: { q: string; gl: string; hl: string }
}

export interface SERPOrganic {
  position: number
  title: string
  link: string
  snippet: string
  domain: string
}

export interface PeopleAlsoAsk {
  question: string
  snippet: string
  link: string
}

export interface RelatedSearch {
  query: string
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Analyze SERP results for a given keyword using Serper.dev API.
 */
export async function analyzeSERP(
  keyword: string,
  options?: { gl?: string; hl?: string; num?: number }
): Promise<SERPResult> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('SERPER_API_KEY not configured')

  const gl = options?.gl ?? 'fr'
  const hl = options?.hl ?? 'fr'
  const num = options?.num ?? 10

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: keyword, gl, hl, num }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown')
    throw new Error(`Serper API ${response.status}: ${body}`)
  }

  const raw = await response.json()

  // Map organic results to normalized shape
  const organic: SERPOrganic[] = (raw.organic ?? []).map(
    (item: Record<string, unknown>, index: number) => ({
      position: (item.position as number) ?? index + 1,
      title: (item.title as string) ?? '',
      link: (item.link as string) ?? '',
      snippet: (item.snippet as string) ?? '',
      domain: extractDomain((item.link as string) ?? ''),
    })
  )

  // Map People Also Ask
  const peopleAlsoAsk: PeopleAlsoAsk[] = (raw.peopleAlsoAsk ?? []).map(
    (item: Record<string, unknown>) => ({
      question: (item.question as string) ?? '',
      snippet: (item.snippet as string) ?? '',
      link: (item.link as string) ?? '',
    })
  )

  // Map Related Searches
  const relatedSearches: RelatedSearch[] = (raw.relatedSearches ?? []).map(
    (item: Record<string, unknown>) => ({
      query: (item.query as string) ?? '',
    })
  )

  return {
    organic,
    peopleAlsoAsk,
    relatedSearches,
    searchParameters: {
      q: keyword,
      gl,
      hl,
    },
  }
}

/**
 * Get autocomplete suggestions for a keyword using Serper.dev API.
 */
export async function getAutocomplete(
  keyword: string,
  options?: { gl?: string; hl?: string }
): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('SERPER_API_KEY not configured')

  const response = await fetch('https://google.serper.dev/autocomplete', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: keyword,
      gl: options?.gl ?? 'fr',
      hl: options?.hl ?? 'fr',
    }),
  })

  if (!response.ok) {
    throw new Error(`Serper autocomplete ${response.status}`)
  }

  const raw = await response.json()
  return (raw.suggestions ?? []).map((s: { value: string }) => s.value)
}
