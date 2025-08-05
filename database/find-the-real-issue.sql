-- Find where the UUID = TEXT comparison is happening

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
    rulename,
    pg_get_ruledef(oid, true) AS rule_definition
FROM pg_rules
WHERE schemaname = 'public' 
    AND tablename = 'rooms';

-- 3. Check for any generated columns
SELECT 
    column_name,
    generation_expression,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
    AND generation_expression IS NOT NULL;

-- 4. Check ALL constraints on rooms table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid, true) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.rooms'::regclass
ORDER BY contype, conname;

-- 5. Test a completely minimal insert bypassing all defaults
DO $$
DECLARE
    v_id UUID;
BEGIN
    v_id := gen_random_uuid();
    
    -- Most minimal insert possible
    BEGIN
        EXECUTE format('INSERT INTO rooms (id, created_at, updated_at) VALUES (%L, NOW(), NOW())', v_id);
        RAISE NOTICE 'Minimal insert SUCCESS with id: %', v_id;
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Minimal insert FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    
    -- Now test with external_id
    BEGIN
        EXECUTE format('INSERT INTO rooms (id, external_id, created_at, updated_at) VALUES (%L, %L, NOW(), NOW())', 
            v_id, 'test-external-' || v_id::TEXT);
        RAISE NOTICE 'Insert with external_id SUCCESS';
        DELETE FROM rooms WHERE id = v_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Insert with external_id FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- 6. Check if it's the external_id default causing issues
SELECT 
    column_name,
    column_default,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
    AND column_default LIKE '%gen_random_uuid%';