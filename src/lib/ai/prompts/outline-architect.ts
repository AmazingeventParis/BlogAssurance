// ============================================================
// BlogAssurance — Outline Architect Prompt Builder
// Generates system + user prompts for article outline generation
// ============================================================

import {
  SEO_EEAT_RULES,
  SEO_FAQ_RULES,
  SEO_HEADING_STRUCTURE_RULES,
  INTENT_STRATEGIES,
} from './seo-guidelines'

interface OutlineArchitectParams {
  keyword: string
  searchIntent: string
  tone?: string | null
  persona?: string | null
  targetLength: number
  serpData?: {
    organic: { position: number; title: string; snippet: string; domain: string }[]
    peopleAlsoAsk: { question: string }[]
    relatedSearches: { query: string }[]
  }
}

export function buildOutlineArchitectPrompt(params: OutlineArchitectParams): {
  system: string
  user: string
} {
  const { keyword, searchIntent, tone, persona, targetLength, serpData } = params
  const year = new Date().getFullYear()

  // Resolve intent strategy (fallback to informational)
  const intentKey = searchIntent in INTENT_STRATEGIES ? searchIntent : 'informational'
  const strategy = INTENT_STRATEGIES[intentKey]

  // ---------- System prompt ----------
  const personaSection = persona
    ? `Tu es un architecte de contenu SEO qui ecrit en tant que : ${persona}. Adapte la structure, le vocabulaire et l'angle en fonction de ce persona.`
    : `Tu es un architecte de contenu SEO expert en structuration d'articles optimises pour le referencement naturel.`

  const toneSection = tone
    ? `Ton de l'article : ${tone}. La structure doit refletee ce ton.`
    : `Ton : professionnel, accessible et autoritaire.`

  const system = `${personaSection}

${toneSection}

Tu dois creer le PLAN DETAILLE (outline) d'un article SEO optimise.

Annee en cours : ${year}. Utilise cette annee dans les references temporelles.

Langue : francais.

== REGLES E-E-A-T ==
${SEO_EEAT_RULES}

== STRUCTURE DES TITRES ==
${SEO_HEADING_STRUCTURE_RULES}

== REGLES FAQ ==
${SEO_FAQ_RULES}

== STRATEGIE POUR L'INTENTION "${intentKey.toUpperCase()}" ==
${strategy.plan}

== FORMAT DE SORTIE ==

Tu DOIS retourner un objet JSON valide avec cette structure EXACTE :

{
  "title": "Titre H1 de l'article (max 65 caracteres, contient le mot-cle principal)",
  "meta_description": "Meta description SEO (max 155 caracteres, contient le mot-cle, incite au clic)",
  "slug": "slug-url-optimise-seo",
  "content_blocks": [
    {
      "id": "uuid-unique-pour-chaque-bloc",
      "type": "paragraph | h2 | h3 | h4 | faq",
      "heading": "Titre du bloc (null pour les blocs de type paragraph)",
      "word_count": 150,
      "writing_directive": "Directive detaillee pour le redacteur : quoi ecrire, quel angle, quels points couvrir",
      "format_hint": "prose | bullets | table | mixed"
    }
  ]
}

REGLES STRICTES DU JSON :
- Chaque bloc DOIT avoir un "id" unique (genere un UUID v4 pour chaque bloc)
- Le premier bloc DOIT etre de type "paragraph" avec heading null (bloc intro)
- Les blocs de type "h2" representent les sections principales
- Les blocs "h3" doivent suivre un bloc "h2" (sous-section)
- Les blocs "h4" doivent suivre un bloc "h3" (sous-sous-section)
- Le dernier bloc (sauf si intent = discover) DOIT etre de type "faq"
- La somme des word_count de tous les blocs doit approcher le target_length (+/- 15%)
- Les writing_directive doivent etre PRECISES et ACTIONABLES (pas vagues)
- Le slug doit etre en minuscules, avec des tirets, sans accents, sans mots vides inutiles

RETOURNE UNIQUEMENT LE JSON. Pas de markdown, pas de code fences, pas d'explications.`

  // ---------- User prompt ----------
  let serpSection = ''
  if (serpData) {
    const organicLines = serpData.organic
      .slice(0, 10)
      .map((r) => `  ${r.position}. [${r.domain}] ${r.title}\n     ${r.snippet}`)
      .join('\n')

    const paaLines = serpData.peopleAlsoAsk
      .map((q) => `  - ${q.question}`)
      .join('\n')

    const relatedLines = serpData.relatedSearches
      .map((r) => `  - ${r.query}`)
      .join('\n')

    serpSection = `
== DONNEES SERP (resultats actuels de Google) ==

Resultats organiques :
${organicLines || '  (aucun resultat disponible)'}

People Also Ask :
${paaLines || '  (aucune question disponible)'}

Recherches associees :
${relatedLines || '  (aucune recherche associee)'}

UTILISE CES DONNEES POUR :
- Identifier les angles couverts par les concurrents et proposer une structure SUPERIEURE
- Integrer les questions PAA dans la FAQ ou comme H2/H3
- Enrichir le champ semantique avec les recherches associees
`
  }

  const user = `MISSION : Cree le plan detaille (outline) d'un article SEO optimise.

MOT-CLE PRINCIPAL : "${keyword}"
INTENTION DE RECHERCHE : ${searchIntent}
LONGUEUR CIBLE : ~${targetLength} mots
${serpSection}
RAPPELS :
- Structure en pyramide inversee : l'information la plus importante en premier
- Chaque H2 doit etre autonome et optimise pour les featured snippets
- Les writing_directive doivent indiquer PRECISEMENT quoi ecrire dans chaque bloc
- Le word_count de chaque bloc doit etre realiste et la somme doit approcher ${targetLength} mots
- Genere un UUID v4 unique pour chaque bloc (format : xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)

Retourne le JSON maintenant.`

  return { system, user }
}
