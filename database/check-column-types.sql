-- Quick check of current column types
-- Run this BEFORE the migration to see current state

SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('rooms', 'documents', 'signatures', 'invoices')
    AND column_name IN ('id', 'external_id', 'creator_id', 'invitee_id', 'room_id')
ORDER BY table_name, column_name;