// ============================================================
// BlogAssurance — Non-Streaming Block Writer API Route
// POST /api/projects/[projectId]/write-block
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { callGemini } from '@/lib/ai/gemini'
import { buildBlockWriterPrompt } from '@/lib/ai/prompts/block-writer'
import type { OutlineStructure } from '@/types'

interface RouteParams {
  params: Promise<{ projectId: string }>
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
    const body = await request.json()
    const { blockId } = body as { blockId: string }

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

    // --- Find matching outline block to get type/directive/format_hint ---
    const outlineBlock = structure.content_blocks?.find(
      (b) => b.id === draftBlock.section_id
    )

    // --- Build previous headings from blocks before this one ---
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

    // --- Build prompt ---
    const { system, user: userPrompt } = buildBlockWriterPrompt({
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

    // --- Call Gemini (non-streaming) ---
    const result = await callGemini({
      system,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.7,
    })

    const contentHtml = result.content.trim()
    const wordCount = contentHtml
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length

    // --- Update draft block with generated content ---
    const { data: updatedBlock, error: updateError } = await supabase
      .from('ba_draft_blocks')
      .update({
        content_html: contentHtml,
        status: 'done',
        word_count: wordCount,
        version: (draftBlock.version ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', blockId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating draft block:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde du bloc' },
        { status: 500 }
      )
    }

    // --- Update project status to 'writing' if not already ---
    if (project.status !== 'writing' && project.status !== 'completed') {
      await supabase
        .from('ba_projects')
        .update({ status: 'writing', updated_at: new Date().toISOString() })
        .eq('id', projectId)
    }

    return NextResponse.json({ block: updatedBlock })
  } catch (error) {
    console.error('Write block error:', error)
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
