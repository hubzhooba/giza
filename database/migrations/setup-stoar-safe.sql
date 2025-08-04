-- Safe setup script for STOAR integration
-- This script checks for existing objects before creating them

-- 1. Check and create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Check and create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'contract',
  encrypted_content TEXT,
  fields TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Arweave fields if they don't exist
DO $$ 
BEGIN
  -- Add arweaveId column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'arweaveId'
  ) THEN
    ALTER TABLE documents ADD COLUMN "arweaveId" TEXT;
  END IF;

  -- Add arweaveUrl column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'arweaveUrl'
  ) THEN
    ALTER TABLE documents ADD COLUMN "arweaveUrl" TEXT;
  END IF;
END $$;

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_documents_arweave_id ON documents("arweaveId");
CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);

-- 5. Add comments
COMMENT ON COLUMN documents."arweaveId" IS 'STOAR/Arweave transaction ID for permanent storage';
COMMENT ON COLUMN documents."arweaveUrl" IS 'Direct URL to access the document on Arweave';

-- 6. Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 7. Create or replace policies (safe to run multiple times)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view documents in their rooms" ON documents;
DROP POLICY IF EXISTS "Users can create documents in their rooms" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their rooms" ON documents;

-- Recreate policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view documents in their rooms" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = documents.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their rooms" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = documents.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their rooms" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = documents.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- 8. Create update trigger for arweave status
CREATE OR REPLACE FUNCTION update_document_arweave_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp when Arweave fields are modified
  IF NEW."arweaveId" IS DISTINCT FROM OLD."arweaveId" OR 
     NEW."arweaveUrl" IS DISTINCT FROM OLD."arweaveUrl" THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_document_arweave_status_trigger ON documents;
CREATE TRIGGER update_document_arweave_status_trigger
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_arweave_status();

-- 9. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON documents TO authenticated;

-- 10. Create a view for documents with Arweave status
CREATE OR REPLACE VIEW documents_with_arweave_status AS
SELECT 
  d.*,
  CASE 
    WHEN d."arweaveId" IS NOT NULL THEN 'uploaded'
    ELSE 'pending'
  END as arweave_status,
  r.name as room_name,
  r.status as room_status
FROM documents d
JOIN rooms r ON d.room_id = r.id;

-- Grant access to the view
GRANT SELECT ON documents_with_arweave_status TO authenticated;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'STOAR setup completed successfully!';
  RAISE NOTICE 'Arweave fields have been added to the documents table.';
END $$;