-- ============================================================
-- BlogAssurance Database Schema
-- ============================================================

-- --------------------------------------------------------
-- 1. Enum Types
-- --------------------------------------------------------

CREATE TYPE ba_project_status AS ENUM (
  'draft',
  'serp_done',
  'outline_done',
  'writing',
  'completed'
);

CREATE TYPE ba_block_status AS ENUM (
  'pending',
  'writing',
  'done',
  'error'
);

CREATE TYPE ba_search_intent AS ENUM (
  'informational',
  'commercial',
  'transactional',
  'navigational'
);

-- --------------------------------------------------------
-- 2. Trigger function: auto-update updated_at
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION ba_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 3. Tables
-- --------------------------------------------------------

-- ba_projects
CREATE TABLE ba_projects (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  main_keyword  text            NOT NULL,
  language      text            DEFAULT 'fr',
  country       text            DEFAULT 'fr',
  intent        ba_search_intent DEFAULT 'informational',
  status        ba_project_status DEFAULT 'draft',
  tone          text,
  persona       text,
  target_length integer         DEFAULT 2000,
  constraints   text,
  created_at    timestamptz     DEFAULT now(),
  updated_at    timestamptz     DEFAULT now()
);

CREATE TRIGGER trg_ba_projects_updated_at
  BEFORE UPDATE ON ba_projects
  FOR EACH ROW
  EXECUTE FUNCTION ba_set_updated_at();

-- ba_serp_queries
CREATE TABLE ba_serp_queries (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid            NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  query         text            NOT NULL,
  type          text            NOT NULL DEFAULT 'search',
  results_json  jsonb,
  created_at    timestamptz     DEFAULT now()
);

-- ba_serp_results
CREATE TABLE ba_serp_results (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid            NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  position      integer,
  title         text,
  url           text,
  snippet       text,
  features_json jsonb,
  created_at    timestamptz     DEFAULT now()
);

-- ba_outlines
CREATE TABLE ba_outlines (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid          NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  structure_json  jsonb         NOT NULL,
  version         integer       DEFAULT 1,
  created_at      timestamptz   DEFAULT now()
);

-- ba_draft_blocks
CREATE TABLE ba_draft_blocks (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid            NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  section_id    text,
  title         text,
  content_html  text            DEFAULT '',
  status        ba_block_status DEFAULT 'pending',
  version       integer         DEFAULT 1,
  seo_score     integer,
  word_count    integer         DEFAULT 0,
  sort_order    integer         NOT NULL DEFAULT 0,
  created_at    timestamptz     DEFAULT now(),
  updated_at    timestamptz     DEFAULT now()
);

CREATE TRIGGER trg_ba_draft_blocks_updated_at
  BEFORE UPDATE ON ba_draft_blocks
  FOR EACH ROW
  EXECUTE FUNCTION ba_set_updated_at();

-- --------------------------------------------------------
-- 4. Indexes on foreign keys
-- --------------------------------------------------------

CREATE INDEX idx_ba_projects_user_id        ON ba_projects(user_id);
CREATE INDEX idx_ba_serp_queries_project_id ON ba_serp_queries(project_id);
CREATE INDEX idx_ba_serp_results_project_id ON ba_serp_results(project_id);
CREATE INDEX idx_ba_outlines_project_id     ON ba_outlines(project_id);
CREATE INDEX idx_ba_draft_blocks_project_id ON ba_draft_blocks(project_id);

-- --------------------------------------------------------
-- 5. Row Level Security
-- --------------------------------------------------------

ALTER TABLE ba_projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_serp_queries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_serp_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_outlines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_draft_blocks  ENABLE ROW LEVEL SECURITY;

-- ba_projects: users can only access their own projects
CREATE POLICY "ba_projects_select" ON ba_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ba_projects_insert" ON ba_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ba_projects_update" ON ba_projects
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ba_projects_delete" ON ba_projects
  FOR DELETE USING (auth.uid() = user_id);

-- ba_serp_queries: access via project ownership
CREATE POLICY "ba_serp_queries_select" ON ba_serp_queries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_queries.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_queries_insert" ON ba_serp_queries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_queries.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_queries_update" ON ba_serp_queries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_queries.project_id
        AND ba_projects.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_queries.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_queries_delete" ON ba_serp_queries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_queries.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

-- ba_serp_results: access via project ownership
CREATE POLICY "ba_serp_results_select" ON ba_serp_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_results.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_results_insert" ON ba_serp_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_results.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_results_update" ON ba_serp_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_results.project_id
        AND ba_projects.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_results.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_serp_results_delete" ON ba_serp_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_serp_results.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

-- ba_outlines: access via project ownership
CREATE POLICY "ba_outlines_select" ON ba_outlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_outlines.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_outlines_insert" ON ba_outlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_outlines.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_outlines_update" ON ba_outlines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_outlines.project_id
        AND ba_projects.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_outlines.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_outlines_delete" ON ba_outlines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_outlines.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

-- ba_draft_blocks: access via project ownership
CREATE POLICY "ba_draft_blocks_select" ON ba_draft_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_draft_blocks.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_draft_blocks_insert" ON ba_draft_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_draft_blocks.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_draft_blocks_update" ON ba_draft_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_draft_blocks.project_id
        AND ba_projects.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_draft_blocks.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "ba_draft_blocks_delete" ON ba_draft_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ba_projects
      WHERE ba_projects.id = ba_draft_blocks.project_id
        AND ba_projects.user_id = auth.uid()
    )
  );
