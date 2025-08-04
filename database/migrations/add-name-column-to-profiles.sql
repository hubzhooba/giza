-- Add name column to profiles table if it doesn't exist
-- This fixes the "Could not find the 'name' column" error

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Also ensure all required columns exist for wallet authentication
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_nonce TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Make email optional for wallet users
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';