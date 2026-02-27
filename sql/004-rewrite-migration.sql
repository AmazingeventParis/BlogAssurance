-- ============================================================
-- BlogAssurance — Migration 004: Rewrite feature
-- Adds 'rewriting' status + ba_block_comments table
-- ============================================================

-- Add 'rewriting' status to the enum
ALTER TYPE ba_project_status ADD VALUE IF NOT EXISTS 'rewriting' AFTER 'review_done';

-- Block comments table
CREATE TABLE IF NOT EXISTS ba_block_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES ba_draft_blocks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_block_comments_block_id ON ba_block_comments(block_id);
CREATE INDEX IF NOT EXISTS idx_block_comments_project_id ON ba_block_comments(project_id);

-- RLS
ALTER TABLE ba_block_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project comments"
  ON ba_block_comments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM ba_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments on their projects"
  ON ba_block_comments FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM ba_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project comments"
  ON ba_block_comments FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM ba_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project comments"
  ON ba_block_comments FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM ba_projects WHERE user_id = auth.uid()
    )
  );
