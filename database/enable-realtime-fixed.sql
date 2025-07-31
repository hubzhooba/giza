-- Enable real-time for tables that need it
-- This is required for subscriptions to work

-- =====================================================
-- STEP 1: SAFELY HANDLE PUBLICATION UPDATES
-- =====================================================

-- First, check what tables are currently in the publication
DO $$ 
BEGIN
    -- Remove rooms table if it exists in publication
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE rooms;
    END IF;
    
    -- Remove documents table if it exists in publication
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'documents'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE documents;
    END IF;
END $$;

-- =====================================================
-- STEP 2: ADD TABLES TO REALTIME PUBLICATION
-- =====================================================

-- Add rooms table to enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Add documents table to enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- =====================================================
-- STEP 3: VERIFY REALTIME IS ENABLED
-- =====================================================

-- Check which tables have realtime enabled
SELECT 
  schemaname,
  tablename,
  'Enabled' as realtime_status
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
  AND tablename IN ('rooms', 'documents')
ORDER BY tablename;

-- =====================================================
-- ALTERNATIVE: ENABLE REALTIME VIA SUPABASE UI
-- =====================================================
-- If the above doesn't work, you can enable realtime through Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Find the 'rooms' table
-- 3. Toggle the "Realtime" switch to ON
-- 4. Find the 'documents' table
-- 5. Toggle the "Realtime" switch to ON

-- =====================================================
-- DONE
-- =====================================================

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Realtime configuration completed!';
    RAISE NOTICE 'If you see any errors above, please enable realtime via Supabase Dashboard.';
END $$;