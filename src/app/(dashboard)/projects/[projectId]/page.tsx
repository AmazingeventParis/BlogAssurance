import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import {
  FileText,
  Search,
  ListTree,
  PenLine,
  ClipboardCheck,
  Download,
  ArrowLeft,
  Trash2,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProjectStatusBadge } from '@/components/projects/project-status-badge'
import type { Project, Outline, DraftBlock, ProjectStatus } from '@/types'
import { INTENT_LABELS } from '@/types'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'

interface PageProps {
  params: Promise<{ projectId: string }>
}

// Pipeline step ordering
const PIPELINE_STEPS: {
  key: string
  label: string
  icon: typeof FileText
  href: (id: string) => string | null
  minStatus: ProjectStatus[]
  activeStatus: ProjectStatus[]
}[] = [
  {
    key: 'brief',
    label: 'Brief',
    icon: FileText,
    href: () => null,
    minStatus: ['draft', 'serp_done', 'outline_done', 'writing', 'review_done', 'completed'],
    activeStatus: ['draft'],
  },
  {
    key: 'serp',
    label: 'SERP',
    icon: Search,
    href: (id) => `/projects/${id}/serp`,
    minStatus: ['draft', 'serp_done', 'outline_done', 'writing', 'review_done', 'completed'],
    activeStatus: ['serp_done'],
  },
  {
    key: 'outline',
    label: 'Outline',
    icon: ListTree,
    href: (id) => `/projects/${id}/outline`,
    minStatus: ['serp_done', 'outline_done', 'writing', 'review_done', 'completed'],
    activeStatus: ['outline_done'],
  },
  {
    key: 'write',
    label: 'Redaction',
    icon: PenLine,
    href: (id) => `/projects/${id}/write`,
    minStatus: ['outline_done', 'writing', 'review_done', 'completed'],
    activeStatus: ['writing'],
  },
  {
    key: 'review',
    label: 'Relecture',
    icon: ClipboardCheck,
    href: (id) => `/projects/${id}/review`,
    minStatus: ['writing', 'review_done', 'completed'],
    activeStatus: ['review_done'],
  },
  {
    key: 'export',
    label: 'Export',
    icon: Download,
    href: (id) => `/projects/${id}/export`,
    minStatus: ['review_done', 'completed'],
    activeStatus: ['completed'],
  },
]

const STATUS_ORDER: ProjectStatus[] = [
  'draft',
  'serp_done',
  'outline_done',
  'writing',
  'review_done',
  'completed',
]

