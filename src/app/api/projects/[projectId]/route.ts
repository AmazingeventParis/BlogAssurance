import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const updateProjectSchema = z.object({
  main_keyword: z.string().min(1).max(200).optional(),
  language: z.string().min(2).max(10).optional(),
  country: z.string().min(2).max(10).optional(),
  intent: z
    .enum(['informational', 'commercial', 'transactional', 'navigational'])
    .optional(),
  status: z
    .enum(['draft', 'serp_done', 'outline_done', 'writing', 'completed'])
    .optional(),
  tone: z.string().max(100).nullable().optional(),
  persona: z.string().max(200).nullable().optional(),
  target_length: z.number().int().min(300).max(20000).optional(),
  constraints: z.string().max(2000).nullable().optional(),
})

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
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      )
    }

    const { data: project, error } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: 'Projet non trouve' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('ba_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Projet non trouve' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Donnees invalides',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      )
    }

    const { data: project, error } = await supabase
      .from('ba_projects')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour du projet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

    // Verify ownership before deletion
    const { data: existing, error: fetchError } = await supabase
      .from('ba_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Projet non trouve' },
        { status: 404 }
      )
    }

    // Delete related records first (cascade order)
    await supabase.from('ba_draft_blocks').delete().eq('project_id', projectId)
    await supabase.from('ba_outlines').delete().eq('project_id', projectId)
    await supabase.from('ba_serp_results').delete().eq('project_id', projectId)
    await supabase.from('ba_serp_queries').delete().eq('project_id', projectId)

    const { error } = await supabase
      .from('ba_projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du projet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
