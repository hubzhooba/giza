-- Create all missing RPC functions and ensure proper permissions

-- 1. First check if the function exists and drop it if it does
DROP FUNCTION IF EXISTS create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Create the create_room function
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
    -- Generate a new UUID for the room ID
    v_room_id := gen_random_uuid();
    
    -- Insert the room
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
    ) VALUES (
        v_room_id,
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
    );
    
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

-- 3. Make sure the function is accessible
ALTER FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Verify the rooms table has all required columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'creator_wallet') THEN
        ALTER TABLE rooms ADD COLUMN creator_wallet TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'description') THEN
        ALTER TABLE rooms ADD COLUMN description TEXT;
    END IF;
END $$;

-- 5. Make sure RLS policies allow insert
DROP POLICY IF EXISTS "Enable insert for all users" ON rooms;
CREATE POLICY "Enable insert for all users" ON rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all users" ON rooms;
CREATE POLICY "Enable select for all users" ON rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for all users" ON rooms;
CREATE POLICY "Enable update for all users" ON rooms FOR UPDATE USING (true);

-- 6. Test the function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'create_room' 
        AND pg_get_function_identity_arguments(oid) = 'p_external_id text, p_name text, p_encryption_key text, p_creator_id text, p_creator_email text, p_creator_name text, p_creator_wallet text, p_description text'
    ) THEN
        RAISE NOTICE '✅ create_room function created successfully!';
    ELSE
        RAISE EXCEPTION '❌ create_room function was not created!';
    END IF;
END $$;

-- 7. Create a simpler version for direct insert if RPC continues to fail
CREATE OR REPLACE FUNCTION insert_room_direct(room_data jsonb) 
RETURNS jsonb AS $$
DECLARE
    v_room_id UUID;
BEGIN
    v_room_id := gen_random_uuid();
    
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
    ) VALUES (
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
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object('success', true, 'id', v_room_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION insert_room_direct(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION insert_room_direct(jsonb) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All functions created and permissions granted!';
    RAISE NOTICE '✅ RLS policies updated for insert/select/update!';
    RAISE NOTICE '✅ You should now be able to create rooms!';
END $$;