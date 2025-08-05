-- First, let's see what views exist and get their definitions
-- Run this BEFORE the migration to backup view definitions

-- 1. List all views
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 2. Get view definitions (run this for each view found above)
-- Replace 'your_view_name' with actual view names
SELECT pg_get_viewdef('public.documents_with_arweave_status'::regclass, true);

-- 3. List all materialized views
SELECT 
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- 4. Check which columns the views depend on
SELECT DISTINCT
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view,
    source_ns.nspname AS source_schema,
    source_table.relname AS source_table,
    pg_attribute.attname AS column_name
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid AND pg_depend.refobjsubid = pg_attribute.attnum
WHERE dependent_ns.nspname = 'public'
AND source_table.relname IN ('rooms', 'documents', 'signatures', 'invoices')
AND pg_attribute.attname = 'external_id'
ORDER BY dependent_view, source_table;