-- Show ALL columns in rooms table to find the UUID column
SELECT 
    ordinal_position as pos,
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'rooms'
ORDER BY ordinal_position;