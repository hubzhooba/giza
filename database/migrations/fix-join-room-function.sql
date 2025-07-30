-- Fix join_room function to properly handle room joining
DROP FUNCTION IF EXISTS join_room(TEXT, UUID);

CREATE OR REPLACE FUNCTION join_room(room_external_id TEXT, user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_record RECORD;
    user_profile RECORD;
BEGIN
    -- Get the room
    SELECT * INTO room_record
    FROM rooms
    WHERE external_id = room_external_id::UUID;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;
    
    -- Check if user is already in the room
    IF room_record.creator_id = user_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are the creator of this room',
            'role', 'creator'
        );
    END IF;
    
    IF room_record.invitee_id = user_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already a member of this room',
            'role', 'invitee'
        );
    END IF;
    
    -- Check if room already has an invitee
    IF room_record.invitee_id IS NOT NULL THEN
        RAISE EXCEPTION 'Room is full. Only two participants allowed per room.';
    END IF;
    
    -- Get user profile
    SELECT * INTO user_profile
    FROM profiles
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Update room with invitee
    UPDATE rooms
    SET 
        invitee_id = user_id,
        invitee_email = user_profile.email,
        invitee_name = COALESCE(user_profile.full_name, user_profile.email),
        invitee_joined_at = NOW(),
        updated_at = NOW()
    WHERE external_id = room_external_id::UUID;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined the room',
        'role', 'invitee'
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION join_room(TEXT, UUID) TO authenticated;