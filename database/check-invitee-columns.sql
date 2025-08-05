-- Check if the issue is with invitee columns

-- 1. Show ALL columns in rooms table
SELECT 
    ordinal_position,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
ORDER BY ordinal_position;

-- 2. Specifically check invitee-related columns
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
    AND column_name LIKE '%invitee%';

-- 3. Check if the issue is in the idx_rooms_full_lookup index
-- This index includes invitee_name and invitee_email which might have wrong types
DROP INDEX IF EXISTS idx_rooms_full_lookup;

-- 4. Test insert without any invitee data
DO $$
DECLARE
    v_room_id UUID;
BEGIN
    v_room_id := gen_random_uuid();
    
    BEGIN
        INSERT INTO rooms (
            id,
            external_id,
            name,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_room_id,
            'minimal-test'::TEXT,
            'Minimal Test'::TEXT,
            'pending'::TEXT,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Minimal insert: SUCCESS';
        DELETE FROM rooms WHERE id = v_room_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Minimal insert FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- 5. Now test with creator_id only
DO $$
DECLARE
    v_room_id UUID;
BEGIN
    v_room_id := gen_random_uuid();
    
    BEGIN
        INSERT INTO rooms (
            id,
            external_id,
            name,
            creator_id,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_room_id,
            'creator-test'::TEXT,
            'Creator Test'::TEXT,
            'wallet-address'::TEXT,
            'pending'::TEXT,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Insert with creator_id: SUCCESS';
        DELETE FROM rooms WHERE id = v_room_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Insert with creator_id FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;