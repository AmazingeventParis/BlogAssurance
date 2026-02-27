// ============================================================
// BlogAssurance — Supabase Database Types
// ============================================================

// ---------- Enum types ----------

export type BaProjectStatus =
  | 'draft'
  | 'serp_done'
  | 'outline_done'
  | 'writing'
  | 'completed'

export type BaBlockStatus =
  | 'pending'
  | 'writing'
  | 'done'
  | 'error'

export type BaSearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational'

// ---------- ba_projects ----------

export interface BaProject {
  id: string
  user_id: string
  main_keyword: string
  language: string
  country: string
  intent: BaSearchIntent
  status: BaProjectStatus
  tone: string | null
  persona: string | null
  target_length: number
  constraints: string | null
  created_at: string
  updated_at: string
}

export interface BaProjectInsert {
  id?: string
  user_id: string
  main_keyword: string
  language?: string
  country?: string
  intent?: BaSearchIntent
  status?: BaProjectStatus
  tone?: string | null
  persona?: string | null
  target_length?: number
  constraints?: string | null
  created_at?: string
  updated_at?: string
}

export interface BaProjectUpdate {
  id?: string
  user_id?: string
  main_keyword?: string
  language?: string
  country?: string
  intent?: BaSearchIntent
  status?: BaProjectStatus
  tone?: string | null
  persona?: string | null
  target_length?: number
  constraints?: string | null
  created_at?: string
  updated_at?: string
}

// ---------- ba_serp_queries ----------

export interface BaSerpQuery {
  id: string
  project_id: string
  query: string
  type: string
  results_json: Record<string, unknown> | null
  created_at: string
}

export interface BaSerpQueryInsert {
  id?: string
  project_id: string
  query: string
  type?: string
  results_json?: Record<string, unknown> | null
  created_at?: string
}

export interface BaSerpQueryUpdate {
  id?: string
  project_id?: string
  query?: string
  type?: string
  results_json?: Record<string, unknown> | null
  created_at?: string
}

// ---------- ba_serp_results ----------

export interface BaSerpResult {
  id: string
  project_id: string
  position: number | null
  title: string | null
  url: string | null
  snippet: string | null
  features_json: Record<string, unknown> | null
  created_at: string
}

export interface BaSerpResultInsert {
  id?: string
  project_id: string
  position?: number | null
  title?: string | null
  url?: string | null
  snippet?: string | null
  features_json?: Record<string, unknown> | null
  created_at?: string
}

export interface BaSerpResultUpdate {
  id?: string
  project_id?: string
  position?: number | null
  title?: string | null
  url?: string | null
  snippet?: string | null
  features_json?: Record<string, unknown> | null
  created_at?: string
}

// ---------- ba_outlines ----------

export interface BaOutline {
  id: string
  project_id: string
  structure_json: Record<string, unknown>
  version: number
  created_at: string
}

export interface BaOutlineInsert {
  id?: string
  project_id: string
  structure_json: Record<string, unknown>
  version?: number
  created_at?: string
}

export interface BaOutlineUpdate {
  id?: string
  project_id?: string
  structure_json?: Record<string, unknown>
  version?: number
  created_at?: string
}

// ---------- ba_draft_blocks ----------

export interface BaDraftBlock {
  id: string
  project_id: string
  section_id: string | null
  title: string | null
  content_html: string
  status: BaBlockStatus
  version: number
  seo_score: number | null
  word_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BaDraftBlockInsert {
  id?: string
  project_id: string
  section_id?: string | null
  title?: string | null
  content_html?: string
  status?: BaBlockStatus
  version?: number
  seo_score?: number | null
  word_count?: number
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface BaDraftBlockUpdate {
  id?: string
  project_id?: string
  section_id?: string | null
  title?: string | null
  content_html?: string
  status?: BaBlockStatus
  version?: number
  seo_score?: number | null
  word_count?: number
  sort_order?: number
  created_at?: string
  updated_at?: string
}

// ---------- Database interface ----------

export interface Database {
  public: {
    Tables: {
      ba_projects: {
        Row: BaProject
        Insert: BaProjectInsert
        Update: BaProjectUpdate
      }
      ba_serp_queries: {
        Row: BaSerpQuery
        Insert: BaSerpQueryInsert
        Update: BaSerpQueryUpdate
      }
      ba_serp_results: {
        Row: BaSerpResult
        Insert: BaSerpResultInsert
        Update: BaSerpResultUpdate
      }
      ba_outlines: {
        Row: BaOutline
        Insert: BaOutlineInsert
        Update: BaOutlineUpdate
      }
      ba_draft_blocks: {
        Row: BaDraftBlock
        Insert: BaDraftBlockInsert
        Update: BaDraftBlockUpdate
      }
    }
    Enums: {
      ba_project_status: BaProjectStatus
      ba_block_status: BaBlockStatus
      ba_search_intent: BaSearchIntent
    }
  }
}
