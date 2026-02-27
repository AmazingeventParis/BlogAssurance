import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const createProjectSchema = z.object({
  main_keyword: z.string().min(1, 'Le mot-cle principal est requis').max(200),
  language: z.string().min(2).max(10).default('fr'),
  country: z.string().min(2).max(10).default('FR'),
  intent: z
    .enum(['informational', 'commercial', 'transactional', 'navigational'])
    .default('informational'),
  tone: z.string().max(100).nullable().default(null),
  persona: z.string().max(200).nullable().default(null),
  target_length: z.number().int().min(300).max(20000).default(1500),
  constraints: z.string().max(2000).nullable().default(null),
})

export async function GET() {
  try {
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

    const { data: projects, error } = await supabase
      .from('ba_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des projets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)

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
      .insert({
        user_id: user.id,
        main_keyword: parsed.data.main_keyword,
        language: parsed.data.language,
        country: parsed.data.country,
        intent: parsed.data.intent,
        tone: parsed.data.tone,
        persona: parsed.data.persona,
        target_length: parsed.data.target_length,
        constraints: parsed.data.constraints,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la creation du projet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
