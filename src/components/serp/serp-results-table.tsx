'use client'

import type { SERPOrganic } from '@/lib/serp/serper'

interface SerpResultsTableProps {
  results: SERPOrganic[]
}

export function SerpResultsTable({ results }: SerpResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
        Aucun resultat organique trouve.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">
                #
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Titre
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-48">
                Domaine
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Extrait
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr
                key={result.position}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {result.position}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline line-clamp-2"
                    title={result.title}
                  >
                    {result.title}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md truncate block max-w-[180px]">
                    {result.domain}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.snippet}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
