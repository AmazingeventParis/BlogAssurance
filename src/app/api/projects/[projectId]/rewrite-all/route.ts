import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: Request, { params }: RouteParams) {
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

    // Fetch project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet non trouve' }, { status: 404 })
    }

    if (project.status !== 'review_done' && project.status !== 'rewriting') {
      return NextResponse.json(
        { error: 'Le projet doit etre en statut review_done ou rewriting' },
        { status: 400 }
      )
    }

    // Update project status to rewriting
    await supabase
      .from('ba_projects')
      .update({ status: 'rewriting', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
