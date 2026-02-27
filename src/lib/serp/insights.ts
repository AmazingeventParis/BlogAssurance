// ============================================================
// BlogAssurance — Competitor Insights Extraction
// ============================================================

import type { SERPResult } from './serper'

export interface CompetitorInsights {
  avgTitleLength: number
  avgSnippetLength: number
  commonTitlePatterns: string[]
  topDomains: string[]
  paaQuestions: string[]
}

// Title pattern detectors
const PATTERN_DETECTORS: { name: string; test: (title: string) => boolean }[] = [
  {
    name: 'Listicle',
    test: (t) => /^\d+\s/.test(t) || /\btop\s+\d+/i.test(t),
  },
  {
    name: 'Guide',
    test: (t) => /\bguide\b/i.test(t) || /\bguide\b/i.test(t),
  },
  {
    name: 'Year',
    test: (t) => /\b20\d{2}\b/.test(t),
  },
  {
    name: 'Comparison',
    test: (t) => /\bvs\.?\b/i.test(t) || /\bcompar/i.test(t) || /\bversus\b/i.test(t),
  },
  {
    name: 'Question',
    test: (t) =>
      /^(comment|pourquoi|quand|combien|quel|how|what|why|when|where|who)\b/i.test(t) ||
      /\?$/.test(t.trim()),
  },
  {
    name: 'Superlative',
    test: (t) =>
      /\b(meilleur|best|top|ultime|ultimate|definiti|complet|essential)\b/i.test(t),
  },
  {
    name: 'How-to',
    test: (t) => /\b(comment|how\s+to|tuto|tutoriel)\b/i.test(t),
  },
]

/**
 * Extract competitive intelligence from SERP results.
 */
export function extractCompetitorInsights(serp: SERPResult): CompetitorInsights {
  const { organic, peopleAlsoAsk } = serp

  // --- Average title and snippet lengths ---
  const titleLengths = organic.map((r) => r.title.length)
  const snippetLengths = organic.map((r) => r.snippet.length)

  const avgTitleLength =
    titleLengths.length > 0
      ? Math.round(titleLengths.reduce((a, b) => a + b, 0) / titleLengths.length)
      : 0

  const avgSnippetLength =
    snippetLengths.length > 0
      ? Math.round(snippetLengths.reduce((a, b) => a + b, 0) / snippetLengths.length)
      : 0

  // --- Detect common title patterns ---
  const patternCounts: Record<string, number> = {}

  for (const result of organic) {
    for (const detector of PATTERN_DETECTORS) {
      if (detector.test(result.title)) {
        patternCounts[detector.name] = (patternCounts[detector.name] ?? 0) + 1
      }
    }
  }

  // A pattern is "common" if it appears in at least 2 results (or 20% of results)
  const threshold = Math.max(2, Math.floor(organic.length * 0.2))
  const commonTitlePatterns = Object.entries(patternCounts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  // --- Top domains by frequency ---
  const domainCounts: Record<string, number> = {}
  for (const result of organic) {
    if (result.domain) {
      domainCounts[result.domain] = (domainCounts[result.domain] ?? 0) + 1
    }
  }

  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain]) => domain)

  // --- PAA questions ---
  const paaQuestions = peopleAlsoAsk.map((paa) => paa.question)

  return {
    avgTitleLength,
    avgSnippetLength,
    commonTitlePatterns,
    topDomains,
    paaQuestions,
  }
}
