-- Fix RPC function and policies for room access

-- First, ensure the RPC function exists and works correctly
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.external_id,
        r.name,
        r.creator_id,
        COALESCE(creator_profile.email, '')::TEXT as creator_email,
        COALESCE(creator_profile.full_name, creator_profile.email, '')::TEXT as creator_name,
        r.invitee_id,
        COALESCE(r.invitee_email, '')::TEXT as invitee_email,
        COALESCE(r.invitee_name, '')::TEXT as invitee_name,
        r.invitee_joined_at,
        r.status,
        r.encryption_key,
        r.created_at,
        r.updated_at
    FROM rooms r
    LEFT JOIN profiles creator_profile ON creator_profile.id = r.creator_id
    WHERE r.external_id = room_external_id::UUID
    LIMIT 1;
END;
$$;

-- Grant execute permissions to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO service_role;

-- Test the function to make sure it works
-- SELECT * FROM get_room_for_invite('your-room-external-id-here');

-- Make sure the rooms table policies allow authenticated users to read their rooms
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.rooms;

CREATE POLICY "Users can view rooms they participate in"
  ON public.rooms FOR SELECT
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = invitee_id
  );

-- Make sure there's a policy for INSERT
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;

CREATE POLICY "Users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Make sure there's a policy for UPDATE
DROP POLICY IF EXISTS "Users can update rooms they participate in" ON public.rooms;

CREATE POLICY "Users can update rooms they participate in"
  ON public.rooms FOR UPDATE
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = invitee_id
  );

-- Force schema reload
NOTIFY pgrst, 'reload schema';