-- Find where the UUID = TEXT comparison is happening (fixed version)

-- 1. Check if there are any triggers on the rooms table
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.rooms'::regclass
    AND NOT tgisinternal;

-- 2. Check if there are any rules on the rooms table
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE schemaname = 'public' 
    AND tablename = 'rooms';

-- 3. Check ALL constraints on rooms table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid, true) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.rooms'::regclass
ORDER BY contype, conname;

-- 4. Test a completely minimal insert bypassing all defaults
DO $$
DECLARE
    v_id UUID;
BEGIN
    v_id := gen_random_uuid();
    
    -- Most minimal insert possible
    BEGIN
        INSERT INTO rooms (id, created_at, updated_at) VALUES (v_id, NOW(), NOW());
        RAISE NOTICE 'Minimal insert SUCCESS with id: %', v_id;
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Minimal insert FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    
    -- Now test with external_id as TEXT
    BEGIN
        INSERT INTO rooms (id, external_id, created_at, updated_at) 
        VALUES (v_id, 'test-external-' || v_id::TEXT, NOW(), NOW());
        RAISE NOTICE 'Insert with external_id SUCCESS';
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Insert with external_id FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    
    -- Test with name
    BEGIN
        INSERT INTO rooms (id, external_id, name, created_at, updated_at) 
        VALUES (v_id, 'test-ext-2', 'Test Name', NOW(), NOW());
        RAISE NOTICE 'Insert with name SUCCESS';
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Insert with name FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    
    -- Test with creator_id
    BEGIN
        INSERT INTO rooms (id, external_id, name, creator_id, created_at, updated_at) 
        VALUES (v_id, 'test-ext-3', 'Test Name', 'test-creator', NOW(), NOW());
        RAISE NOTICE 'Insert with creator_id SUCCESS';
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Insert with creator_id FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- 5. Check defaults on all columns
SELECT 
    column_name,
    column_default,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
    AND column_default IS NOT NULL
ORDER BY ordinal_position;