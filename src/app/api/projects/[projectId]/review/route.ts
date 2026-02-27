import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { callGeminiJSON } from '@/lib/ai/gemini'
import { buildReviewCriticPrompt } from '@/lib/ai/prompts/review-critic'
import { compileHTML } from '@/lib/export/html-compiler'
import type { OutlineStructure, DraftBlock, ReviewResult } from '@/types'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      )
    }

    // Ownership check
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projet non trouve' },
        { status: 404 }
      )
    }

    // Fetch latest review
    const { data: reviews, error: reviewError } = await supabase
      .from('ba_reviews')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)

    if (reviewError) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation de la relecture' },
        { status: 500 }
      )
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ review: null })
    }

    return NextResponse.json({ review: reviews[0] })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function POST(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      )
    }

    // Fetch project with ownership check
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projet non trouve' },
        { status: 404 }
      )
    }

    // Fetch all draft blocks and verify they're all done
    const { data: blocks, error: blocksError } = await supabase
      .from('ba_draft_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (blocksError || !blocks || blocks.length === 0) {
      return NextResponse.json(
        { error: 'Aucun bloc de redaction trouve' },
        { status: 400 }
      )
    }

    const draftBlocks = blocks as DraftBlock[]
    const allDone = draftBlocks.every((b) => b.status === 'done')

    if (!allDone) {
      return NextResponse.json(
        { error: 'Tous les blocs doivent etre rediges avant la relecture' },
        { status: 400 }
      )
    }

    // Fetch outline
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

    const outlineStructure = outline.structure_json as OutlineStructure

    // Compile the full article HTML
    const articleHtml = compileHTML(outlineStructure, draftBlocks)

    // Build prompt and call AI
    const { system, user: userPrompt } = buildReviewCriticPrompt({
      keyword: project.main_keyword,
      intent: project.intent,
      articleHtml,
      articleTitle: outlineStructure.title,
      targetLength: project.target_length,
      tone: project.tone,
      persona: project.persona,
    })

    const reviewResult = await callGeminiJSON<ReviewResult>({
      messages: [{ role: 'user', content: userPrompt }],
      system,
      maxTokens: 8192,
      temperature: 0.3,
    })

    // Determine version
    const { data: existingReview } = await supabase
      .from('ba_reviews')
      .select('id, version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion =
      existingReview && existingReview.length > 0
        ? existingReview[0].version + 1
        : 1

    // Save review
    const { data: savedReview, error: saveError } = await supabase
      .from('ba_reviews')
      .insert({
        project_id: projectId,
        review_json: reviewResult as unknown as Record<string, unknown>,
        version: nextVersion,
      })
      .select()
      .single()

    if (saveError || !savedReview) {
      console.error('Error saving review:', saveError)
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde de la relecture' },
        { status: 500 }
      )
    }

    // Update project status
    await supabase
      .from('ba_projects')
      .update({
        status: 'review_done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    return NextResponse.json({
      review: savedReview,
      result: reviewResult,
    })
  } catch (error) {
    console.error('Review generation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la generation de la relecture' },
      { status: 500 }
    )
  }
}
