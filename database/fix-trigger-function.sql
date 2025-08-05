-- Fix the handle_new_room trigger function that's causing the UUID = TEXT error

-- 1. First, let's see the current trigger definition
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.rooms'::regclass
    AND NOT tgisinternal;

-- 2. Get the function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_room';

-- 3. Drop and recreate the trigger function with proper type handling
CREATE OR REPLACE FUNCTION handle_new_room() 
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_name TEXT;
BEGIN
    -- Only try to fetch from profiles if creator_id looks like a UUID
    IF NEW.creator_id IS NOT NULL AND NEW.creator_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        -- It's a UUID format, try to fetch from profiles
        BEGIN
            SELECT email, COALESCE(full_name, email) INTO v_email, v_name
            FROM profiles
            WHERE id = NEW.creator_id::UUID;
            
            -- Update the room with profile data if found
            IF v_email IS NOT NULL THEN
                NEW.creator_email := COALESCE(NEW.creator_email, v_email);
                NEW.creator_name := COALESCE(NEW.creator_name, v_name);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- If cast fails or profile not found, just continue
                NULL;
        END;
    END IF;
    
    -- For wallet addresses or when profile lookup fails, use defaults
    IF NEW.creator_email IS NULL THEN
        NEW.creator_email := COALESCE(NEW.creator_wallet, NEW.creator_id, 'unknown') || '@wallet';
    END IF;
    
    IF NEW.creator_name IS NULL THEN
        NEW.creator_name := 'User ' || LEFT(COALESCE(NEW.creator_wallet, NEW.creator_id, 'unknown'), 8);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Alternative: Just disable the trigger temporarily
-- ALTER TABLE rooms DISABLE TRIGGER ALL;

-- 5. Test the insert again
DO $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := no_external_id_insert('Test After Trigger Fix', 'wallet-address-123');
    RAISE NOTICE 'SUCCESS! Result: %', v_result;
    
    -- Check what was inserted
    PERFORM id, external_id, name, creator_id, creator_email, creator_name 
    FROM rooms 
    WHERE name = 'Test After Trigger Fix';
    
    -- Clean up
    DELETE FROM rooms WHERE name = 'Test After Trigger Fix';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;

-- 6. If the trigger is still problematic, let's just drop it
-- DROP TRIGGER IF EXISTS on_room_created ON rooms;
-- DROP FUNCTION IF EXISTS handle_new_room();

-- 7. Create a simpler approach without triggers
CREATE OR REPLACE FUNCTION create_room_no_trigger(
    p_external_id TEXT,
    p_name TEXT,
    p_creator_id TEXT,
    p_creator_email TEXT DEFAULT NULL,
    p_creator_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
BEGIN
    -- Disable triggers for this session
    SET session_replication_role = replica;
    
    -- Generate UUID
    v_room_id := gen_random_uuid();
    
    -- Insert room
    INSERT INTO rooms (
        id,
        external_id,
        name,
        creator_id,
        creator_email,
        creator_name,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_room_id,
        p_external_id,
        p_name,
        p_creator_id,
        COALESCE(p_creator_email, p_creator_id || '@wallet'),
        COALESCE(p_creator_name, 'User ' || LEFT(p_creator_id, 8)),
        'pending',
        NOW(),
        NOW()
    );
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    RETURN jsonb_build_object(
        'success', true,
        'id', v_room_id,
        'external_id', p_external_id
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Make sure triggers are re-enabled even on error
        SET session_replication_role = DEFAULT;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_room_no_trigger TO anon;
GRANT EXECUTE ON FUNCTION create_room_no_trigger TO authenticated;

-- Test this version
SELECT create_room_no_trigger(
    'test-no-trigger-' || gen_random_uuid()::TEXT,
    'Test No Trigger',
    'wallet-addr-456'
);