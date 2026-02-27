'use client'

import { useState } from 'react'
import type { PeopleAlsoAsk } from '@/lib/serp/serper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PaaListProps {
  questions: PeopleAlsoAsk[]
}

function PaaItem({ item }: { item: PeopleAlsoAsk }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-medium pr-4">{item.question}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t bg-muted/20">
          {item.snippet && (
            <p className="text-sm text-muted-foreground mt-2">{item.snippet}</p>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-primary hover:underline"
            >
              Voir la source
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function PaaList({ questions }: PaaListProps) {
  if (questions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Autres questions posees ({questions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {questions.map((item, index) => (
          <PaaItem key={`${item.question}-${index}`} item={item} />
        ))}
      </CardContent>
    </Card>
  )
}
