-- Ultra simple approach - just make the insert work

-- 1. Remove ALL defaults that might cause issues
ALTER TABLE rooms ALTER COLUMN external_id DROP DEFAULT;

-- 2. Create the simplest possible insert function
CREATE OR REPLACE FUNCTION ultra_simple_room_insert(
    p_external_id TEXT,
    p_name TEXT,
    p_creator_id TEXT
) RETURNS TEXT AS $$
DECLARE
    v_room_id UUID;
BEGIN
    -- Generate our own UUID
    v_room_id := gen_random_uuid();
    
    -- Use EXECUTE to avoid any parsing issues
    EXECUTE format(
        'INSERT INTO rooms (id, external_id, name, creator_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)'
    ) USING v_room_id, p_external_id, p_name, p_creator_id, 'pending', NOW(), NOW();
    
    RETURN v_room_id::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Insert failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ultra_simple_room_insert(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION ultra_simple_room_insert(TEXT, TEXT, TEXT) TO authenticated;

-- 3. Test it
DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := ultra_simple_room_insert(
        'test-' || gen_random_uuid()::TEXT,
        'Test Room Ultra Simple',
        'test-creator'
    );
    
    RAISE NOTICE 'SUCCESS! Created room with ID: %', v_result;
    
    -- Clean up
    DELETE FROM rooms WHERE id = v_result::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;

-- 4. If external_id is the problem, let's just remove it from the insert completely
CREATE OR REPLACE FUNCTION no_external_id_insert(
    p_name TEXT,
    p_creator_id TEXT
) RETURNS TEXT AS $$
DECLARE
    v_room_id UUID;
    v_external_id TEXT;
BEGIN
    -- Generate both IDs as text
    v_room_id := gen_random_uuid();
    v_external_id := gen_random_uuid()::TEXT;
    
    -- Insert with all TEXT values where needed
    INSERT INTO rooms (
        id,
        external_id,
        name,
        creator_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_room_id,           -- UUID
        v_external_id,       -- TEXT
        p_name,              -- TEXT
        p_creator_id,        -- TEXT  
        'pending'::TEXT,     -- TEXT
        NOW(),               -- TIMESTAMPTZ
        NOW()                -- TIMESTAMPTZ
    );
    
    RETURN jsonb_build_object(
        'id', v_room_id::TEXT,
        'external_id', v_external_id
    )::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION no_external_id_insert(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION no_external_id_insert(TEXT, TEXT) TO authenticated;

-- Test this one too
SELECT no_external_id_insert('Test No External', 'test-creator');