-- Complete Database Setup for Giza Contract Platform (Fixed Version)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop and recreate profiles table with correct structure
-- First, backup existing data if needed
DO $$ 
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    
    -- Drop the table
    DROP TABLE IF EXISTS public.profiles CASCADE;
  END IF;
END $$;

-- Create profiles table with correct structure
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  public_key text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Drop and recreate rooms table
DROP TABLE IF EXISTS public.rooms CASCADE;

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

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

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

-- 3. Drop and recreate documents table
DROP TABLE IF EXISTS public.documents CASCADE;

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

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

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

-- 4. Create signatures table
DROP TABLE IF EXISTS public.signatures CASCADE;

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

-- Enable RLS on signatures
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

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

-- 5. Create or replace function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Create or replace function to handle new user signup
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

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Drop and recreate RPC function for getting room data
DROP FUNCTION IF EXISTS get_room_for_invite(TEXT);

CREATE OR REPLACE FUNCTION get_room_for_invite(room_external_id TEXT)
RETURNS TABLE (
    external_id UUID,
    name TEXT,
    creator_id UUID,
    creator_email TEXT,
    creator_name TEXT,
    invitee_id UUID,
    invitee_email TEXT,
    invitee_name TEXT,
    invitee_joined_at TIMESTAMPTZ,
    status TEXT,
    encryption_key TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.external_id,
        r.name,
        r.creator_id,
        creator_profile.email as creator_email,
        creator_profile.full_name as creator_name,
        r.invitee_id,
        r.invitee_email,
        r.invitee_name,
        r.invitee_joined_at,
        r.status,
        r.encryption_key,
        r.created_at,
        r.updated_at
    FROM rooms r
    LEFT JOIN profiles creator_profile ON creator_profile.id = r.creator_id
    WHERE r.external_id = room_external_id::UUID;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for RPC function
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO authenticated;

-- 8. Drop and recreate function to join a room
DROP FUNCTION IF EXISTS join_room_with_profile(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.join_room_with_profile(
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

-- Grant permissions for join function
GRANT EXECUTE ON FUNCTION join_room_with_profile(TEXT, UUID) TO authenticated;

-- 9. Populate profiles for existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 10. Enable realtime (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';