import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50">
      <div className="max-w-2xl mx-auto text-center space-y-8 px-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            BlogAssurance
          </h1>
          <p className="text-xl text-muted-foreground">
            Plateforme de creation de contenu SEO optimise pour le secteur de
            l&apos;assurance. Generez des articles de qualite en quelques clics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto">
              Se connecter
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Creer un compte
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
          <div className="space-y-2">
            <h3 className="font-semibold">Analyse SERP</h3>
            <p className="text-sm text-muted-foreground">
              Analysez les resultats de recherche pour identifier les meilleures
              opportunites de contenu.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Plans detailles</h3>
            <p className="text-sm text-muted-foreground">
              Generez des plans d&apos;articles structures et optimises pour le
              referencement naturel.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Redaction IA</h3>
            <p className="text-sm text-muted-foreground">
              Redigez des articles complets avec l&apos;aide de
              l&apos;intelligence artificielle.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
