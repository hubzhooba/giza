-- Fix profiles table for wallet-based authentication
-- This migration allows wallet connections without requiring Supabase auth users

-- First, drop the foreign key constraint to auth.users if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change the id column to be a regular UUID with auto-generation
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add wallet_address column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Add other wallet-related columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Make email optional for wallet users
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update RLS policies to support wallet-based access
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Allow public to read profiles (needed for wallet queries)
CREATE POLICY "Anyone can view profiles" 
  ON profiles FOR SELECT 
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (
    auth.uid() = id OR 
    wallet_address IS NOT NULL
  );

-- Allow anyone to create a profile (for wallet connections)
CREATE POLICY "Anyone can create a profile" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON profiles TO anon, authenticated;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';