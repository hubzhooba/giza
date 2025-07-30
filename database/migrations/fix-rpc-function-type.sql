-- Fix the RPC function to handle TEXT parameter type correctly
-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_room_for_invite(UUID);
DROP FUNCTION IF EXISTS get_room_for_invite(TEXT);

-- Create function to get room data for invite links (public access)
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
    -- Return room data for invite link (accessible to anyone with the link)
    RETURN QUERY
    SELECT 
        r.external_id,
        r.name,
        r.creator_id,
        creator_profile.email as creator_email,
        creator_profile.full_name as creator_name,
        r.invitee_id,
        invitee_profile.email as invitee_email,
        invitee_profile.full_name as invitee_name,
        r.invitee_joined_at,
        r.status,
        r.encryption_key,
        r.created_at,
        r.updated_at
    FROM rooms r
    LEFT JOIN profiles creator_profile ON creator_profile.id = r.creator_id
    LEFT JOIN profiles invitee_profile ON invitee_profile.id = r.invitee_id
    WHERE r.external_id = room_external_id::UUID;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_room_for_invite(TEXT) TO authenticated;