-- Check if join_room_simple function exists and works

-- 1. Check if the function exists
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'join_room_simple';

-- 2. Check the function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'join_room_simple';

-- 3. Test joining a room
-- First, find a room that exists
SELECT id, external_id, name, creator_id, invitee_id
FROM rooms
WHERE invitee_id IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- 4. Test the join function with a wallet address
-- Replace 'YOUR_ROOM_EXTERNAL_ID' with an actual external_id from above
-- This simulates a wallet user joining
/*
SELECT join_room_simple(
    'YOUR_ROOM_EXTERNAL_ID',
    'wallet-address-test-user'
);
*/