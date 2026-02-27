import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Optional filter by blockId
    const blockId = request.nextUrl.searchParams.get('blockId')

    let query = supabase
      .from('ba_block_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (blockId) {
      query = query.eq('block_id', blockId)
    }

    const { data: comments, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des commentaires' },
        { status: 500 }
      )
    }

    return NextResponse.json({ comments: comments ?? [] })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { blockId, commentText } = body as {
      blockId: string
      commentText: string
    }

    if (!blockId || !commentText?.trim()) {
      return NextResponse.json(
        { error: 'blockId et commentText sont requis' },
        { status: 422 }
      )
    }

    const { data: comment, error } = await supabase
      .from('ba_block_comments')
      .insert({
        block_id: blockId,
        project_id: projectId,
        comment_text: commentText.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la creation du commentaire' },
        { status: 500 }
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
