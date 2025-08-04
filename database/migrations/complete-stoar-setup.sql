-- Complete STOAR Setup Script for Giza Platform
-- This handles the two-party system without room_participants table

-- 1. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create rooms table if not exists (two-party system)
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  name text NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  encryption_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create documents table if not exists
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'contract',
  encrypted_content text,
  fields text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Add Arweave fields to documents table
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

-- 5. Create signatures table if not exists
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signature text NOT NULL,
  signed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  UNIQUE(document_id, user_id)
);

-- 6. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their rooms" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view documents in their rooms" ON documents;
DROP POLICY IF EXISTS "Users can create documents in their rooms" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their rooms" ON documents;
DROP POLICY IF EXISTS "Users can view signatures in their documents" ON signatures;
DROP POLICY IF EXISTS "Users can create their own signatures" ON signatures;

-- 8. Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 9. Create policies for rooms (two-party system)
CREATE POLICY "Users can view their rooms" ON public.rooms 
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create rooms" ON public.rooms 
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their rooms" ON public.rooms 
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

-- 10. Create policies for documents (based on room access)
CREATE POLICY "Users can view documents in their rooms" ON public.documents 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create documents in their rooms" ON public.documents 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents in their rooms" ON public.documents 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

-- 11. Create policies for signatures
CREATE POLICY "Users can view signatures in their documents" ON public.signatures 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      JOIN public.rooms ON rooms.id = documents.room_id
      WHERE documents.id = signatures.document_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own signatures" ON public.signatures 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 12. Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_arweave_id ON documents("arweaveId");
CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_invitee_id ON rooms(invitee_id);

-- 13. Create or replace update timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 14. Create triggers for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 15. Create Arweave update trigger
CREATE OR REPLACE FUNCTION update_document_arweave_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."arweaveId" IS DISTINCT FROM OLD."arweaveId" OR 
     NEW."arweaveUrl" IS DISTINCT FROM OLD."arweaveUrl" THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_arweave_status_trigger ON documents;
CREATE TRIGGER update_document_arweave_status_trigger
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_arweave_status();

-- 16. Create join room function
CREATE OR REPLACE FUNCTION public.join_room(room_external_id text, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rooms
  SET 
    invitee_id = user_id,
    status = 'active'
  WHERE 
    external_id = room_external_id
    AND invitee_id IS NULL
    AND creator_id != user_id;
END;
$$;

-- 17. Create view for documents with Arweave status
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

-- 18. Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.rooms TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.signatures TO authenticated;
GRANT SELECT ON documents_with_arweave_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(text, uuid) TO authenticated;

-- 19. Add comments for documentation
COMMENT ON COLUMN documents."arweaveId" IS 'STOAR/Arweave transaction ID for permanent storage';
COMMENT ON COLUMN documents."arweaveUrl" IS 'Direct URL to access the document on Arweave';

-- 20. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Success!
DO $$ 
BEGIN
  RAISE NOTICE '✅ STOAR setup completed successfully!';
  RAISE NOTICE '✅ Tables created: profiles, rooms, documents, signatures';
  RAISE NOTICE '✅ Arweave fields added: arweaveId, arweaveUrl';
  RAISE NOTICE '✅ All policies and triggers configured';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now proceed with environment variable setup.';
END $$;