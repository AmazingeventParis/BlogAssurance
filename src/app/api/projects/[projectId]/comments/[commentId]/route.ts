import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ projectId: string; commentId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commentId } = await params
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Verify ownership
    const { data: project, error: projectError } = await supabase
      .from('ba_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet non trouve' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body as { status: 'pending' | 'applied' }

    if (!status || !['pending', 'applied'].includes(status)) {
      return NextResponse.json(
        { error: 'Status invalide (pending ou applied)' },
        { status: 422 }
      )
    }

    const { data: comment, error } = await supabase
      .from('ba_block_comments')
      .update({ status })
      .eq('id', commentId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (error || !comment) {
      return NextResponse.json(
        { error: 'Commentaire non trouve' },
        { status: 404 }
      )
    }

    return NextResponse.json({ comment })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
