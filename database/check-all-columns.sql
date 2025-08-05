-- Check all columns in our main tables
-- This helps us understand the actual schema

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('rooms', 'documents', 'signatures', 'invoices')
ORDER BY table_name, ordinal_position;