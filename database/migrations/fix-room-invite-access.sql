-- Create a function to get room data for invite links (accessible by anyone with the ID)
CREATE OR REPLACE FUNCTION get_room_for_invite(room_external_id TEXT)
RETURNS TABLE (
  id UUID,
  external_id UUID,
  name TEXT,
  creator_id UUID,
  creator_email TEXT,
  creator_name TEXT,
  invitee_id UUID,
  invitee_email TEXT,
  invitee_name TEXT,
  invitee_joined_at TIMESTAMPTZ,
  encryption_key TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.external_id,
    r.name,
    r.creator_id,
    cp.email as creator_email,
    cp.full_name as creator_name,
    r.invitee_id,
    ip.email as invitee_email,
    ip.full_name as invitee_name,
    r.invitee_joined_at,
    r.encryption_key,
    r.status,
    r.created_at,
    r.updated_at
  FROM rooms r
  LEFT JOIN profiles cp ON r.creator_id = cp.id
  LEFT JOIN profiles ip ON r.invitee_id = ip.id
  WHERE r.external_id = room_external_id::UUID;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO anon;

-- Update the rooms RLS policy to be more permissive for reading
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON rooms;

CREATE POLICY "Users can view rooms they participate in"
ON rooms FOR SELECT
USING (
  auth.uid() = creator_id 
  OR auth.uid() = invitee_id
);

-- For anonymous users accessing invite links, they should use the RPC function