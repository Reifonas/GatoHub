-- GitHub Sync Pro Database Schema
-- Create all required tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'
);

-- Create github_accounts table
CREATE TABLE github_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    github_username VARCHAR(100) NOT NULL,
    encrypted_token TEXT NOT NULL,
    avatar_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_account_id UUID REFERENCES github_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    clone_url TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync_operations table
CREATE TABLE sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    sync_type VARCHAR(20) CHECK (sync_type IN ('push', 'pull', 'bidirectional')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create routines table
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    interval_seconds INTEGER NOT NULL CHECK (interval_seconds > 0),
    repositories JSONB NOT NULL DEFAULT '[]',
    sync_type VARCHAR(20) CHECK (sync_type IN ('push', 'pull', 'bidirectional')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routine_executions table
CREATE TABLE routine_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    results JSONB DEFAULT '{}'
);

-- Create sync_logs table
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_operation_id UUID REFERENCES sync_operations(id) ON DELETE CASCADE,
    level VARCHAR(10) CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_github_accounts_user_id ON github_accounts(user_id);
CREATE INDEX idx_github_accounts_username ON github_accounts(github_username);
CREATE INDEX idx_repositories_account_id ON repositories(github_account_id);
CREATE INDEX idx_repositories_full_name ON repositories(full_name);
CREATE INDEX idx_repositories_last_sync ON repositories(last_sync DESC);
CREATE INDEX idx_sync_operations_user_id ON sync_operations(user_id);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_started_at ON sync_operations(started_at DESC);
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_is_active ON routines(is_active);
CREATE INDEX idx_routines_interval ON routines(interval_seconds);
CREATE INDEX idx_routine_executions_routine_id ON routine_executions(routine_id);
CREATE INDEX idx_sync_logs_operation_id ON sync_logs(sync_operation_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- Insert sample data
INSERT INTO users (email, name, preferences) VALUES 
('dev@example.com', 'Desenvolvedor Teste', '{"theme": "dark", "notifications": true}');

-- Grant permissions to Supabase roles
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT SELECT ON github_accounts TO anon;
GRANT ALL PRIVILEGES ON github_accounts TO authenticated;
GRANT SELECT ON repositories TO anon;
GRANT ALL PRIVILEGES ON repositories TO authenticated;
GRANT SELECT ON sync_operations TO anon;
GRANT ALL PRIVILEGES ON sync_operations TO authenticated;
GRANT SELECT ON routines TO anon;
GRANT ALL PRIVILEGES ON routines TO authenticated;
GRANT SELECT ON routine_executions TO anon;
GRANT ALL PRIVILEGES ON routine_executions TO authenticated;
GRANT SELECT ON sync_logs TO anon;
GRANT ALL PRIVILEGES ON sync_logs TO authenticated;