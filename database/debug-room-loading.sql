-- Debug room loading issue

-- 1. Test with the external_id from the browser
SELECT debug_load_room('263593f9-0955-456b-9023-672f94b769e2');

-- 2. Test with the actual external_id from the database
SELECT debug_load_room('4dd55234-029a-42ed-bcf9-adbd750a6dbb');

-- 3. Show the room structure for wallet user
SELECT 
    id,
    external_id,
    name,
    creator_id,
    LENGTH(creator_id) as creator_id_length,
    creator_wallet
FROM rooms
WHERE creator_id = 'yqRGaljOLb2IvKkYVa87Wdcc8m_4w6FI58Gej05gorA'
ORDER BY created_at DESC;

-- 4. The issue is that the tents list is using room.id instead of room.external_id
-- Let's check what the rooms table structure expects
SELECT 
    'The problem:' as issue,
    'Tents page links to /tents/[room.id]' as current_behavior,
    'But room.id is the UUID, not the external_id' as problem,
    'LoadRoom expects external_id parameter' as expectation;