-- Find the exact UUID issue

-- 1. Show ALL columns in rooms table with their types
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

-- 2. Check for any hidden system columns or constraints
SELECT 
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull AS not_null,
    pg_get_expr(d.adbin, d.adrelid) AS default_value
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE a.attrelid = 'public.rooms'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY a.attnum;

-- 3. Check if there are any triggers that might be interfering
SELECT 
    tgname AS trigger_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.rooms'::regclass
    AND NOT tgisinternal;

-- 4. Look for any CHECK constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.rooms'::regclass
    AND contype = 'c';

-- 5. Check if the issue is with a specific comparison - look at indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'rooms'
    AND schemaname = 'public';

-- 6. Test the exact insert that's failing
DO $$
DECLARE
    v_room_id UUID;
    v_error_detail TEXT;
    v_error_hint TEXT;
    v_error_context TEXT;
BEGIN
    v_room_id := gen_random_uuid();
    
    BEGIN
        -- This is exactly what the RPC function tries to do
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
            'test-external-id-debug'::TEXT,
            'Test Room'::TEXT,
            'test-key'::TEXT,
            'test-creator-id'::TEXT,
            'test@email.com'::TEXT,
            'Test Creator'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'pending'::TEXT,
            NOW(),
            NOW()
        );
        
        -- If we get here, it worked
        RAISE NOTICE 'INSERT SUCCESSFUL! Cleaning up...';
        DELETE FROM rooms WHERE id = v_room_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS 
                v_error_detail = PG_EXCEPTION_DETAIL,
                v_error_hint = PG_EXCEPTION_HINT,
                v_error_context = PG_EXCEPTION_CONTEXT;
            
            RAISE NOTICE 'INSERT FAILED!';
            RAISE NOTICE 'Error: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
            RAISE NOTICE 'Detail: %', v_error_detail;
            RAISE NOTICE 'Hint: %', v_error_hint;
            RAISE NOTICE 'Context: %', v_error_context;
    END;
END $$;