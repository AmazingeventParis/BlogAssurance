import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { callGeminiJSON } from '@/lib/ai/gemini'
import { buildOutlineArchitectPrompt } from '@/lib/ai/prompts/outline-architect'
import type { OutlineStructure } from '@/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    // ---------- Auth check ----------
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

    // ---------- Fetch project + ownership check ----------
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

    // ---------- Fetch SERP data if available ----------
    let serpData: {
      organic: { position: number; title: string; snippet: string; domain: string }[]
      peopleAlsoAsk: { question: string }[]
      relatedSearches: { query: string }[]
    } | undefined

    const { data: serpQueries } = await supabase
      .from('ba_serp_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (serpQueries && serpQueries.length > 0 && serpQueries[0].results_json) {
      const raw = serpQueries[0].results_json as Record<string, unknown>

      // Extract organic results from SERP data
      const organicRaw = (raw.organic as Array<Record<string, unknown>>) || []
      const organic = organicRaw.map((item, index) => ({
        position: (item.position as number) || index + 1,
        title: (item.title as string) || '',
        snippet: (item.snippet as string) || '',
        domain: (item.domain as string) || (item.link ? new URL(item.link as string).hostname : ''),
      }))

      // Extract People Also Ask
      const paaRaw = (raw.peopleAlsoAsk as Array<Record<string, unknown>>) || (raw.people_also_ask as Array<Record<string, unknown>>) || []
      const peopleAlsoAsk = paaRaw.map((item) => ({
        question: (item.question as string) || (item.title as string) || '',
      }))

      // Extract related searches
      const relatedRaw = (raw.relatedSearches as Array<Record<string, unknown>>) || (raw.related_searches as Array<Record<string, unknown>>) || []
      const relatedSearches = relatedRaw.map((item) => ({
        query: (item.query as string) || (item.title as string) || '',
      }))

      serpData = { organic, peopleAlsoAsk, relatedSearches }
    }

    // ---------- Also fetch ba_serp_results for organic data ----------
    if (!serpData) {
      const { data: serpResults } = await supabase
        .from('ba_serp_results')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })

      if (serpResults && serpResults.length > 0) {
        serpData = {
          organic: serpResults.map((r) => ({
            position: r.position || 0,
            title: r.title || '',
            snippet: r.snippet || '',
            domain: r.url ? new URL(r.url).hostname : '',
          })),
          peopleAlsoAsk: [],
          relatedSearches: [],
        }
      }
    }

    // ---------- Build prompt and call Gemini ----------
    const { system, user: userPrompt } = buildOutlineArchitectPrompt({
      keyword: project.main_keyword,
      searchIntent: project.intent,
      tone: project.tone,
      persona: project.persona,
      targetLength: project.target_length,
      serpData,
    })

    const outline = await callGeminiJSON<OutlineStructure>({
      messages: [{ role: 'user', content: userPrompt }],
      system,
      maxTokens: 8192,
      temperature: 0.7,
    })

    // ---------- Validate the outline structure ----------
    if (!outline.title || !outline.meta_description || !outline.slug || !Array.isArray(outline.content_blocks)) {
      return NextResponse.json(
        { error: 'Le plan genere est invalide. Veuillez reessayer.' },
        { status: 500 }
      )
    }

    // ---------- Check if an outline already exists ----------
    const { data: existingOutline } = await supabase
      .from('ba_outlines')
      .select('id, version')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingOutline && existingOutline.length > 0
      ? existingOutline[0].version + 1
      : 1

    // ---------- Store outline in ba_outlines ----------
    const { data: savedOutline, error: outlineError } = await supabase
      .from('ba_outlines')
      .insert({
        project_id: projectId,
        structure_json: outline as unknown as Record<string, unknown>,
        version: nextVersion,
      })
      .select()
      .single()

    if (outlineError || !savedOutline) {
      console.error('Error saving outline:', outlineError)
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde du plan' },
        { status: 500 }
      )
    }

    // ---------- Update project status ----------
    await supabase
      .from('ba_projects')
      .update({ status: 'outline_done', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    return NextResponse.json({
      outline: savedOutline,
      structure: outline,
    })
  } catch (error) {
    console.error('Outline generation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la generation du plan' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    // ---------- Auth check ----------
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

    // ---------- Ownership check ----------
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

    // ---------- Fetch latest outline ----------
    const { data: outline, error: outlineError } = await supabase
      .from('ba_outlines')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)

    if (outlineError) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation du plan' },
        { status: 500 }
      )
    }

    if (!outline || outline.length === 0) {
      return NextResponse.json({ outline: null })
    }

    return NextResponse.json({ outline: outline[0] })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
