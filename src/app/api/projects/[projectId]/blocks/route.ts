import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet non trouve' }, { status: 404 })
    }

    const { data: blocks, error } = await supabase
      .from('ba_draft_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des blocs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ blocks: blocks ?? [] })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
