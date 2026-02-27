// ============================================================
// BlogAssurance — SERP Analysis API Route
// POST /api/projects/[projectId]/serp
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { analyzeSERP, getAutocomplete } from '@/lib/serp/serper'
import { extractCompetitorInsights } from '@/lib/serp/insights'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
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

    // --- Fetch project and verify ownership ---
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // --- Run SERP analysis ---
    const serpResult = await analyzeSERP(project.main_keyword, {
      gl: project.country ?? 'fr',
      hl: project.language ?? 'fr',
      num: 10,
    })

    // --- Get autocomplete suggestions ---
    const autocomplete = await getAutocomplete(project.main_keyword, {
      gl: project.country ?? 'fr',
      hl: project.language ?? 'fr',
    })

    // --- Store SERP query record ---
    const { error: queryInsertError } = await supabase.from('ba_serp_queries').insert({
      project_id: projectId,
      query: project.main_keyword,
      type: 'main',
      results_json: {
        organic: serpResult.organic,
        peopleAlsoAsk: serpResult.peopleAlsoAsk,
        relatedSearches: serpResult.relatedSearches,
        searchParameters: serpResult.searchParameters,
        autocomplete,
      },
    })

    if (queryInsertError) {
      console.error('Error inserting serp query:', queryInsertError)
    }

    // --- Store individual SERP results ---
    const serpRows = serpResult.organic.map((item) => ({
      project_id: projectId,
      position: item.position,
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      features_json: {
        domain: item.domain,
      },
    }))

    if (serpRows.length > 0) {
      // Clear previous results for this project before inserting new ones
      await supabase
        .from('ba_serp_results')
        .delete()
        .eq('project_id', projectId)

      const { error: resultsInsertError } = await supabase
        .from('ba_serp_results')
        .insert(serpRows)

      if (resultsInsertError) {
        console.error('Error inserting serp results:', resultsInsertError)
      }
    }

    // --- Extract competitor insights ---
    const insights = extractCompetitorInsights(serpResult)

    // --- Update project status to serp_done ---
    const { error: updateError } = await supabase
      .from('ba_projects')
      .update({ status: 'serp_done', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    if (updateError) {
      console.error('Error updating project status:', updateError)
    }

    // --- Return full SERP data + insights ---
    return NextResponse.json({
      serp: serpResult,
      autocomplete,
      insights,
      project: {
        ...project,
        status: 'serp_done',
      },
    })
  } catch (error) {
    console.error('SERP analysis error:', error)
    const message =
      error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
