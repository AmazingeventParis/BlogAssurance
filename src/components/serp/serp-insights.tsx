'use client'

import type { CompetitorInsights } from '@/lib/serp/insights'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SerpInsightsProps {
  insights: CompetitorInsights
}

export function SerpInsights({ insights }: SerpInsightsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Average Lengths */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Longueurs moyennes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Titre</span>
            <span className="text-sm font-semibold">
              {insights.avgTitleLength} car.
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (insights.avgTitleLength / 80) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Extrait</span>
            <span className="text-sm font-semibold">
              {insights.avgSnippetLength} car.
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (insights.avgSnippetLength / 300) * 100)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Common Title Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Patterns de titres
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.commonTitlePatterns.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.commonTitlePatterns.map((pattern) => (
                <Badge key={pattern} variant="secondary">
                  {pattern}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun pattern dominant detecte.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Domains */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Domaines dominants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.topDomains.length > 0 ? (
            <ul className="space-y-2">
              {insights.topDomains.map((domain, index) => (
                <li key={domain} className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate">{domain}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun domaine trouve.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
