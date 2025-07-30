-- Fix infinite recursion in RLS policies

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own rooms or shared rooms" ON public.rooms;

-- Create a simpler policy that avoids recursion
CREATE POLICY "Users can view their own rooms or shared rooms"
  ON public.rooms FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR id IN (
      SELECT room_id FROM public.shared_contracts
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the documents policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view documents in their rooms or shared rooms" ON public.documents;

CREATE POLICY "Users can view documents in their rooms or shared rooms"
  ON public.documents FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM public.rooms
      WHERE creator_id = auth.uid()
    )
    OR room_id IN (
      SELECT room_id FROM public.shared_contracts
      WHERE user_id = auth.uid()
    )
  );

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';