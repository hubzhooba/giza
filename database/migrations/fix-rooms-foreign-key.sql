-- Fix foreign key constraint for wallet users
-- This migration allows creator_id to be independent of users table

-- First, drop the existing foreign key constraint
ALTER TABLE rooms 
DROP CONSTRAINT IF EXISTS rooms_creator_id_fkey;

-- Make sure creator_wallet column exists
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS creator_wallet TEXT;

-- Add description column if missing
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_creator_wallet ON rooms(creator_wallet);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON rooms;
DROP POLICY IF EXISTS "Users can delete their rooms" ON rooms;

-- Create new policies that work for both auth and wallet users
CREATE POLICY "Anyone can create rooms" ON rooms
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view rooms" ON rooms
FOR SELECT USING (true);

CREATE POLICY "Room creators can update" ON rooms
FOR UPDATE USING (
  -- Auth user matches creator_id
  (auth.uid()::text = creator_id)
  OR
  -- Or room has a wallet (we verify ownership in app)
  (creator_wallet IS NOT NULL)
);

CREATE POLICY "Room creators can delete" ON rooms
FOR DELETE USING (
  -- Auth user matches creator_id
  (auth.uid()::text = creator_id)
  OR
  -- Or room has a wallet (we verify ownership in app)
  (creator_wallet IS NOT NULL)
);

-- Create a partial index to ensure uniqueness of external_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_external_id_unique ON rooms(external_id);

-- Add comment explaining the schema
COMMENT ON COLUMN rooms.creator_id IS 'Can be either a user UUID (cast to text) or a wallet address for decentralized users';
COMMENT ON COLUMN rooms.creator_wallet IS 'Wallet address of the creator if they are using wallet auth';