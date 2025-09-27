-- Add missing created_at column to sync_operations table
-- The backend code expects this column for timestamps

ALTER TABLE sync_operations 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance on created_at queries
CREATE INDEX idx_sync_operations_created_at ON sync_operations(created_at DESC);

-- Update existing records to have created_at = started_at
UPDATE sync_operations 
SET created_at = started_at 
WHERE created_at IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE sync_operations 
ALTER COLUMN created_at SET NOT NULL;

-- Grant permissions to Supabase roles
GRANT SELECT ON sync_operations TO anon;
GRANT ALL PRIVILEGES ON sync_operations TO authenticated;