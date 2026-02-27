-- 003-review-migration.sql
-- Adds 'review_done' status and ba_reviews table for the expert review step

-- Add new status value to the enum
ALTER TYPE ba_project_status ADD VALUE IF NOT EXISTS 'review_done' AFTER 'writing';

-- Create ba_reviews table
CREATE TABLE IF NOT EXISTS ba_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES ba_projects(id) ON DELETE CASCADE,
  review_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index on project_id
CREATE INDEX IF NOT EXISTS idx_ba_reviews_project_id ON ba_reviews(project_id);

-- Enable RLS
ALTER TABLE ba_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as ba_outlines)
CREATE POLICY "Users can view their own reviews"
  ON ba_reviews FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ba_projects
    WHERE ba_projects.id = ba_reviews.project_id
      AND ba_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert reviews for their projects"
  ON ba_reviews FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ba_projects
    WHERE ba_projects.id = ba_reviews.project_id
      AND ba_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own reviews"
  ON ba_reviews FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ba_projects
    WHERE ba_projects.id = ba_reviews.project_id
      AND ba_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own reviews"
  ON ba_reviews FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ba_projects
    WHERE ba_projects.id = ba_reviews.project_id
      AND ba_projects.user_id = auth.uid()
  ));
