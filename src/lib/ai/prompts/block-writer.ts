// ============================================================
// BlogAssurance — Block Writer Prompt Builder
// Generates system + user prompts for individual block writing
// ============================================================

import {
  SEO_EEAT_RULES,
  SEO_FAQ_RULES,
  SEO_ANTI_AI_PATTERNS,
  SEO_KEYWORD_RULES,
  SEO_WRITING_STYLE_RULES,
  SEO_SOURCE_CITATION_RULES,
} from './seo-guidelines'

interface BlockWriterParams {
  keyword: string
  block: {
    type: 'h2' | 'h3' | 'h4' | 'paragraph' | 'list' | 'faq'
    heading: string | null
    word_count: number
    writing_directive?: string
    format_hint?: 'prose' | 'bullets' | 'table' | 'mixed'
  }
  previousHeadings: string[]
  articleTitle: string
  tone?: string | null
  persona?: string | null
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function getBlockTypeInstructions(type: string, formatHint?: string): string {
  switch (type) {
    case 'h2':
      return `
OUTPUT FORMAT for H2 section:
- Do NOT include the H2 heading tag itself — it is already rendered separately.
- Write the BODY content that appears under this H2 heading.
- Use <p> tags for paragraphs.
- You may use <h3> sub-headings within the content if needed for structure.
- Use <ul>/<ol> for lists, <strong> for emphasis, <em> for nuance.
- Format: ${formatHint === 'bullets' ? 'Primarily use bullet points and lists.' : formatHint === 'table' ? 'Include an HTML <table> if data comparison is appropriate.' : formatHint === 'mixed' ? 'Mix prose paragraphs with lists or tables as appropriate.' : 'Write in flowing prose paragraphs.'}
`
    case 'h3':
      return `
OUTPUT FORMAT for H3 section:
- Do NOT include the H3 heading tag itself — it is already rendered separately.
- Write the BODY content that appears under this H3 heading.
- Use <p> tags for paragraphs.
- Use <ul>/<ol> for lists, <strong> for emphasis.
- Format: ${formatHint === 'bullets' ? 'Primarily use bullet points and lists.' : formatHint === 'table' ? 'Include an HTML <table> if data comparison is appropriate.' : formatHint === 'mixed' ? 'Mix prose paragraphs with lists or tables as appropriate.' : 'Write in flowing prose paragraphs.'}
`
    case 'h4':
      return `
OUTPUT FORMAT for H4 section:
- Do NOT include the H4 heading tag itself — it is already rendered separately.
- Write the BODY content that appears under this H4 heading.
- Use <p> tags for short paragraphs. Keep content focused and concise.
- Format: ${formatHint === 'bullets' ? 'Use bullet points.' : 'Write concise prose.'}
`
    case 'paragraph':
      return `
OUTPUT FORMAT for standalone paragraph:
- Output one or more <p> tags.
- This is a standalone content block, not under a specific heading.
- Can include <strong>, <em>, and inline elements.
- Do not include any heading tags.
`
    case 'list':
      return `
OUTPUT FORMAT for list block:
- Output a <ul> or <ol> with <li> items.
- Each list item should be substantive (1-2 sentences), not just keywords.
- Use <strong> for the lead-in term of each item if applicable.
- Do not include heading tags.
`
    case 'faq':
      return `
OUTPUT FORMAT for FAQ block:
- Write a complete FAQ section with question/answer pairs.
- Each question should be wrapped in <h3> tags.
- Each answer should be in <p> tags below its question.
- After all the visible Q&A HTML, include a <script type="application/ld+json"> block with FAQPage schema.org structured data.
- Minimum 3 questions, maximum 7 questions.
- Questions must sound natural — as a real person would ask them.
- Answers must be concise (40-80 words each), direct, and actionable.

${SEO_FAQ_RULES}
`
    default:
      return `
OUTPUT FORMAT:
- Use appropriate HTML tags (<p>, <ul>, <ol>, <strong>, <em>).
- Do not include heading tags unless the block type requires them.
`
  }
}

function getKeywordPositionStrategy(
  previousHeadings: string[],
  totalExpectedBlocks?: number
): string {
  const position = previousHeadings.length
  const total = totalExpectedBlocks ?? 10

  if (position === 0) {
    return `KEYWORD POSITION: This is the FIRST block (introduction zone).
- You MUST include the exact main keyword within the first 2 sentences.
- Set the context and hook the reader immediately.
- The keyword should appear naturally in the opening.`
  }

  if (position <= Math.floor(total * 0.3)) {
    return `KEYWORD POSITION: This is an EARLY block.
- Include the exact main keyword at least once, ideally near the beginning of the section.
- Use 1-2 semantic variations of the keyword as well.`
  }

  if (position <= Math.floor(total * 0.7)) {
    return `KEYWORD POSITION: This is a MIDDLE block.
- Use semantic variations and LSI keywords rather than the exact keyword.
- Include the exact keyword only if it fits naturally (do not force it).
- Focus on topical depth and related concepts.`
  }

  return `KEYWORD POSITION: This is a LATE block (conclusion zone).
- Include the exact main keyword once for reinforcement.
- Use a summarizing or forward-looking tone.
- If this is the final block, do NOT write "en conclusion" — use a more natural closing.`
}

export function buildBlockWriterPrompt(params: BlockWriterParams): {
  system: string
  user: string
} {
  const { keyword, block, previousHeadings, articleTitle, tone, persona } = params
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

Your task is to write a SINGLE content block for a larger SEO-optimized article. You will receive the block type, target heading, word count, and context about where this block sits in the article structure.

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

  const keywordStrategy = getKeywordPositionStrategy(previousHeadings)

  const user = `MISSION: Write the content for a single block of the article titled "${articleTitle}".

MAIN KEYWORD: "${keyword}"

BLOCK DETAILS:
- Type: ${block.type}
- Heading: ${block.heading ?? '(no heading — standalone content block)'}
- Target word count: ~${block.word_count} words (tolerance: +/- 15%)
- Format hint: ${block.format_hint ?? 'prose'}
${contextSection}${directiveSection}
${keywordStrategy}

WORD COUNT REMINDER: Aim for approximately ${block.word_count} words. Do not write significantly more or less.

Now write the HTML content for this block.`

  return { system, user }
}
