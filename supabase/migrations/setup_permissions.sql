-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon role (for public access)
GRANT SELECT ON users TO anon;
GRANT SELECT ON github_accounts TO anon;
GRANT SELECT ON repositories TO anon;
GRANT SELECT ON sync_operations TO anon;
GRANT SELECT ON routines TO anon;
GRANT SELECT ON routine_executions TO anon;
GRANT SELECT ON sync_logs TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON github_accounts TO authenticated;
GRANT ALL PRIVILEGES ON repositories TO authenticated;
GRANT ALL PRIVILEGES ON sync_operations TO authenticated;
GRANT ALL PRIVILEGES ON routines TO authenticated;
GRANT ALL PRIVILEGES ON routine_executions TO authenticated;
GRANT ALL PRIVILEGES ON sync_logs TO authenticated;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for github_accounts table
CREATE POLICY "Users can view own GitHub accounts" ON github_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own GitHub accounts" ON github_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for repositories table
CREATE POLICY "Users can view own repositories" ON repositories
  FOR SELECT USING (
    github_account_id IN (
      SELECT id FROM github_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own repositories" ON repositories
  FOR ALL USING (
    github_account_id IN (
      SELECT id FROM github_accounts WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for sync_operations table
CREATE POLICY "Users can view own sync operations" ON sync_operations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sync operations" ON sync_operations
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for routines table
CREATE POLICY "Users can view own routines" ON routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own routines" ON routines
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for routine_executions table
CREATE POLICY "Users can view own routine executions" ON routine_executions
  FOR SELECT USING (
    routine_id IN (
      SELECT id FROM routines WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own routine executions" ON routine_executions
  FOR ALL USING (
    routine_id IN (
      SELECT id FROM routines WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for sync_logs table
CREATE POLICY "Users can view own sync logs" ON sync_logs
  FOR SELECT USING (
    sync_operation_id IN (
      SELECT id FROM sync_operations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sync logs" ON sync_logs
  FOR INSERT WITH CHECK (
    sync_operation_id IN (
      SELECT id FROM sync_operations WHERE user_id = auth.uid()
    )
  );