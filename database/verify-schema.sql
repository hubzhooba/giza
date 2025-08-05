-- Verify current schema state
-- Run each query separately in Supabase SQL Editor

-- 1. Check rooms table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rooms'
AND column_name IN ('id', 'creator_id', 'invitee_id', 'creator_wallet')
ORDER BY ordinal_position;

-- 2. Check documents table columns  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
AND column_name IN ('id', 'room_id')
ORDER BY ordinal_position;

-- 3. Check foreign key constraints on documents table
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name = 'documents';

-- 4. Check if documents.room_id is UUID or TEXT
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'room_id';

-- 5. Check if rooms.id is UUID
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms' 
    AND column_name = 'id';

-- 6. Check current policies on rooms table
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'rooms';