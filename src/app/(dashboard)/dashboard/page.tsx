import Link from "next/link"
import { redirect } from "next/navigation"
import { FolderOpen, Plus } from "lucide-react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: projects, error } = await supabase
    .from("ba_projects")
    .select("id, main_keyword, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const projectCount = projects?.length ?? 0
  const draftCount =
    projects?.filter((p) => p.status === "draft").length ?? 0
  const completedCount =
    projects?.filter((p) => p.status === "completed").length ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue, {user.email}. Gerez vos projets de contenu SEO.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projets
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
            <p className="text-xs text-muted-foreground">
              {projectCount === 0
                ? "Aucun projet pour le moment"
                : projectCount === 1
                ? "1 projet cree"
                : `${projectCount} projets crees`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">
              Projets en cours de redaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Termines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">
              Projets finalises
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Commencez un nouveau projet ou consultez vos projets existants.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Link href="/projects/new">
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Projet
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <FolderOpen className="h-4 w-4" />
              Mes Projets
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Projects */}
      {projects && projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projets recents</CardTitle>
            <CardDescription>
              Vos derniers projets de contenu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium">{project.main_keyword}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      project.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : project.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {project.status === "completed"
                      ? "Termine"
                      : project.status === "draft"
                      ? "Brouillon"
                      : project.status}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
