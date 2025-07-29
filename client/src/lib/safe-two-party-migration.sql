-- Safe Two-Party Contract System Migration
-- This script checks for existing objects before creating them

-- First, drop old tables that we're replacing
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS shared_contracts CASCADE;

-- Only drop and recreate if you want to reset data
-- Comment out these lines if you want to preserve existing data
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;

-- Add invitee_id to rooms table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rooms' 
    AND column_name = 'invitee_id'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN invitee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update status column to include 'pending' if needed
DO $$ 
BEGIN
  -- First check if we need to update the column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rooms' 
    AND column_name = 'status'
  ) THEN
    -- Temporarily remove constraints
    ALTER TABLE public.rooms ALTER COLUMN status TYPE text;
  END IF;
END $$;

-- Ensure rooms table has all required columns
ALTER TABLE public.rooms 
  ALTER COLUMN status SET DEFAULT 'pending';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view their own rooms or shared rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can update their rooms" ON public.rooms;

-- Create simple policies for rooms
CREATE POLICY "Users can view their rooms"
  ON public.rooms FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

-- Drop existing policies for documents
DROP POLICY IF EXISTS "Users can view documents in their rooms" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents in their rooms or shared rooms" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents in their rooms" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their rooms" ON public.documents;

-- Create simple policies for documents
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

-- Check if signatures table exists, if not create it
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

-- Enable RLS on signatures if not already enabled
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for signatures
DROP POLICY IF EXISTS "Users can view signatures in their documents" ON public.signatures;
DROP POLICY IF EXISTS "Users can create their own signatures" ON public.signatures;

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

-- Create or replace the join_room function
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

-- Update any existing 'active' rooms that have no invitee to 'pending'
UPDATE public.rooms 
SET status = 'pending' 
WHERE invitee_id IS NULL AND status = 'active';

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';