function getStatusIndex(status: ProjectStatus): number {
  return STATUS_ORDER.indexOf(status)
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('ba_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  const typedProject = project as Project

  // Fetch outline (latest version)
  const { data: outlineData } = await supabase
    .from('ba_outlines')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const outline = outlineData as Outline | null

  // Fetch draft blocks
  const { data: blocksData } = await supabase
    .from('ba_draft_blocks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  const draftBlocks = (blocksData ?? []) as DraftBlock[]

  const currentStatusIndex = getStatusIndex(typedProject.status)
  const createdDate = new Date(typedProject.created_at).toLocaleDateString(
    'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )
  const updatedDate = new Date(typedProject.updated_at).toLocaleDateString(
    'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  )

  // Count block stats
  const totalBlocks = draftBlocks.length
  const completedBlocks = draftBlocks.filter((b) => b.status === 'done').length
  const totalWords = draftBlocks.reduce((sum, b) => sum + b.word_count, 0)

  return (
    <div className="container max-w-5xl py-8">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Retour aux projets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {typedProject.main_keyword}
            </h1>
            <ProjectStatusBadge status={typedProject.status} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {INTENT_LABELS[typedProject.intent]}
            </Badge>
            <span>
              {typedProject.language.toUpperCase()} /{' '}
              {typedProject.country.toUpperCase()}
            </span>
            <span>Cree le {createdDate}</span>
          </div>
        </div>
        <DeleteProjectButton projectId={typedProject.id} />
      </div>

      {/* Visual Pipeline Stepper */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline de redaction</CardTitle>
          <CardDescription>
            Progression de votre article a travers les etapes de production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {PIPELINE_STEPS.map((step, index) => {
              const stepMinStatusIndex = Math.min(
                ...step.minStatus.map((s) => getStatusIndex(s))
              )
              const isReached = currentStatusIndex >= stepMinStatusIndex
              const isActive = step.activeStatus.includes(typedProject.status)
              const isCompleted = currentStatusIndex > getStatusIndex(step.activeStatus[0])
              const href = step.href(typedProject.id)
              const isClickable = isReached && href !== null

              const StepIcon = step.icon

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    {isClickable ? (
                      <Link href={href}>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                            isCompleted
                              ? 'border-green-500 bg-green-50 text-green-600'
                              : isActive
                                ? 'border-primary bg-primary/10 text-primary'
                                : isReached
                                  ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                                  : 'border-muted bg-muted/50 text-muted-foreground/40'
                          }`}
                        >
                          <StepIcon className="h-5 w-5" />
                        </div>
                      </Link>
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          isCompleted
                            ? 'border-green-500 bg-green-50 text-green-600'
                            : isActive
                              ? 'border-primary bg-primary/10 text-primary'
                              : isReached
                                ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                                : 'border-muted bg-muted/50 text-muted-foreground/40'
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                    )}
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isCompleted
                          ? 'text-green-600'
                          : isActive
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                        currentStatusIndex > getStatusIndex(step.activeStatus[0])
                          ? 'bg-green-400'
                          : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Details & Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations du brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Mot-cle principal
              </p>
              <p className="text-sm">{typedProject.main_keyword}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Intention
                </p>
                <p className="text-sm">
                  {INTENT_LABELS[typedProject.intent]}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Longueur cible
                </p>
                <p className="text-sm">{typedProject.target_length} mots</p>
              </div>
            </div>
            {typedProject.tone && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ton
                  </p>
                  <p className="text-sm">{typedProject.tone}</p>
                </div>
              </>
            )}
            {typedProject.persona && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Persona
                  </p>
                  <p className="text-sm">{typedProject.persona}</p>
                </div>
              </>
            )}
            {typedProject.constraints && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Contraintes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {typedProject.constraints}
                  </p>
                </div>
              </>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">
              Derniere mise a jour : {updatedDate}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
            <CardDescription>
              Lancez chaque etape de la pipeline dans l&apos;ordre.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SERP Analysis */}
            <Link href={`/projects/${typedProject.id}/serp`} className="block">
              <Button
                variant={currentStatusIndex >= 0 ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={false}
              >
                <Search className="mr-2 h-4 w-4" />
                {currentStatusIndex >= 1
                  ? 'Voir l\'analyse SERP'
                  : 'Lancer l\'analyse SERP'}
              </Button>
            </Link>

            {/* Outline Generation */}
            <Link
              href={`/projects/${typedProject.id}/outline`}
              className="block"
            >
              <Button
                variant={currentStatusIndex >= 1 ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={currentStatusIndex < 1}
              >
                <ListTree className="mr-2 h-4 w-4" />
                {currentStatusIndex >= 2
                  ? 'Voir le plan'
                  : 'Generer le plan'}
              </Button>
            </Link>

            {/* Writing */}
            <Link
              href={`/projects/${typedProject.id}/write`}
              className="block"
            >
              <Button
                variant={currentStatusIndex >= 2 ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={currentStatusIndex < 2}
              >
                <PenLine className="mr-2 h-4 w-4" />
                {currentStatusIndex >= 3
                  ? 'Continuer la redaction'
                  : 'Lancer la redaction'}
              </Button>
            </Link>

            {/* Review */}
            <Link
              href={`/projects/${typedProject.id}/review`}
              className="block"
            >
              <Button
                variant={currentStatusIndex >= 3 ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={currentStatusIndex < 3}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {currentStatusIndex >= 4
                  ? 'Voir la relecture'
                  : 'Lancer la relecture'}
              </Button>
            </Link>

            {/* Export */}
            <Link
              href={`/projects/${typedProject.id}/export`}
              className="block"
            >
              <Button
                variant={currentStatusIndex >= 5 ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={currentStatusIndex < 4}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter l&apos;article
              </Button>
            </Link>

            {/* Stats section */}
            {totalBlocks > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Progression de redaction</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-lg font-bold">{completedBlocks}/{totalBlocks}</p>
                      <p className="text-xs text-muted-foreground">Sections</p>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-lg font-bold">{totalWords}</p>
                      <p className="text-xs text-muted-foreground">Mots</p>
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <p className="text-lg font-bold">
                        {typedProject.target_length > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (totalWords / typedProject.target_length) * 100
                              )
                            )
                          : 0}
                        %
                      </p>
                      <p className="text-xs text-muted-foreground">Objectif</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Outline preview */}
            {outline && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Apercu du plan</h4>
                  <p className="text-sm text-muted-foreground">
                    {outline.structure_json?.title || 'Sans titre'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version {outline.version} -{' '}
                    {outline.structure_json?.content_blocks?.length ?? 0} sections
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
