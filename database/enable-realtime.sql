-- Enable real-time for tables that need it
-- This is required for subscriptions to work

-- =====================================================
-- STEP 1: ENABLE REALTIME FOR ROOMS TABLE
-- =====================================================

-- Remove table from publication if exists
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS rooms;

-- Add table to publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- =====================================================
-- STEP 2: ENABLE REALTIME FOR DOCUMENTS TABLE
-- =====================================================

-- Remove table from publication if exists
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS documents;

-- Add table to publication
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- =====================================================
-- STEP 3: VERIFY REALTIME IS ENABLED
-- =====================================================

-- Check which tables have realtime enabled
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- =====================================================
-- DONE
-- =====================================================

-- Success message
SELECT 'Realtime enabled for rooms and documents tables!' as message;