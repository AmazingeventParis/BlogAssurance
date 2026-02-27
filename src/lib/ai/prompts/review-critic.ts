// ============================================================
// BlogAssurance — Review Critic Prompt Builder
// Generates system + user prompts for expert article review
// ============================================================

import { INTENT_STRATEGIES } from './seo-guidelines'

interface ReviewCriticParams {
  keyword: string
  intent: string
  articleHtml: string
  articleTitle: string
  targetLength: number
  tone?: string | null
  persona?: string | null
}

export function buildReviewCriticPrompt(params: ReviewCriticParams): {
  system: string
  user: string
} {
  const { keyword, intent, articleHtml, articleTitle, targetLength, tone, persona } = params

  const intentCritique = INTENT_STRATEGIES[intent]?.critique ?? ''

  const system = `Tu es un expert senior en redaction SEO francophone et en assurance. Ton role est de relire un article complet avec un regard CRITIQUE et EXIGEANT.

Tu evalues l'article sur 5 dimensions :
1. **Exactitude** (accuracy) : Les affirmations factuelles sont-elles correctes ? Y a-t-il des erreurs, des approximations ou des informations obsoletes ?
2. **Sources** (sources) : Les citations de sources sont-elles presentes, plausibles et bien placees ? Le E-E-A-T est-il respecte ?
3. **Coherence** (coherence) : L'article est-il logique du debut a la fin ? Y a-t-il des contradictions, des repetitions ou des ruptures de ton ?
4. **Completude** (completeness) : Le sujet est-il traite de maniere exhaustive ? Manque-t-il des aspects importants ?
5. **SEO** (seo) : Le mot-cle est-il bien place ? La structure Hn est-elle correcte ? Le maillage semantique est-il suffisant ?

Pour chaque dimension, attribue un score de 0 a 100 et liste les problemes trouves.

${intentCritique ? `CRITERES SPECIFIQUES A L'INTENTION "${intent}" :\n${intentCritique}\n` : ''}

REGLES DE NOTATION :
- 90-100 : Excellent, quasi rien a redire
- 70-89 : Bon, quelques ameliorations mineures
- 50-69 : Moyen, des problemes significatifs a corriger
- 30-49 : Insuffisant, revision majeure necessaire
- 0-29 : Tres faible, reecriture necessaire

SEVERITE DES PROBLEMES :
- "critical" : Erreur factuelle grave, information dangereuse ou trompeuse
- "major" : Probleme important affectant la qualite (manque de sources, incoherence logique, SEO defaillant)
- "minor" : Amelioration souhaitable mais non bloquante (style, formulation, detail manquant)

Tu DOIS repondre UNIQUEMENT en JSON valide, sans markdown, sans code fences, sans explication.`

  const user = `MISSION : Relire et evaluer cet article SEO.

MOT-CLE PRINCIPAL : "${keyword}"
TITRE : "${articleTitle}"
LONGUEUR CIBLE : ${targetLength} mots
${tone ? `TON ATTENDU : ${tone}` : ''}
${persona ? `PERSONA : ${persona}` : ''}

ARTICLE COMPLET (HTML) :
---
${articleHtml}
---

Reponds avec ce JSON exact (pas de markdown, pas de code fences) :
{
  "overall_score": <number 0-100>,
  "dimensions": {
    "accuracy": {
      "score": <number 0-100>,
      "label": "Exactitude",
      "summary": "<1-2 phrases bilan>",
      "issues": [
        {
          "dimension": "accuracy",
          "severity": "critical|major|minor",
          "location": "<section ou heading concerne>",
          "description": "<description du probleme>",
          "suggestion": "<suggestion de correction>"
        }
      ]
    },
    "sources": {
      "score": <number 0-100>,
      "label": "Sources",
      "summary": "<1-2 phrases bilan>",
      "issues": [...]
    },
    "coherence": {
      "score": <number 0-100>,
      "label": "Coherence",
      "summary": "<1-2 phrases bilan>",
      "issues": [...]
    },
    "completeness": {
      "score": <number 0-100>,
      "label": "Completude",
      "summary": "<1-2 phrases bilan>",
      "issues": [...]
    },
    "seo": {
      "score": <number 0-100>,
      "label": "SEO",
      "summary": "<1-2 phrases bilan>",
      "issues": [...]
    }
  },
  "suggestions": [
    "<suggestion globale 1>",
    "<suggestion globale 2>",
    "<suggestion globale 3>"
  ]
}`

  return { system, user }
}
