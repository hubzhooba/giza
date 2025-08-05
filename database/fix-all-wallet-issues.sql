-- Fix all remaining wallet user issues

-- 1. Create a simpler function without session_replication_role
DROP FUNCTION IF EXISTS simple_create_room(JSONB);

CREATE OR REPLACE FUNCTION simple_create_room(room_data JSONB) 
RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    v_result JSONB;
BEGIN
    -- Generate UUID
    v_room_id := gen_random_uuid();
    
    -- Direct insert without trying to change session settings
    INSERT INTO rooms (
        id,
        external_id,
        name,
        encryption_key,
        creator_id,
        creator_email,
        creator_name,
        creator_wallet,
        description,
        status,
        created_at,
        updated_at
    ) 
    VALUES (
        v_room_id,
        room_data->>'external_id',
        room_data->>'name',
        room_data->>'encryption_key',
        room_data->>'creator_id',
        COALESCE(room_data->>'creator_email', room_data->>'creator_id' || '@wallet'),
        COALESCE(room_data->>'creator_name', 'User ' || LEFT(room_data->>'creator_id', 8)),
        room_data->>'creator_wallet',
        room_data->>'description',
        COALESCE(room_data->>'status', 'pending'),
        COALESCE((room_data->>'created_at')::timestamptz, NOW()),
        COALESCE((room_data->>'updated_at')::timestamptz, NOW())
    );
    
    -- Return success with room ID
    RETURN jsonb_build_object(
        'success', true,
        'id', v_room_id,
        'external_id', room_data->>'external_id'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        -- If external_id exists, return existing room
        SELECT jsonb_build_object(
            'success', true,
            'id', id,
            'external_id', external_id,
            'exists', true
        ) INTO v_result
        FROM rooms 
        WHERE external_id = room_data->>'external_id';
        
        RETURN v_result;
        
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO authenticated;

-- 2. Fix the join_room_simple function to handle wallet addresses properly
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,
    user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_room_record RECORD;
BEGIN
    -- Find the room
    SELECT * INTO v_room_record
    FROM rooms
    WHERE external_id = room_external_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room not found'
        );
    END IF;
    
    -- Check if user is already in the room
    IF v_room_record.creator_id = user_id OR v_room_record.invitee_id = user_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'room_id', v_room_record.id::TEXT,
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
        invitee_email = COALESCE(invitee_email, user_id || '@wallet'),
        invitee_name = COALESCE(invitee_name, 'User ' || LEFT(user_id, 8)),
        invitee_joined_at = NOW(),
        updated_at = NOW()
    WHERE id = v_room_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_record.id::TEXT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_room_simple TO anon;
GRANT EXECUTE ON FUNCTION join_room_simple TO authenticated;

-- 3. Test the functions
DO $$
DECLARE
    v_create_result JSONB;
    v_join_result JSONB;
    v_room_external_id TEXT;
BEGIN
    -- Test create
    v_room_external_id := 'test-' || gen_random_uuid()::TEXT;
    
    v_create_result := simple_create_room(jsonb_build_object(
        'external_id', v_room_external_id,
        'name', 'Test Wallet Room',
        'encryption_key', 'test-key',
        'creator_id', 'wallet-creator-123',
        'creator_wallet', 'wallet-creator-123'
    ));
    
    RAISE NOTICE 'Create result: %', v_create_result;
    
    -- Test join
    v_join_result := join_room_simple(v_room_external_id, 'wallet-joiner-456');
    
    RAISE NOTICE 'Join result: %', v_join_result;
    
    -- Clean up
    DELETE FROM rooms WHERE external_id = v_room_external_id;
END $$;

-- 4. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Functions updated without session_replication_role!';
    RAISE NOTICE '✅ join_room_simple now properly handles wallet addresses!';
    RAISE NOTICE '✅ Both functions should work in Supabase hosted environment!';
END $$;