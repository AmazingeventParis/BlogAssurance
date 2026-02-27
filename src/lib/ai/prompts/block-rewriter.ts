// ============================================================
// BlogAssurance — Block Rewriter Prompt Builder
// Generates system + user prompts for rewriting blocks
// using review feedback and optional user comments
// ============================================================

import {
  SEO_EEAT_RULES,
  SEO_ANTI_AI_PATTERNS,
  SEO_KEYWORD_RULES,
  SEO_WRITING_STYLE_RULES,
  SEO_SOURCE_CITATION_RULES,
} from './seo-guidelines'
import { getBlockTypeInstructions } from './block-writer'
import type { ReviewIssue } from '@/types'

interface BlockRewriterParams {
  keyword: string
  block: {
    type: 'h2' | 'h3' | 'h4' | 'paragraph' | 'list' | 'faq'
    heading: string | null
    word_count: number
    writing_directive?: string
    format_hint?: 'prose' | 'bullets' | 'table' | 'mixed'
  }
  currentContent: string
  reviewIssues: ReviewIssue[]
  globalSuggestions: string[]
  userComment?: string
  previousHeadings: string[]
  articleTitle: string
  tone?: string | null
  persona?: string | null
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function buildBlockRewriterPrompt(params: BlockRewriterParams): {
  system: string
  user: string
} {
  const {
    keyword,
    block,
    currentContent,
    reviewIssues,
    globalSuggestions,
    userComment,
    previousHeadings,
    articleTitle,
    tone,
    persona,
  } = params
  const year = getCurrentYear()

  // ---------- System prompt ----------
  const personaInstruction = persona
    ? `You are writing as: ${persona}. Adapt your voice, vocabulary, and perspective accordingly.`
    : 'You are an expert SEO web content writer specializing in French-language content.'

  const toneInstruction = tone
    ? `Writing tone: ${tone}. Maintain this tone consistently throughout the block.`
    : 'Writing tone: professional, accessible, and authoritative. Address the reader with "vous".'

  const system = `${personaInstruction}

${toneInstruction}

Your task is to REWRITE a content block for a larger SEO-optimized article. You will receive the current content, review feedback, and optionally a user comment. Your goal is to improve the block while preserving what already works well.

REWRITE MISSION:
- KEEP what is good in the current content (structure, valid information, style elements that work)
- FIX the specific issues identified by the review
- APPLY the user's comment if provided
- IMPROVE overall quality while maintaining consistency with the rest of the article
- Do NOT rewrite from scratch unless the current content is fundamentally flawed

CRITICAL RULES:
1. Output ONLY raw HTML content. No markdown. No code fences. No explanations or preamble.
2. The current year is ${year}. Use it when referencing dates, statistics, or temporal context.
3. Write in French unless explicitly told otherwise.
4. Respect the target word count within a +/- 15% tolerance.
5. Every piece of content must be ORIGINAL — do not copy or closely paraphrase common boilerplate text.

${SEO_EEAT_RULES}

${SEO_SOURCE_CITATION_RULES}

${SEO_ANTI_AI_PATTERNS}

${SEO_KEYWORD_RULES}

${SEO_WRITING_STYLE_RULES}

${getBlockTypeInstructions(block.type, block.format_hint)}

FINAL REMINDER:
- Output ONLY the HTML content. Nothing else.
- No \`\`\`html fences, no comments, no explanations.
- Start directly with the first HTML tag.`

  // ---------- User prompt ----------
  const contextSection =
    previousHeadings.length > 0
      ? `\nPREVIOUS HEADINGS IN THE ARTICLE (for continuity):\n${previousHeadings.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '\nThis is the FIRST block of the article.\n'

  const directiveSection = block.writing_directive
    ? `\nWRITING DIRECTIVE FOR THIS BLOCK:\n${block.writing_directive}\n`
    : ''

  const issuesSection =
    reviewIssues.length > 0
      ? `\nREVIEW ISSUES TO FIX IN THIS BLOCK:\n${reviewIssues
          .map(
            (issue, i) =>
              `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}${issue.suggestion ? `\n   Suggestion: ${issue.suggestion}` : ''}`
          )
          .join('\n')}\n`
      : ''

  const suggestionsSection =
    globalSuggestions.length > 0
      ? `\nGLOBAL SUGGESTIONS TO CONSIDER:\n${globalSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
      : ''

  const commentSection = userComment
    ? `\nUSER COMMENT (HIGHEST PRIORITY — address this specifically):\n${userComment}\n`
    : ''

  const user = `REWRITE MISSION: Improve the content for a block of the article titled "${articleTitle}".

MAIN KEYWORD: "${keyword}"

BLOCK DETAILS:
- Type: ${block.type}
- Heading: ${block.heading ?? '(no heading — standalone content block)'}
- Target word count: ~${block.word_count} words (tolerance: +/- 15%)
- Format hint: ${block.format_hint ?? 'prose'}
${contextSection}${directiveSection}
CURRENT CONTENT TO REWRITE:
---
${currentContent}
---
${issuesSection}${suggestionsSection}${commentSection}
WORD COUNT REMINDER: Aim for approximately ${block.word_count} words. Do not write significantly more or less.

Now rewrite the HTML content for this block, fixing the identified issues while preserving what works.`

  return { system, user }
}
