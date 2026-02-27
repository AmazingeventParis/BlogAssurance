import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'
import type { Project } from '@/types'

export const metadata = {
  title: 'Mes projets - BlogAssurance',
}

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: projects } = await supabase
    .from('ba_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const typedProjects = (projects ?? []) as Project[]

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes projets</h1>
          <p className="text-muted-foreground mt-1">
            Gerez vos articles SEO et suivez leur progression.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Projet
          </Button>
        </Link>
      </div>

      {/* Projects grid or empty state */}
      {typedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Aucun projet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Vous n&apos;avez pas encore cree de projet. Commencez par definir
            un brief SEO pour votre premier article.
          </p>
          <Link href="/projects/new" className="mt-6">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Creer mon premier projet
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
