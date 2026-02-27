'use client'

import type { RelatedSearch } from '@/lib/serp/serper'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RelatedSearchesProps {
  searches: RelatedSearch[]
  autocomplete?: string[]
}

export function RelatedSearches({ searches, autocomplete }: RelatedSearchesProps) {
  const hasSearches = searches.length > 0
  const hasAutocomplete = autocomplete && autocomplete.length > 0

  if (!hasSearches && !hasAutocomplete) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recherches associees
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Related searches */}
        {hasSearches && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Recherches liees
            </p>
            <div className="flex flex-wrap gap-2">
              {searches.map((search, index) => (
                <Badge key={`${search.query}-${index}`} variant="outline">
                  {search.query}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Autocomplete suggestions */}
        {hasAutocomplete && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Suggestions autocomplete
            </p>
            <div className="flex flex-wrap gap-2">
              {autocomplete.map((suggestion, index) => (
                <Badge key={`${suggestion}-${index}`} variant="secondary">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
