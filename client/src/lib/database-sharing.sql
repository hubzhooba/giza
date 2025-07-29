-- Add contract sharing functionality

-- Create shared_contracts table to track which users have access to which contracts
CREATE TABLE IF NOT EXISTS public.shared_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- 'viewer', 'signer', 'editor'
  shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.shared_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for shared_contracts
CREATE POLICY "Users can view contracts shared with them"
  ON public.shared_contracts FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = shared_contracts.room_id 
    AND rooms.creator_id = auth.uid()
  ));

CREATE POLICY "Room creators can share contracts"
  ON public.shared_contracts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = shared_contracts.room_id 
    AND rooms.creator_id = auth.uid()
  ));

-- Update rooms policies to include shared access
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.rooms;
CREATE POLICY "Users can view their own rooms or shared rooms"
  ON public.rooms FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR EXISTS (
      SELECT 1 FROM public.shared_contracts
      WHERE shared_contracts.room_id = rooms.id
      AND shared_contracts.user_id = auth.uid()
    )
  );

-- Update documents policies to include shared access
DROP POLICY IF EXISTS "Users can view documents in their rooms" ON public.documents;
CREATE POLICY "Users can view documents in their rooms or shared rooms"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = documents.room_id
      AND (
        rooms.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.shared_contracts
          WHERE shared_contracts.room_id = rooms.id
          AND shared_contracts.user_id = auth.uid()
        )
      )
    )
  );

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';