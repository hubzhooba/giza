-- Debug and fix ALL UUID/TEXT issues once and for all

-- 1. First, let's see EXACTLY what columns we have
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
ORDER BY ordinal_position;

-- 2. Check if there are any CHECK constraints or other constraints causing issues
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'rooms'::regclass;

-- 3. Drop and recreate the create_room function with EXPLICIT casting
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
    -- Generate a new UUID for the room ID
    v_room_id := gen_random_uuid();
    
    -- Insert with EXPLICIT casting where needed
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
    SELECT
        v_room_id,
        p_external_id::TEXT,  -- Ensure it's TEXT
        p_name::TEXT,
        p_encryption_key::TEXT,
        p_creator_id::TEXT,
        p_creator_email::TEXT,
        p_creator_name::TEXT,
        p_creator_wallet::TEXT,
        p_description::TEXT,
        'pending'::TEXT,
        NOW(),
        NOW();
    
    RETURN v_room_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in create_room: % - SQLSTATE: %', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_room(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Create a diagnostic function to test what's failing
CREATE OR REPLACE FUNCTION test_room_insert() RETURNS TEXT AS $$
DECLARE
    v_result TEXT := '';
    v_room_id UUID;
BEGIN
    -- Test 1: Check column types
    SELECT string_agg(column_name || ': ' || data_type, ', ')
    INTO v_result
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rooms'
    AND column_name IN ('id', 'external_id', 'creator_id', 'status');
    
    v_result := 'Column types: ' || v_result || E'\n';
    
    -- Test 2: Try a simple insert
    BEGIN
        v_room_id := gen_random_uuid();
        INSERT INTO rooms (id, external_id, name, status, created_at, updated_at)
        VALUES (v_room_id, 'test-external-id'::TEXT, 'Test Room'::TEXT, 'pending'::TEXT, NOW(), NOW());
        
        v_result := v_result || 'Simple insert: SUCCESS' || E'\n';
        
        -- Clean up
        DELETE FROM rooms WHERE id = v_room_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_result := v_result || 'Simple insert: FAILED - ' || SQLERRM || E'\n';
    END;
    
    -- Test 3: Try with creator_id
    BEGIN
        v_room_id := gen_random_uuid();
        INSERT INTO rooms (id, external_id, name, creator_id, status, created_at, updated_at)
        VALUES (v_room_id, 'test-external-id-2'::TEXT, 'Test Room 2'::TEXT, 'test-creator'::TEXT, 'pending'::TEXT, NOW(), NOW());
        
        v_result := v_result || 'Insert with creator_id: SUCCESS' || E'\n';
        
        -- Clean up
        DELETE FROM rooms WHERE id = v_room_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_result := v_result || 'Insert with creator_id: FAILED - ' || SQLERRM || ' - SQLSTATE: ' || SQLSTATE || E'\n';
    END;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to run the test
GRANT EXECUTE ON FUNCTION test_room_insert() TO anon;
GRANT EXECUTE ON FUNCTION test_room_insert() TO authenticated;

-- 5. Run the diagnostic
SELECT test_room_insert();

-- 6. If status column is the issue (it might be an enum), let's check
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
    AND column_name = 'status';

-- 7. Check if status is an enum type
SELECT 
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname;

-- 8. If status is an enum, we need to handle it differently
DO $$
DECLARE
    v_is_enum BOOLEAN;
BEGIN
    -- Check if status is an enum
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        JOIN pg_type t ON t.typname = c.udt_name
        WHERE c.table_schema = 'public' 
        AND c.table_name = 'rooms' 
        AND c.column_name = 'status'
        AND t.typtype = 'e'
    ) INTO v_is_enum;
    
    IF v_is_enum THEN
        RAISE NOTICE 'Status column is an ENUM type - this might be causing the issue';
    ELSE
        RAISE NOTICE 'Status column is NOT an enum';
    END IF;
END $$;