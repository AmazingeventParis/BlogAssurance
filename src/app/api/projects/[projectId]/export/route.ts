import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { compileFullHTML, compileHTML } from '@/lib/export/html-compiler'
import type { OutlineStructure, DraftBlock } from '@/types'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    // Auth check
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

    // Verify project ownership
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

    // Fetch the latest outline
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

    // Fetch all draft blocks
    const { data: blocks, error: blocksError } = await supabase
      .from('ba_draft_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (blocksError) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des blocs' },
        { status: 500 }
      )
    }

    const outlineStructure = outline.structure_json as OutlineStructure
    const draftBlocks = (blocks || []) as DraftBlock[]

    // Determine format from query param
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'html'

    let htmlContent: string

    if (format === 'body') {
      htmlContent = compileHTML(outlineStructure, draftBlocks)
    } else {
      htmlContent = compileFullHTML(outlineStructure, draftBlocks)
    }

    const slug = outlineStructure.slug || 'article'
    const filename = `${slug}.html`

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
