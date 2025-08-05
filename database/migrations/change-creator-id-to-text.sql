-- Change creator_id from UUID to TEXT to support wallet addresses
-- This is a major change that requires careful handling

-- First, drop all policies that might reference the column
DROP POLICY IF EXISTS "Allow room creation" ON rooms;
DROP POLICY IF EXISTS "Allow room viewing" ON rooms;
DROP POLICY IF EXISTS "Allow room updates" ON rooms;
DROP POLICY IF EXISTS "Allow room deletion" ON rooms;

-- Drop any indexes on creator_id
DROP INDEX IF EXISTS idx_rooms_creator_id;

-- Drop the foreign key constraint if it still exists
ALTER TABLE rooms 
DROP CONSTRAINT IF EXISTS rooms_creator_id_fkey;

-- Change the column type from UUID to TEXT
-- This will preserve existing UUID values as text
ALTER TABLE rooms 
ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT;

-- Do the same for invitee_id if it exists
ALTER TABLE rooms 
ALTER COLUMN invitee_id TYPE TEXT USING invitee_id::TEXT;

-- Recreate indexes
CREATE INDEX idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_invitee_id ON rooms(invitee_id);

-- Recreate policies
CREATE POLICY "Allow room creation" ON rooms
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow room viewing" ON rooms
FOR SELECT USING (true);

CREATE POLICY "Allow room updates" ON rooms
FOR UPDATE USING (true);

CREATE POLICY "Allow room deletion" ON rooms
FOR DELETE USING (true);

-- Update column comments
COMMENT ON COLUMN rooms.creator_id IS 'Text field that can store either UUID (for auth users) or wallet address (for wallet users)';
COMMENT ON COLUMN rooms.invitee_id IS 'Text field that can store either UUID (for auth users) or wallet address (for wallet users)';