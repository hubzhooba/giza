-- Safe fix for external_id column type
-- This version checks if columns exist before trying to alter them

-- Step 1: Drop only the documents_with_arweave_status view
DROP VIEW IF EXISTS documents_with_arweave_status CASCADE;

-- Step 2: Change external_id columns to TEXT only where they exist
DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check and alter rooms.external_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'external_id'
    ) INTO v_exists;
    
    IF v_exists THEN
        ALTER TABLE rooms 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed rooms.external_id to TEXT';
    END IF;
    
    -- Check and alter documents.external_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'external_id'
    ) INTO v_exists;
    
    IF v_exists THEN
        ALTER TABLE documents 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed documents.external_id to TEXT';
    END IF;
    
    -- Check and alter signatures.external_id (if it exists)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'external_id'
    ) INTO v_exists;
    
    IF v_exists THEN
        ALTER TABLE signatures 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed signatures.external_id to TEXT';
    ELSE
        RAISE NOTICE 'signatures.external_id does not exist - skipping';
    END IF;
    
    -- Check and alter invoices.external_id (if it exists)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'external_id'
    ) INTO v_exists;
    
    IF v_exists THEN
        ALTER TABLE invoices 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed invoices.external_id to TEXT';
    ELSE
        RAISE NOTICE 'invoices.external_id does not exist - skipping';
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

-- Step 6: Create unique constraints only where columns exist
DO $$
BEGIN
    -- Rooms external_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_external_id_key;
        ALTER TABLE rooms ADD CONSTRAINT rooms_external_id_key UNIQUE (external_id);
        CREATE INDEX IF NOT EXISTS idx_rooms_external_id_text ON rooms(external_id);
    END IF;
    
    -- Documents external_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_external_id_key;
        ALTER TABLE documents ADD CONSTRAINT documents_external_id_key UNIQUE (external_id);
        CREATE INDEX IF NOT EXISTS idx_documents_external_id_text ON documents(external_id);
    END IF;
END $$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION create_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_room TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully changed external_id columns to TEXT!';
    RAISE NOTICE '✅ The documents_with_arweave_status view has been recreated.';
    RAISE NOTICE '✅ RPC function create_room has been updated.';
    RAISE NOTICE '✅ Migration completed successfully!';
END $$;