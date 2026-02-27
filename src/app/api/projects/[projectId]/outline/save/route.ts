import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { OutlineStructure } from '@/types'

export async function PATCH(
  request: Request,
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

    // ---------- Parse body ----------
    const body = await request.json()
    const structureJson = body.structure_json as OutlineStructure

    if (
      !structureJson ||
      !structureJson.title ||
      !structureJson.content_blocks ||
      !Array.isArray(structureJson.content_blocks)
    ) {
      return NextResponse.json(
        { error: 'Donnees de plan invalides' },
        { status: 422 }
      )
    }

    // ---------- Find existing outline ----------
    const { data: existingOutlines, error: fetchError } = await supabase
      .from('ba_outlines')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(1)

    if (fetchError) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation du plan' },
        { status: 500 }
      )
    }

    let savedOutline
    if (existingOutlines && existingOutlines.length > 0) {
      // Update existing outline
      const { data, error } = await supabase
        .from('ba_outlines')
        .update({
          structure_json: structureJson as unknown as Record<string, unknown>,
        })
        .eq('id', existingOutlines[0].id)
        .select()
        .single()

      if (error) {
        console.error('Error updating outline:', error)
        return NextResponse.json(
          { error: 'Erreur lors de la mise a jour du plan' },
          { status: 500 }
        )
      }
      savedOutline = data
    } else {
      // Create new outline (shouldn't normally happen in save flow, but handle gracefully)
      const { data, error } = await supabase
        .from('ba_outlines')
        .insert({
          project_id: projectId,
          structure_json: structureJson as unknown as Record<string, unknown>,
          version: 1,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating outline:', error)
        return NextResponse.json(
          { error: 'Erreur lors de la creation du plan' },
          { status: 500 }
        )
      }
      savedOutline = data
    }

    // ---------- Sync draft blocks from outline ----------
    // Delete existing draft blocks for this project (rebuild from outline)
    await supabase
      .from('ba_draft_blocks')
      .delete()
      .eq('project_id', projectId)

    // Create a draft block for each outline content block
    const draftBlocks = structureJson.content_blocks.map((block, index) => ({
      project_id: projectId,
      section_id: block.id,
      title: block.heading || null,
      content_html: '',
      status: 'pending' as const,
      version: 1,
      seo_score: null,
      word_count: 0,
      sort_order: index,
    }))

    if (draftBlocks.length > 0) {
      const { error: blocksError } = await supabase
        .from('ba_draft_blocks')
        .insert(draftBlocks)

      if (blocksError) {
        console.error('Error creating draft blocks:', blocksError)
        // Non-blocking: outline was saved, blocks creation failed
        // We still return success but warn
        return NextResponse.json({
          outline: savedOutline,
          warning: 'Le plan a ete sauvegarde mais les blocs de redaction n\'ont pas pu etre crees.',
        })
      }
    }

    // ---------- Ensure project status is at least outline_done ----------
    await supabase
      .from('ba_projects')
      .update({ status: 'outline_done', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    return NextResponse.json({ outline: savedOutline })
  } catch (error) {
    console.error('Outline save error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
