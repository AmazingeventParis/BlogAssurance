import type { DraftBlock, OutlineStructure } from '@/types'

export function compileHTML(outline: OutlineStructure, blocks: DraftBlock[]): string {
  const sortedBlocks = [...blocks].sort((a, b) => a.sort_order - b.sort_order)

  let html = ''

  // Add title as H1
  html += `<h1>${escapeHtml(outline.title)}</h1>\n\n`

  for (const block of sortedBlocks) {
    if (!block.content_html) continue

    if (block.title) {
      // Determine heading level from the outline block type
      // Look up the original block type from outline
      const outlineBlock = outline.content_blocks.find(b => b.id === block.section_id)
      const type = outlineBlock?.type || 'h2'

      if (type === 'h2' || type === 'h3' || type === 'h4') {
        html += `<${type}>${escapeHtml(block.title)}</${type}>\n`
      }
    }

    html += block.content_html + '\n\n'
  }

  return html.trim()
}

export function compileFullHTML(outline: OutlineStructure, blocks: DraftBlock[]): string {
  const bodyContent = compileHTML(outline, blocks)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeAttr(outline.meta_description)}">
  <title>${escapeHtml(outline.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; color: #1a1a1a; }
    h1 { font-size: 2rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; }
    h3 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.75rem; }
    p { margin-bottom: 1rem; }
    ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    strong { font-weight: 600; }
    blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; margin: 1rem 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th { background: #f8fafc; padding: 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
    td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .faq-section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .faq-item { border-bottom: 1px solid #e2e8f0; }
    .faq-item:last-child { border-bottom: none; }
    .faq-item summary { padding: 1rem 1.5rem; font-weight: 600; cursor: pointer; }
    .faq-answer { padding: 1rem 1.5rem; background: #fafbfc; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
