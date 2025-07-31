-- Minimal Database Cleanup Script for Giza
-- This script only drops what exists and creates what's needed

-- =====================================================
-- STEP 1: CLEAN UP EXISTING STRUCTURE
-- =====================================================

-- Drop triggers first (they depend on tables)
DO $$ 
BEGIN
    -- Only drop triggers if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rooms') THEN
        DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
        DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
    END IF;
    
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_room_for_invite(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_room_for_invite(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.join_room(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.join_room_with_profile(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.join_room_simple(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop existing tables in dependency order
DROP TABLE IF EXISTS public.signatures CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  public_key text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invitee_email text,
  invitee_name text,
  invitee_joined_at timestamp with time zone,
  encryption_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text,
  arweave_id text,
  encrypted_content text,
  fields jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Signatures table
CREATE TABLE public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signature text NOT NULL,
  signed_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  UNIQUE(document_id, user_id)
);

-- 5. Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  from_user jsonb NOT NULL,
  to_user jsonb NOT NULL,
  items jsonb NOT NULL,
  payment_method jsonb NOT NULL,
  total_amount decimal NOT NULL,
  currency text NOT NULL,
  status text DEFAULT 'draft',
  due_date timestamp with time zone NOT NULL,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Users can view rooms they participate in"
  ON public.rooms FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update rooms they participate in"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

-- Documents policies
CREATE POLICY "Users can view documents in their rooms"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create documents in their rooms"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents in their rooms"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

-- Signatures policies
CREATE POLICY "Users can view signatures in their documents"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      JOIN public.rooms ON rooms.id = documents.room_id
      WHERE documents.id = signatures.document_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own signatures"
  ON public.signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view invoices in their rooms"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = invoices.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create invoices in their rooms"
  ON public.invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = invoices.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "Users can update invoices in their rooms"
  ON public.invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = invoices.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

-- =====================================================
-- STEP 5: CREATE FUNCTIONS
-- =====================================================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to join a room
CREATE OR REPLACE FUNCTION public.join_room_simple(
    room_external_id TEXT,
    user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    room_record RECORD;
BEGIN
    -- Get user profile
    SELECT email, full_name INTO user_profile
    FROM profiles
    WHERE id = user_id;
    
    -- Check if room exists and user can join
    SELECT * INTO room_record
    FROM rooms
    WHERE external_id = room_external_id::UUID
    AND (invitee_id IS NULL OR invitee_id = user_id)
    AND creator_id != user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot join this room'
        );
    END IF;
    
    -- Update room with invitee information
    UPDATE rooms
    SET 
        invitee_id = user_id,
        invitee_email = user_profile.email,
        invitee_name = COALESCE(user_profile.full_name, user_profile.email),
        invitee_joined_at = NOW(),
        status = 'active',
        updated_at = NOW()
    WHERE external_id = room_external_id::UUID;
    
    RETURN jsonb_build_object(
        'success', true,
        'room_id', room_record.external_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.join_room_simple(TEXT, UUID) TO authenticated;

-- =====================================================
-- STEP 6: CREATE TRIGGERS
-- =====================================================

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 7: POPULATE EXISTING USERS
-- =====================================================

INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 8: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_rooms_external_id ON public.rooms(external_id);
CREATE INDEX idx_rooms_creator_id ON public.rooms(creator_id);
CREATE INDEX idx_rooms_invitee_id ON public.rooms(invitee_id);
CREATE INDEX idx_documents_room_id ON public.documents(room_id);
CREATE INDEX idx_documents_external_id ON public.documents(external_id);
CREATE INDEX idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX idx_signatures_user_id ON public.signatures(user_id);

-- =====================================================
-- DONE
-- =====================================================

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database setup completed successfully!' as message;