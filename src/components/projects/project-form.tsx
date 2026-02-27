'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { SearchIntent } from '@/types'

interface ProjectFormValues {
  main_keyword: string
  intent: SearchIntent
  language: string
  country: string
  tone: string
  persona: string
  target_length: number
  constraints: string
}

export function ProjectForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    defaultValues: {
      main_keyword: '',
      intent: 'informational',
      language: 'fr',
      country: 'FR',
      tone: '',
      persona: '',
      target_length: 1500,
      constraints: '',
    },
  })

  function validate(data: ProjectFormValues): Record<string, string> | null {
    const errs: Record<string, string> = {}
    if (!data.main_keyword || data.main_keyword.trim().length === 0) {
      errs.main_keyword = 'Le mot-cle principal est requis'
    }
    if (data.main_keyword && data.main_keyword.length > 200) {
      errs.main_keyword = '200 caracteres maximum'
    }
    if (data.target_length < 300) {
      errs.target_length = 'Minimum 300 mots'
    }
    if (data.target_length > 20000) {
      errs.target_length = 'Maximum 20 000 mots'
    }
    return Object.keys(errs).length > 0 ? errs : null
  }

  async function onSubmit(data: ProjectFormValues) {
    setServerError(null)

    const validationErrors = validate(data)
    if (validationErrors) {
      setServerError(Object.values(validationErrors)[0])
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_keyword: data.main_keyword.trim(),
          intent: data.intent,
          language: data.language,
          country: data.country,
          tone: data.tone || null,
          persona: data.persona || null,
          target_length: Number(data.target_length),
          constraints: data.constraints || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setServerError(errorData.error || 'Erreur lors de la creation')
        return
      }

      const { project } = await response.json()
      router.push(`/projects/${project.id}`)
    } catch {
      setServerError('Erreur de connexion au serveur')
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nouveau projet SEO</CardTitle>
        <CardDescription>
          Definissez le brief de votre article pour lancer la pipeline de
          redaction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Mot-cle principal */}
          <div className="space-y-2">
            <Label htmlFor="main_keyword">Mot-cle principal *</Label>
            <Input
              id="main_keyword"
              placeholder="Ex: assurance habitation pas chere"
              {...register('main_keyword', {
                required: 'Le mot-cle principal est requis',
                maxLength: { value: 200, message: '200 caracteres maximum' },
              })}
            />
            {errors.main_keyword && (
              <p className="text-sm text-destructive">
                {errors.main_keyword.message}
              </p>
            )}
          </div>

          {/* Intention de recherche */}
          <div className="space-y-2">
            <Label htmlFor="intent">Intention de recherche</Label>
            <Select
              defaultValue="informational"
              onValueChange={(value) =>
                setValue(
                  'intent',
                  value as SearchIntent,
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger id="intent">
                <SelectValue placeholder="Selectionner une intention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informational">Informationnel</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="transactional">Transactionnel</SelectItem>
                <SelectItem value="navigational">Navigationnel</SelectItem>
              </SelectContent>
            </Select>
            {errors.intent && (
              <p className="text-sm text-destructive">
                {errors.intent.message}
              </p>
            )}
          </div>

          {/* Langue & Pays */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Langue</Label>
              <Select
                defaultValue="fr"
                onValueChange={(value) =>
                  setValue('language', value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Francais</SelectItem>
                  <SelectItem value="en">Anglais</SelectItem>
                  <SelectItem value="es">Espagnol</SelectItem>
                  <SelectItem value="de">Allemand</SelectItem>
                  <SelectItem value="it">Italien</SelectItem>
                  <SelectItem value="pt">Portugais</SelectItem>
                </SelectContent>
              </Select>
              {errors.language && (
                <p className="text-sm text-destructive">
                  {errors.language.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Select
                defaultValue="FR"
                onValueChange={(value) =>
                  setValue('country', value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="BE">Belgique</SelectItem>
                  <SelectItem value="CH">Suisse</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="US">Etats-Unis</SelectItem>
                  <SelectItem value="GB">Royaume-Uni</SelectItem>
                  <SelectItem value="ES">Espagne</SelectItem>
                  <SelectItem value="DE">Allemagne</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-destructive">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>

          {/* Ton */}
          <div className="space-y-2">
            <Label htmlFor="tone">Ton de l&apos;article</Label>
            <Input
              id="tone"
              placeholder="Ex: professionnel, pedagogique, conversationnel..."
              {...register('tone')}
            />
            {errors.tone && (
              <p className="text-sm text-destructive">
                {errors.tone.message}
              </p>
            )}
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <Label htmlFor="persona">Persona cible</Label>
            <Input
              id="persona"
              placeholder="Ex: proprietaire immobilier, 35-50 ans, primo-accedant"
              {...register('persona')}
            />
            {errors.persona && (
              <p className="text-sm text-destructive">
                {errors.persona.message}
              </p>
            )}
          </div>

          {/* Longueur cible */}
          <div className="space-y-2">
            <Label htmlFor="target_length">Nombre de mots cible</Label>
            <Input
              id="target_length"
              type="number"
              min={300}
              max={20000}
              step={100}
              {...register('target_length', {
                valueAsNumber: true,
                required: 'Le nombre de mots est requis',
                min: { value: 300, message: 'Minimum 300 mots' },
                max: { value: 20000, message: 'Maximum 20 000 mots' },
              })}
            />
            {errors.target_length && (
              <p className="text-sm text-destructive">
                {errors.target_length.message}
              </p>
            )}
          </div>

          {/* Contraintes */}
          <div className="space-y-2">
            <Label htmlFor="constraints">
              Contraintes ou instructions particulieres
            </Label>
            <Textarea
              id="constraints"
              placeholder="Ex: ne pas mentionner de marque concurrente, inclure un tableau comparatif..."
              rows={4}
              {...register('constraints')}
            />
            {errors.constraints && (
              <p className="text-sm text-destructive">
                {errors.constraints.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creation en cours...' : 'Creer le projet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
