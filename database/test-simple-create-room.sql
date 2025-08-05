-- Test if simple_create_room function exists and works

-- 1. Check if the function exists
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'simple_create_room';

-- 2. Test calling the function directly
SELECT simple_create_room(jsonb_build_object(
    'external_id', 'test-' || gen_random_uuid()::TEXT,
    'name', 'Direct SQL Test',
    'encryption_key', 'test-key-123',
    'creator_id', 'wallet-address-test',
    'creator_email', 'test@wallet.com',
    'creator_name', 'Test Wallet User',
    'status', 'pending'
));

-- 3. If the above worked, check the inserted room
SELECT id, external_id, name, creator_id, status 
FROM rooms 
WHERE name = 'Direct SQL Test'
ORDER BY created_at DESC
LIMIT 1;