-- Clean Policy Migration - Removes ALL existing policies and recreates them

-- Step 1: Drop ALL existing policies on rooms table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rooms'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rooms', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Drop ALL existing policies on documents table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Drop ALL existing policies on signatures table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'signatures'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.signatures', pol.policyname);
    END LOOP;
END $$;

-- Step 4: Add invitee_id column if it doesn't exist
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

-- Step 5: Update status column
ALTER TABLE public.rooms 
  ALTER COLUMN status TYPE text,
  ALTER COLUMN status SET DEFAULT 'pending';

-- Step 6: Create new simple policies for rooms
CREATE POLICY "rooms_select_policy"
  ON public.rooms FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

CREATE POLICY "rooms_insert_policy"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "rooms_update_policy"
  ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = invitee_id);

CREATE POLICY "rooms_delete_policy"
  ON public.rooms FOR DELETE
  USING (auth.uid() = creator_id);

-- Step 7: Create new simple policies for documents
CREATE POLICY "documents_select_policy"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "documents_insert_policy"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

CREATE POLICY "documents_update_policy"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
    )
  );

-- Step 8: Create new simple policies for signatures (if table exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'signatures'
  ) THEN
    CREATE POLICY "signatures_select_policy"
      ON public.signatures FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.documents
          JOIN public.rooms ON rooms.id = documents.room_id
          WHERE documents.id = signatures.document_id
          AND (rooms.creator_id = auth.uid() OR rooms.invitee_id = auth.uid())
        )
      );

    CREATE POLICY "signatures_insert_policy"
      ON public.signatures FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Step 9: Create or replace the join_room function
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

-- Step 10: Update existing rooms
UPDATE public.rooms 
SET status = 'pending' 
WHERE invitee_id IS NULL AND status = 'active';

-- Step 11: Drop old tables we don't need
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS shared_contracts CASCADE;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';