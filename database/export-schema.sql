-- Export Supabase Database Schema
-- Run this in Supabase SQL Editor to get your current schema

-- 1. Export all table schemas
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || chr(10) ||
    array_to_string(
        array_agg(
            '    ' || column_name || ' ' || data_type || 
            CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
            END ||
            CASE 
                WHEN is_nullable = 'NO' THEN ' NOT NULL'
                ELSE ''
            END ||
            CASE 
                WHEN column_default IS NOT NULL 
                THEN ' DEFAULT ' || column_default
                ELSE ''
            END
        ), ',' || chr(10)
    ) || chr(10) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 2. Export all indexes
SELECT indexdef || ';' as index_statement
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. Export all foreign keys
SELECT 
    'ALTER TABLE ' || nsp.nspname || '.' || cls.relname || 
    ' ADD CONSTRAINT ' || conname || 
    ' FOREIGN KEY (' || 
    pg_get_constraintdef(pg_constraint.oid, true) || ');' as fk_statement
FROM pg_constraint
JOIN pg_class cls ON cls.oid = pg_constraint.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE contype = 'f'
AND nsp.nspname = 'public';

-- 4. Export all RLS policies
SELECT 
    'CREATE POLICY "' || pol.polname || '" ON ' || 
    n.nspname || '.' || c.relname || 
    ' AS ' || 
    CASE pol.polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE 'ALL'
    END ||
    ' FOR ' || 
    CASE pol.polpermissive 
        WHEN true THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END ||
    CASE 
        WHEN pol.polroles = '{0}' THEN ' TO PUBLIC'
        ELSE ''
    END ||
    CASE 
        WHEN pol.polqual IS NOT NULL THEN 
            ' USING (' || pg_get_expr(pol.polqual, pol.polrelid, true) || ')'
        ELSE ''
    END ||
    CASE 
        WHEN pol.polwithcheck IS NOT NULL THEN 
            ' WITH CHECK (' || pg_get_expr(pol.polwithcheck, pol.polrelid, true) || ')'
        ELSE ''
    END || ';' as policy_statement
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;

-- 5. Export RLS status
SELECT 
    'ALTER TABLE ' || schemaname || '.' || tablename || 
    CASE 
        WHEN rowsecurity = true THEN ' ENABLE'
        ELSE ' DISABLE'
    END || ' ROW LEVEL SECURITY;' as rls_statement
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;