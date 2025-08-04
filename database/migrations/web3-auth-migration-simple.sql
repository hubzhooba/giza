-- Web3 Native Authentication Migration (Simplified)
-- This migration adds Web3 authentication support to your existing database

-- Add columns for Web3 authentication to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS auth_signature TEXT,
ADD COLUMN IF NOT EXISTS auth_nonce TEXT,
ADD COLUMN IF NOT EXISTS username_signature TEXT,
ADD COLUMN IF NOT EXISTS balance_signature TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arweave_profile_tx TEXT,
ADD COLUMN IF NOT EXISTS ens_name TEXT,
ADD COLUMN IF NOT EXISTS lens_handle TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_public_key ON profiles(public_key);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_ens_name ON profiles(ens_name);

-- Create transaction logs table for audit trail
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  network TEXT DEFAULT 'arweave',
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet_sessions table for session management
CREATE TABLE IF NOT EXISTS wallet_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  auth_signature TEXT NOT NULL,
  auth_nonce TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create arweave_data table for caching Arweave data
CREATE TABLE IF NOT EXISTS arweave_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data JSONB NOT NULL,
  tags JSONB,
  confirmations INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_logs_wallet ON transaction_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_tx_id ON transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet ON wallet_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_token ON wallet_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_arweave_data_tx_id ON arweave_data(tx_id);
CREATE INDEX IF NOT EXISTS idx_arweave_data_wallet ON arweave_data(wallet_address);
CREATE INDEX IF NOT EXISTS idx_arweave_data_type ON arweave_data(data_type);

-- Helper function to get current user's wallet address
CREATE OR REPLACE FUNCTION current_user_wallet()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT wallet_address 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arweave_data ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for transaction_logs
CREATE POLICY "Users can view their own transaction logs" ON transaction_logs
  FOR SELECT USING (wallet_address = current_user_wallet());

CREATE POLICY "Users can insert their own transaction logs" ON transaction_logs
  FOR INSERT WITH CHECK (wallet_address = current_user_wallet());

-- Simple RLS policies for wallet_sessions
CREATE POLICY "Users can view their own sessions" ON wallet_sessions
  FOR SELECT USING (wallet_address = current_user_wallet());

CREATE POLICY "Users can create their own sessions" ON wallet_sessions
  FOR INSERT WITH CHECK (wallet_address = current_user_wallet());

CREATE POLICY "Users can update their own sessions" ON wallet_sessions
  FOR UPDATE USING (wallet_address = current_user_wallet());

-- Simple RLS policies for arweave_data
CREATE POLICY "Users can view their own Arweave data" ON arweave_data
  FOR SELECT USING (wallet_address = current_user_wallet());

CREATE POLICY "Service role can manage all Arweave data" ON arweave_data
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM wallet_sessions
  WHERE expires_at < NOW() OR revoked = true;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Note: If you have a documents table and want to add document signatures support,
-- run the following separately after checking your table structure:
/*
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  signer_address TEXT NOT NULL,
  signature TEXT NOT NULL,
  signature_type TEXT DEFAULT 'arweave',
  message TEXT NOT NULL,
  nonce TEXT NOT NULL,
  arweave_tx_id TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

-- Add appropriate RLS policies based on your documents table structure
*/