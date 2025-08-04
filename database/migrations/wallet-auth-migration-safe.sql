-- Safe Migration to support ArConnect wallet authentication
-- This version checks for existing objects before creating them

-- 1. Drop existing auth-related constraints and columns
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 2. Add wallet address as primary identifier
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_address') THEN
    ALTER TABLE profiles ADD COLUMN wallet_address TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_username_set') THEN
    ALTER TABLE profiles ADD COLUMN is_username_set BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_balance') THEN
    ALTER TABLE profiles ADD COLUMN wallet_balance TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_balance_check') THEN
    ALTER TABLE profiles ADD COLUMN last_balance_check TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'connected_at') THEN
    ALTER TABLE profiles ADD COLUMN connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 3. Make email optional
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 5. Create sessions table for wallet connections
CREATE TABLE IF NOT EXISTS wallet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  permissions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- Add foreign key if table was just created
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wallet_sessions_wallet_address_fkey'
  ) THEN
    ALTER TABLE wallet_sessions 
    ADD CONSTRAINT wallet_sessions_wallet_address_fkey 
    FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Create indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_token ON wallet_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_wallet ON wallet_sessions(wallet_address);

-- 7. Update rooms table to use wallet addresses
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'creator_wallet') THEN
    ALTER TABLE rooms ADD COLUMN creator_wallet TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'invitee_wallet') THEN
    ALTER TABLE rooms ADD COLUMN invitee_wallet TEXT;
  END IF;
END $$;

-- 8. Migrate existing data (if any)
UPDATE rooms r 
SET creator_wallet = p.wallet_address 
FROM profiles p 
WHERE r.creator_id = p.id AND p.wallet_address IS NOT NULL AND r.creator_wallet IS NULL;

UPDATE rooms r 
SET invitee_wallet = p.wallet_address 
FROM profiles p 
WHERE r.invitee_id = p.id AND p.wallet_address IS NOT NULL AND r.invitee_wallet IS NULL;

-- 9. Create wallet activity log
CREATE TABLE IF NOT EXISTS wallet_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key if table was just created
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wallet_activity_wallet_address_fkey'
  ) THEN
    ALTER TABLE wallet_activity 
    ADD CONSTRAINT wallet_activity_wallet_address_fkey 
    FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE;
  END IF;
END $$;

-- 10. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- Create new policies using wallet address from JWT
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (true); -- Public profiles

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (
    wallet_address = current_setting('app.current_wallet', true)
  );

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    wallet_address = current_setting('app.current_wallet', true)
  );

-- 11. Create or replace function to handle wallet login/register
CREATE OR REPLACE FUNCTION handle_wallet_auth(
  p_wallet_address TEXT,
  p_permissions TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
  user_id UUID,
  is_new_user BOOLEAN,
  session_token TEXT,
  username TEXT,
  is_username_set BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_is_new BOOLEAN := FALSE;
  v_session_token TEXT;
  v_username TEXT;
  v_is_username_set BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT id, profiles.username, profiles.is_username_set 
  INTO v_user_id, v_username, v_is_username_set
  FROM profiles 
  WHERE wallet_address = p_wallet_address;
  
  -- Create new user if doesn't exist
  IF v_user_id IS NULL THEN
    -- First check if we need to create an auth.users entry
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      p_wallet_address || '@wallet.local',
      crypt('wallet_auth_not_used', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_user_id;
    
    -- If conflict, get the existing user id
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM auth.users WHERE email = p_wallet_address || '@wallet.local';
    END IF;
    
    -- Now insert into profiles
    INSERT INTO profiles (id, wallet_address, name, email)
    VALUES (v_user_id, p_wallet_address, 'User ' || substr(p_wallet_address, 1, 8), p_wallet_address || '@wallet.local')
    ON CONFLICT (wallet_address) DO UPDATE SET last_seen = NOW()
    RETURNING id, username, is_username_set 
    INTO v_user_id, v_username, v_is_username_set;
    
    v_is_new := TRUE;
  ELSE
    -- Update last seen
    UPDATE profiles 
    SET last_seen = NOW() 
    WHERE id = v_user_id;
  END IF;
  
  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create session
  INSERT INTO wallet_sessions (wallet_address, session_token, permissions)
  VALUES (p_wallet_address, v_session_token, p_permissions);
  
  -- Return user info
  RETURN QUERY SELECT v_user_id, v_is_new, v_session_token, v_username, v_is_username_set;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create or replace function to validate session
CREATE OR REPLACE FUNCTION validate_wallet_session(p_session_token TEXT)
RETURNS TABLE (
  wallet_address TEXT,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.wallet_address,
    p.id as user_id,
    p.username,
    p.display_name,
    CASE 
      WHEN ws.expires_at > NOW() THEN true 
      ELSE false 
    END as is_valid
  FROM wallet_sessions ws
  JOIN profiles p ON p.wallet_address = ws.wallet_address
  WHERE ws.session_token = p_session_token
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create or replace function to update username
CREATE OR REPLACE FUNCTION set_username(
  p_wallet_address TEXT,
  p_username TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Check if username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE username = lower(p_username) AND wallet_address != p_wallet_address) THEN
    RETURN FALSE;
  END IF;
  
  -- Update username
  UPDATE profiles 
  SET 
    username = lower(p_username),
    display_name = p_username,
    is_username_set = TRUE,
    updated_at = NOW()
  WHERE wallet_address = p_wallet_address;
  
  -- Check if any rows were updated
  IF FOUND THEN
    v_success := TRUE;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create or replace function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_wallet_address TEXT,
  p_balance TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    wallet_balance = p_balance,
    last_balance_check = NOW()
  WHERE wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Grant permissions
GRANT EXECUTE ON FUNCTION handle_wallet_auth(TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_wallet_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_username(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_wallet_balance(TEXT, TEXT) TO authenticated;
GRANT ALL ON wallet_sessions TO authenticated;
GRANT ALL ON wallet_activity TO authenticated;

-- 16. Create or replace view for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  p.id,
  p.wallet_address,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.wallet_balance,
  p.last_balance_check,
  p.created_at,
  p.last_seen,
  COUNT(DISTINCT r.id) as total_rooms,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(DISTINCT CASE WHEN d."arweaveId" IS NOT NULL THEN d.id END) as archived_documents
FROM profiles p
LEFT JOIN rooms r ON (r.creator_wallet = p.wallet_address OR r.invitee_wallet = p.wallet_address)
LEFT JOIN documents d ON d.room_id = r.id
GROUP BY p.id;

GRANT SELECT ON user_dashboard TO authenticated;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Wallet authentication schema created successfully!';
  RAISE NOTICE '✅ Ready for ArConnect integration';
  RAISE NOTICE '✅ All existing policies handled safely';
END $$;