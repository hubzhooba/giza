-- Export Supabase Database Schema
-- Run each section separately in Supabase SQL Editor

-- 1. Export table definitions
SELECT 
    'CREATE TABLE ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar' || '(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'char' || '(' || character_maximum_length || ')'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 2. Export indexes
SELECT indexdef || ';' 
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. Export foreign keys
SELECT 
    'ALTER TABLE ' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || kcu.column_name || ')' ||
    ' REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ');'
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';

-- 4. Export RLS policies
SELECT 
    'CREATE POLICY "' || polname || '" ON ' || 
    schemaname || '.' || tablename || 
    ' FOR ' || 
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        ELSE 'ALL'
    END ||
    CASE 
        WHEN polqual IS NOT NULL THEN 
            ' USING (' || pg_get_expr(polqual::pg_node_tree, polrelid) || ')'
        ELSE ''
    END ||
    CASE 
        WHEN polwithcheck IS NOT NULL THEN 
            ' WITH CHECK (' || pg_get_expr(polwithcheck::pg_node_tree, polrelid) || ')'
        ELSE ''
    END || ';'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Export RLS status
SELECT 
    'ALTER TABLE ' || schemaname || '.' || tablename || 
    CASE 
        WHEN rowsecurity THEN ' ENABLE'
        ELSE ' DISABLE'
    END || ' ROW LEVEL SECURITY;'
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;