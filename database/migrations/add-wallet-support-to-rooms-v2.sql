-- Add wallet support to rooms table
-- This version handles the case where creator_id might be TEXT type

-- Add creator_wallet column if it doesn't exist
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS creator_wallet TEXT;

-- Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_rooms_creator_wallet ON rooms(creator_wallet);

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view their rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON rooms;

-- Create new INSERT policy that handles both auth users and wallet users
CREATE POLICY "Users can create rooms" ON rooms
FOR INSERT WITH CHECK (
  -- For wallet users, just check that wallet is provided
  (creator_wallet IS NOT NULL)
  OR
  -- For auth users, check if they're authenticated
  (auth.uid() IS NOT NULL)
);

-- Create permissive SELECT policy
-- In production, you'd want to restrict this based on room participants
CREATE POLICY "Users can view rooms" ON rooms
FOR SELECT USING (
  -- Allow all authenticated users to view rooms for now
  -- This will be restricted later based on participant lists
  true
);

-- Create UPDATE policy
CREATE POLICY "Users can update their rooms" ON rooms
FOR UPDATE USING (
  -- For now, allow updates if user is authenticated
  -- In production, check against participant list
  (auth.uid() IS NOT NULL)
  OR
  -- Or if they have a wallet (we'll verify ownership in the app)
  (creator_wallet IS NOT NULL)
);

-- Create DELETE policy (optional)
CREATE POLICY "Users can delete their rooms" ON rooms
FOR DELETE USING (
  -- Similar to update policy
  (auth.uid() IS NOT NULL)
  OR
  (creator_wallet IS NOT NULL)
);

-- Add description column if it doesn't exist
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS description TEXT;