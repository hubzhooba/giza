-- Create a simpler approach that completely avoids UUID comparisons

-- 1. Drop the problematic function
DROP FUNCTION IF EXISTS create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Create a much simpler function that just inserts
CREATE OR REPLACE FUNCTION simple_create_room(room_data JSONB) 
RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    v_result JSONB;
BEGIN
    -- Generate UUID
    v_room_id := gen_random_uuid();
    
    -- Direct insert with explicit column list
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
        room_data->>'creator_email',
        room_data->>'creator_name',
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

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION simple_create_room(JSONB) TO service_role;

-- 4. Test it
DO $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT simple_create_room(jsonb_build_object(
        'external_id', 'test-' || gen_random_uuid()::TEXT,
        'name', 'Test Room',
        'encryption_key', 'test-key',
        'creator_id', 'test-wallet-address',
        'creator_email', 'test@example.com',
        'creator_name', 'Test User'
    )) INTO v_result;
    
    IF (v_result->>'success')::boolean THEN
        RAISE NOTICE 'SUCCESS! Room created with ID: %', v_result->>'id';
        -- Clean up
        DELETE FROM rooms WHERE id = (v_result->>'id')::UUID;
    ELSE
        RAISE NOTICE 'FAILED: %', v_result->>'error';
    END IF;
END $$;

-- 5. Create an even simpler direct insert if RPC continues to fail
CREATE OR REPLACE FUNCTION direct_insert_room(
    p_external_id TEXT,
    p_name TEXT,
    p_encryption_key TEXT,
    p_creator_id TEXT,
    p_creator_email TEXT,
    p_creator_name TEXT
) RETURNS TABLE (id UUID, success BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO rooms (
        external_id,
        name,
        encryption_key,
        creator_id,
        creator_email,
        creator_name,
        status
    ) 
    VALUES (
        p_external_id,
        p_name,
        p_encryption_key,
        p_creator_id,
        p_creator_email,
        p_creator_name,
        'pending'
    )
    RETURNING rooms.id, true AS success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION direct_insert_room(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon;
GRANT EXECUTE ON FUNCTION direct_insert_room(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- 6. Success
DO $$
BEGIN
    RAISE NOTICE '✅ Created simple_create_room function that uses JSONB';
    RAISE NOTICE '✅ This avoids all UUID/TEXT comparison issues';
    RAISE NOTICE '✅ Also created direct_insert_room as backup';
END $$;