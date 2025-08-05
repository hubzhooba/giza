-- Minimal fix for external_id column type
-- This only drops the specific view that's blocking us

-- Step 1: Drop only the documents_with_arweave_status view
DROP VIEW IF EXISTS documents_with_arweave_status CASCADE;

-- Step 2: Change external_id columns to TEXT
ALTER TABLE rooms 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

ALTER TABLE documents 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

-- Check if these tables exist before altering
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signatures') THEN
        ALTER TABLE signatures 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
    END IF;
END $$;

-- Step 3: Recreate the documents_with_arweave_status view
CREATE VIEW documents_with_arweave_status AS
SELECT 
    d.*,
    CASE 
        WHEN d.arweave_id IS NOT NULL THEN 'uploaded'
        ELSE 'pending'
    END as arweave_status
FROM documents d;

-- Step 4: Grant permissions on the view
GRANT SELECT ON documents_with_arweave_status TO authenticated;
GRANT SELECT ON documents_with_arweave_status TO anon;

-- Step 5: Create or replace the RPC function
CREATE OR REPLACE FUNCTION create_room(
    p_external_id TEXT,
    p_name TEXT,
    p_encryption_key TEXT,
    p_creator_id TEXT,
    p_creator_email TEXT,
    p_creator_name TEXT,
    p_creator_wallet TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_room_id UUID;
BEGIN
    INSERT INTO rooms (
        external_id,
        name,
        encryption_key,
        creator_id,
        creator_email,
        creator_name,
        creator_wallet,
        description,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_external_id,
        p_name,
        p_encryption_key,
        p_creator_id,
        p_creator_email,
        p_creator_name,
        p_creator_wallet,
        p_description,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_room_id;
    
    RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION create_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_room TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully changed external_id columns to TEXT!';
    RAISE NOTICE 'The documents_with_arweave_status view has been recreated.';
END $$;