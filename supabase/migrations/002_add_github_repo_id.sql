-- Add missing github_repo_id column to repositories table
-- This column stores the GitHub repository ID for API operations

ALTER TABLE repositories 
ADD COLUMN github_repo_id BIGINT;

-- Create index for better performance on GitHub API lookups
CREATE INDEX idx_repositories_github_repo_id ON repositories(github_repo_id);

-- Update existing repositories with mock GitHub repo IDs (for development)
-- In production, these would be populated from actual GitHub API responses
UPDATE repositories 
SET github_repo_id = (EXTRACT(EPOCH FROM created_at)::BIGINT + ABS(HASHTEXT(id::text)) % 1000000)
WHERE github_repo_id IS NULL;

-- Make the column NOT NULL after populating existing records
ALTER TABLE repositories 
ALTER COLUMN github_repo_id SET NOT NULL;

-- Grant permissions
GRANT SELECT ON repositories TO anon;
GRANT ALL PRIVILEGES ON repositories TO authenticated;