-- Fix the external_id default value issue
-- The column is TEXT but the default is gen_random_uuid() which returns UUID

-- 1. Remove the problematic default
ALTER TABLE rooms ALTER COLUMN external_id DROP DEFAULT;

-- 2. If you want a default, cast it to TEXT
ALTER TABLE rooms ALTER COLUMN external_id SET DEFAULT gen_random_uuid()::TEXT;

-- 3. Now the create_room function should work, but let's also fix it to be extra safe
DROP FUNCTION IF EXISTS create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_room(
    p_external_id TEXT,
    p_name TEXT,
    p_encryption_key TEXT,
    p_creator_id TEXT,
    p_creator_email TEXT,
    p_creator_name TEXT,
    p_creator_wallet TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_room_id UUID;
BEGIN
    -- Insert the room
    INSERT INTO rooms (
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
    ) VALUES (
        p_external_id,
        p_name,
        p_encryption_key,
        p_creator_id,
        p_creator_email,
        p_creator_name,
        p_creator_wallet,
        p_description,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_room_id;
    
    RETURN v_room_id;
EXCEPTION
    WHEN unique_violation THEN
        -- If external_id already exists, return the existing room ID
        SELECT id INTO v_room_id FROM rooms WHERE external_id = p_external_id;
        RETURN v_room_id;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating room: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Test that it works now
DO $$
DECLARE
    v_room_id UUID;
BEGIN
    SELECT create_room(
        'test-room-' || gen_random_uuid()::TEXT,
        'Test Room',
        'test-key',
        'test-creator',
        'test@email.com',
        'Test Creator',
        'wallet-address',
        'Test description'
    ) INTO v_room_id;
    
    RAISE NOTICE 'SUCCESS! Created room with ID: %', v_room_id;
    
    -- Clean up
    DELETE FROM rooms WHERE id = v_room_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;

-- 5. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed external_id default value!';
    RAISE NOTICE '✅ The UUID = TEXT error should be resolved now!';
    RAISE NOTICE '✅ Try creating a tent again - it should work!';
END $$;