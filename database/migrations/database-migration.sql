-- Migration script to update existing tables or create new ones

-- First, drop existing tables if they exist
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Create rooms table for storing secure contract rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL, -- The ID used in the app
  name text NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encryption_key text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Policies for rooms
CREATE POLICY "Users can view their own rooms"
  ON public.rooms FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id);

-- Create documents table for storing contract documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL, -- The ID used in the app
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

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies for documents
CREATE POLICY "Users can view documents in their rooms"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their rooms"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their rooms"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

-- Create participants table for room participants
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  public_key text,
  status text NOT NULL DEFAULT 'invited',
  has_joined boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Policies for participants
CREATE POLICY "Users can view participants in their rooms"
  ON public.participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = participants.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage participants in their rooms"
  ON public.participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = participants.room_id
      AND rooms.creator_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';