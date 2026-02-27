// ============================================================
// BlogAssurance — SSE Streaming Block Writer/Rewriter API Route
// POST /api/projects/[projectId]/stream-block
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { streamGemini } from '@/lib/ai/gemini'
import { buildBlockWriterPrompt } from '@/lib/ai/prompts/block-writer'
import { buildBlockRewriterPrompt } from '@/lib/ai/prompts/block-rewriter'
import type { OutlineStructure, ReviewIssue } from '@/types'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

interface RequestBody {
  blockId: string
  mode?: 'write' | 'rewrite'
  reviewContext?: {
    issues: ReviewIssue[]
    globalSuggestions: string[]
  }
  userComment?: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    // --- Authenticate user ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // --- Parse request body ---
    const body = (await request.json()) as RequestBody
    const { blockId, mode = 'write', reviewContext, userComment } = body

    if (!blockId) {
      return NextResponse.json(
        { error: 'blockId est requis' },
        { status: 422 }
      )
    }

    // --- Fetch project and verify ownership ---
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projet introuvable' },
        { status: 404 }
      )
    }

    // --- Fetch the outline ---
    const { data: outline, error: outlineError } = await supabase
      .from('ba_outlines')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (outlineError || !outline) {
      return NextResponse.json(
        { error: 'Aucun plan trouve pour ce projet' },
        { status: 404 }
      )
    }

    const structure = outline.structure_json as unknown as OutlineStructure

    // --- Fetch the specific draft block ---
    const { data: draftBlock, error: blockError } = await supabase
      .from('ba_draft_blocks')
      .select('*')
      .eq('id', blockId)
      .eq('project_id', projectId)
      .single()

    if (blockError || !draftBlock) {
      return NextResponse.json(
        { error: 'Bloc introuvable' },
        { status: 404 }
      )
    }

    // --- Find matching outline block ---
    const outlineBlock = structure.content_blocks?.find(
      (b) => b.id === draftBlock.section_id
    )

    // --- Build previous headings ---
    const { data: allBlocks } = await supabase
      .from('ba_draft_blocks')
      .select('title, sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    const previousHeadings = (allBlocks ?? [])
      .filter((b) => b.sort_order < draftBlock.sort_order && b.title)
      .map((b) => b.title as string)

    // --- Update block status to writing ---
    await supabase
      .from('ba_draft_blocks')
      .update({ status: 'writing', updated_at: new Date().toISOString() })
      .eq('id', blockId)

    // --- Update project status ---
    if (mode === 'rewrite') {
      if (project.status === 'review_done') {
        await supabase
          .from('ba_projects')
          .update({ status: 'rewriting', updated_at: new Date().toISOString() })
          .eq('id', projectId)
      }
    } else {
      if (project.status !== 'writing' && project.status !== 'review_done' && project.status !== 'rewriting' && project.status !== 'completed') {
        await supabase
          .from('ba_projects')
          .update({ status: 'writing', updated_at: new Date().toISOString() })
          .eq('id', projectId)
      }
    }

    // --- Build prompt ---
    let system: string
    let userPrompt: string

    if (mode === 'rewrite') {
      const result = buildBlockRewriterPrompt({
        keyword: project.main_keyword,
        block: {
          type: outlineBlock?.type ?? 'paragraph',
          heading: draftBlock.title,
          word_count: outlineBlock?.word_count ?? draftBlock.word_count ?? 200,
          writing_directive: outlineBlock?.writing_directive,
          format_hint: outlineBlock?.format_hint,
        },
        currentContent: draftBlock.content_html || '',
        reviewIssues: reviewContext?.issues ?? [],
        globalSuggestions: reviewContext?.globalSuggestions ?? [],
        userComment,
        previousHeadings,
        articleTitle: structure.title,
        tone: project.tone,
        persona: project.persona,
      })
      system = result.system
      userPrompt = result.user
    } else {
      const result = buildBlockWriterPrompt({
        keyword: project.main_keyword,
        block: {
          type: outlineBlock?.type ?? 'paragraph',
          heading: draftBlock.title,
          word_count: outlineBlock?.word_count ?? draftBlock.word_count ?? 200,
          writing_directive: outlineBlock?.writing_directive,
          format_hint: outlineBlock?.format_hint,
        },
        previousHeadings,
        articleTitle: structure.title,
        tone: project.tone,
        persona: project.persona,
      })
      system = result.system
      userPrompt = result.user
    }

    // --- Stream Gemini response ---
    const stream = await streamGemini({
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.7,
    })

    // Wrap the stream to capture final content and save to DB when done
    const encoder = new TextEncoder()
    let fullContent = ''

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Pass through the SSE data
            controller.enqueue(value)

            // Parse the SSE data to accumulate full content
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.type === 'text' && data.text) {
                    fullContent += data.text
                  }
                } catch {
                  // Skip unparseable lines
                }
              }
            }
          }

          // --- Save final content to database ---
          const cleanContent = fullContent.trim()
          const wordCount = cleanContent
            .replace(/<[^>]*>/g, ' ')
            .split(/\s+/)
            .filter(Boolean).length

          await supabase
            .from('ba_draft_blocks')
            .update({
              content_html: cleanContent,
              status: 'done',
              word_count: wordCount,
              version: (draftBlock.version ?? 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', blockId)

          // Send a final save-confirmed event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'saved', word_count: wordCount })}\n\n`
            )
          )
        } catch (error) {
          // Update block status to error
          await supabase
            .from('ba_draft_blocks')
            .update({ status: 'error', updated_at: new Date().toISOString() })
            .eq('id', blockId)

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    // Return SSE response
    return new Response(wrappedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream block error:', error)
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
