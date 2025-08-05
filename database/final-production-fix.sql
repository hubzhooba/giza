-- Final production fix - remove all problematic functions and create working ones

-- 1. Drop all existing versions of these functions
DROP FUNCTION IF EXISTS simple_create_room(JSONB);
DROP FUNCTION IF EXISTS create_room_final(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_room_no_trigger(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS join_room_simple(TEXT, TEXT);

-- 2. Create the WORKING simple_create_room without session_replication_role
CREATE OR REPLACE FUNCTION simple_create_room(room_data JSONB) 
RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    v_result JSONB;
BEGIN
    -- Generate UUID
    v_room_id := gen_random_uuid();
    
    -- Direct insert - no session changes
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
        
        RETURN COALESCE(v_result, jsonb_build_object('success', false, 'error', 'Room exists but not found'));
        
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create WORKING join_room_simple that doesn't have UUID issues
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,
    user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_room_record RECORD;
    v_room_uuid UUID;
BEGIN
    -- Find the room by external_id (which is TEXT)
    SELECT * INTO v_room_record
    FROM rooms
    WHERE external_id = room_external_id;
    
    IF NOT FOUND THEN
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
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO service_role;

GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_room_simple(TEXT, TEXT) TO service_role;

-- 5. Test both functions
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
        'name', 'Production Test Room',
        'encryption_key', 'test-key-123',
        'creator_id', 'wallet-test-creator',
        'creator_wallet', 'wallet-test-creator'
    ));
    
    RAISE NOTICE 'Create result: %', v_create_result;
    
    IF (v_create_result->>'success')::boolean THEN
        -- Test join
        v_join_result := join_room_simple(v_room_external_id, 'wallet-test-joiner');
        RAISE NOTICE 'Join result: %', v_join_result;
        
        -- Clean up
        DELETE FROM rooms WHERE external_id = v_room_external_id;
        RAISE NOTICE 'Test completed and cleaned up successfully!';
    ELSE
        RAISE NOTICE 'Create failed, skipping join test';
    END IF;
END $$;

-- 6. Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_rooms_external_id_lookup ON rooms(external_id);
CREATE INDEX IF NOT EXISTS idx_rooms_creator_wallet_lookup ON rooms(creator_wallet) WHERE creator_wallet IS NOT NULL;

-- 7. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All functions recreated without problematic features!';
    RAISE NOTICE '✅ No more session_replication_role!';
    RAISE NOTICE '✅ No more UUID comparison issues!';
    RAISE NOTICE '✅ Both create and join should work now!';
END $$;