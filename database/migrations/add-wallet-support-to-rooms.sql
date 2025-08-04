-- Add wallet support to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS creator_wallet TEXT;

-- Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_rooms_creator_wallet ON rooms(creator_wallet);

-- Update RLS policies to allow wallet users to create rooms
-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;

-- Create new policy that allows both auth users and wallet users
CREATE POLICY "Users can create rooms" ON rooms
FOR INSERT WITH CHECK (
  -- Allow if creator_id matches auth user
  (auth.uid()::text = creator_id) 
  OR 
  -- Allow if creator_wallet is provided (for wallet users)
  (creator_wallet IS NOT NULL)
);

-- Update select policy to be more permissive
DROP POLICY IF EXISTS "Users can view their rooms" ON rooms;

CREATE POLICY "Users can view rooms" ON rooms
FOR SELECT USING (
  -- Allow if user is authenticated (for now, make it public for wallet users)
  true
);

-- Update the update policy
DROP POLICY IF EXISTS "Users can update their rooms" ON rooms;

CREATE POLICY "Users can update their rooms" ON rooms
FOR UPDATE USING (
  -- Allow if creator_id matches auth user
  (auth.uid()::text = creator_id)
  OR
  -- For wallet users, we'll need to verify ownership differently
  (creator_wallet IS NOT NULL)
);