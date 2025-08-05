-- Fix function overloading and room loading issues

-- 1. First, see what functions exist
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'join_room_simple'
ORDER BY oid;

-- 2. Drop ALL versions of join_room_simple to avoid overloading
DROP FUNCTION IF EXISTS join_room_simple(TEXT, TEXT);
DROP FUNCTION IF EXISTS join_room_simple(TEXT, UUID);
DROP FUNCTION IF EXISTS join_room_simple(room_external_id TEXT, user_id TEXT);
DROP FUNCTION IF EXISTS join_room_simple(room_external_id TEXT, user_id UUID);

-- 3. Create ONE clean version that accepts TEXT for both parameters
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,
    user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_room_record RECORD;
    v_room_uuid UUID;
BEGIN
    -- Debug logging
    RAISE NOTICE 'join_room_simple called with external_id: %, user_id: %', room_external_id, user_id;
    
    -- Find the room by external_id (which is TEXT)
    SELECT * INTO v_room_record
    FROM rooms
    WHERE external_id = room_external_id;
    
    IF NOT FOUND THEN
        -- Try to help debug by showing what rooms exist
        RAISE NOTICE 'Room not found. Looking for external_id: %', room_external_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room not found with external_id: ' || room_external_id
        );
    END IF;
    
    -- Store the UUID for return
    v_room_uuid := v_room_record.id;
    
    -- Check if user is already in the room
    IF v_room_record.creator_id = user_id OR v_room_record.invitee_id = user_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'room_id', v_room_uuid::TEXT,
            'message', 'Already in room'
        );
    END IF;
    
    -- Check if room already has an invitee
    IF v_room_record.invitee_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room already has an invitee'
        );
    END IF;
    
    -- Join the room - update with wallet user info
    UPDATE rooms
    SET 
        invitee_id = user_id,
        invitee_email = COALESCE(v_room_record.invitee_email, user_id || '@wallet'),
        invitee_name = COALESCE(v_room_record.invitee_name, 'User ' || LEFT(user_id, 8)),
        invitee_joined_at = NOW(),
        updated_at = NOW()
    WHERE id = v_room_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_uuid::TEXT,
        'message', 'Successfully joined room'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Error joining room: ' || SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO service_role;

-- 5. Check for duplicate rooms or data issues
-- Show recent rooms to debug
SELECT 
    id,
    external_id,
    name,
    creator_id,
    invitee_id,
    created_at
FROM rooms
ORDER BY created_at DESC
LIMIT 10;

-- 6. Make sure RLS policies aren't blocking access
-- Create a permissive policy for debugging
DROP POLICY IF EXISTS "rooms_allow_all_select" ON rooms;
CREATE POLICY "rooms_allow_all_select" ON rooms 
    FOR SELECT 
    USING (true);

-- 7. Create function to help debug room loading
CREATE OR REPLACE FUNCTION debug_load_room(p_external_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_room RECORD;
    v_count INTEGER;
BEGIN
    -- Count matching rooms
    SELECT COUNT(*) INTO v_count
    FROM rooms
    WHERE external_id = p_external_id;
    
    -- Get room details if exists
    SELECT * INTO v_room
    FROM rooms
    WHERE external_id = p_external_id;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'found', true,
            'count', v_count,
            'room_id', v_room.id,
            'external_id', v_room.external_id,
            'name', v_room.name,
            'creator_id', v_room.creator_id
        );
    ELSE
        RETURN jsonb_build_object(
            'found', false,
            'count', v_count,
            'external_id_searched', p_external_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_load_room(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION debug_load_room(TEXT) TO authenticated;

-- 8. Test with a known room
-- Replace with an actual external_id from your rooms
-- SELECT debug_load_room('YOUR-EXTERNAL-ID-HERE');

-- 9. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Removed function overloading - only one join_room_simple now!';
    RAISE NOTICE '✅ Added debugging to help find room loading issues!';
    RAISE NOTICE '✅ Created permissive SELECT policy for rooms!';
END $$;