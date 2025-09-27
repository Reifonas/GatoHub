-- Add missing columns to repositories and sync_operations tables
-- These columns are required by the backend API

-- Add missing columns to repositories table
ALTER TABLE repositories 
ADD COLUMN local_path TEXT,
ADD COLUMN sync_enabled BOOLEAN DEFAULT false;

-- Add missing columns to sync_operations table
ALTER TABLE sync_operations 
ADD COLUMN operation_name VARCHAR(255),
ADD COLUMN options JSONB DEFAULT '{}',
ADD COLUMN error_message TEXT;

-- Create indexes for better performance
CREATE INDEX idx_repositories_sync_enabled ON repositories(sync_enabled);
CREATE INDEX idx_sync_operations_operation_name ON sync_operations(operation_name);

-- Update existing records with default values
UPDATE repositories 
SET local_path = COALESCE(local_path, ''),
    sync_enabled = COALESCE(sync_enabled, false)
WHERE local_path IS NULL OR sync_enabled IS NULL;

UPDATE sync_operations 
SET operation_name = COALESCE(operation_name, 'Sync Operation'),
    options = COALESCE(options, '{}'::jsonb)
WHERE operation_name IS NULL OR options IS NULL;

-- Grant permissions
GRANT SELECT ON repositories TO anon;
GRANT ALL PRIVILEGES ON repositories TO authenticated;
GRANT SELECT ON sync_operations TO anon;
GRANT ALL PRIVILEGES ON sync_operations TO authenticated;