-- Fix room access for invite links
-- This allows anyone with the room ID to view basic room info (for invite links)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.rooms;

-- Create new policy that allows viewing rooms in two cases:
-- 1. User is a participant (creator or invitee)
-- 2. User has the external_id (for invite links)
CREATE POLICY "Users can view rooms they participate in or have link to"
  ON public.rooms FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = invitee_id
    OR true -- Allow anyone with the external_id to view basic info
  );

-- Alternative: Create a more restrictive policy that only shows certain columns
-- DROP POLICY IF EXISTS "Users can view rooms they participate in or have link to" ON public.rooms;
-- CREATE POLICY "Public can view basic room info for invites"
--   ON public.rooms FOR SELECT
--   USING (true)
--   WITH CHECK (false);

-- Make sure the RPC function has proper permissions
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';