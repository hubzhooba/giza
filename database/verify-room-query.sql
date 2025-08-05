-- Verify room query issue

-- 1. The console shows it's looking for this ID:
SELECT debug_load_room('263593f9-0955-456b-9023-672f94b769e2');

-- 2. But that's the UUID id, not the external_id. Let's check what happens
-- when we search by the correct external_id:
SELECT debug_load_room('4dd55234-029a-42ed-bcf9-adbd750a6dbb');

-- 3. Let's also check the simple SELECT query that DatabaseService.loadRoom uses:
SELECT *
FROM rooms
WHERE external_id = '263593f9-0955-456b-9023-672f94b769e2';

-- This should return nothing because 263593f9... is the id, not external_id

-- 4. Now with the correct external_id:
SELECT *
FROM rooms
WHERE external_id = '4dd55234-029a-42ed-bcf9-adbd750a6dbb';

-- This should return the room

-- 5. The issue appears to be that somewhere in the code, 
-- the room.id (UUID) is being used instead of room.external_id (TEXT)
-- Let's see all the data for this user's rooms:
SELECT 
    'Room UUID (id)' as field_type,
    id as value
FROM rooms
WHERE creator_id = 'yqRGaljOLb2IvKkYVa87Wdcc8m_4w6FI58Gej05gorA'
UNION ALL
SELECT 
    'External ID' as field_type,
    external_id as value
FROM rooms
WHERE creator_id = 'yqRGaljOLb2IvKkYVa87Wdcc8m_4w6FI58Gej05gorA'
ORDER BY field_type, value;