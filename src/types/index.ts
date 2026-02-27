export type ProjectStatus = 'draft' | 'serp_done' | 'outline_done' | 'writing' | 'completed'
export type BlockStatus = 'pending' | 'writing' | 'done' | 'error'
export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational'

export interface Project {
  id: string
  user_id: string
  main_keyword: string
  language: string
  country: string
  intent: SearchIntent
  status: ProjectStatus
  tone: string | null
  persona: string | null
  target_length: number
  constraints: string | null
  created_at: string
  updated_at: string
}

export interface SerpQuery {
  id: string
  project_id: string
  query: string
  type: string
  results_json: unknown
  created_at: string
}

export interface SerpResult {
  id: string
  project_id: string
  position: number
  title: string
  url: string
  snippet: string
  features_json: unknown
  created_at: string
}

export interface Outline {
  id: string
  project_id: string
  structure_json: OutlineStructure
  version: number
  created_at: string
}

export interface OutlineStructure {
  title: string
  meta_description: string
  slug: string
  content_blocks: OutlineBlock[]
}

export interface OutlineBlock {
  id: string
  type: 'h2' | 'h3' | 'h4' | 'paragraph' | 'list' | 'faq'
  heading: string | null
  word_count: number
  writing_directive: string
  format_hint: 'prose' | 'bullets' | 'table' | 'mixed'
}

export interface DraftBlock {
  id: string
  project_id: string
  section_id: string
  title: string | null
  content_html: string
  status: BlockStatus
  version: number
  seo_score: number | null
  word_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Brouillon',
  serp_done: 'SERP analysee',
  outline_done: 'Plan genere',
  writing: 'Redaction',
  completed: 'Termine',
}

export const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: 'Informationnel',
  commercial: 'Commercial',
  transactional: 'Transactionnel',
  navigational: 'Navigationnel',
}
