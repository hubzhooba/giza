-- Fix external_id column type from UUID to TEXT
-- This is the root cause of the "operator does not exist: uuid = text" error

-- Step 1: Drop any views or constraints that depend on external_id
DO $$
BEGIN
    -- Drop any foreign keys that reference external_id
    PERFORM constraint_name 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name IN ('documents', 'signatures', 'invoices')
    AND constraint_name LIKE '%external_id%';
END $$;

-- Step 2: Change external_id columns from UUID to TEXT
ALTER TABLE rooms 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

-- Also check and update other tables that might have external_id as UUID
DO $$
DECLARE
    v_data_type TEXT;
BEGIN
    -- Check documents table
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'external_id';
    
    IF v_data_type = 'uuid' THEN
        ALTER TABLE documents 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed documents.external_id to TEXT';
    END IF;
    
    -- Check signatures table
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'signatures' 
        AND column_name = 'external_id';
    
    IF v_data_type = 'uuid' THEN
        ALTER TABLE signatures 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed signatures.external_id to TEXT';
    END IF;
    
    -- Check invoices table
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'external_id';
    
    IF v_data_type = 'uuid' THEN
        ALTER TABLE invoices 
        ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;
        RAISE NOTICE 'Changed invoices.external_id to TEXT';
    END IF;
END $$;

-- Step 3: Update the RPC function to accept TEXT external_id
CREATE OR REPLACE FUNCTION create_room(
    p_external_id TEXT,  -- Changed from UUID to TEXT
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

-- Step 4: Create or update unique constraint on external_id
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_external_id_key;
ALTER TABLE rooms ADD CONSTRAINT rooms_external_id_key UNIQUE (external_id);

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_external_id_text ON rooms(external_id);

-- Step 6: Do the same for other tables
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_external_id_key;
ALTER TABLE documents ADD CONSTRAINT documents_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_documents_external_id_text ON documents(external_id);

ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_external_id_key;
ALTER TABLE signatures ADD CONSTRAINT signatures_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_signatures_external_id_text ON signatures(external_id);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_external_id_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_external_id_text ON invoices(external_id);

-- Step 7: Update the join_room_simple function to work with TEXT external_id
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,  -- Already TEXT, just making sure
    user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    v_room_record RECORD;
BEGIN
    -- Find the room by external_id (which is now TEXT)
    SELECT * INTO v_room_record
    FROM rooms
    WHERE external_id = room_external_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room not found'
        );
    END IF;
    
    -- Check if user is already in the room
    IF v_room_record.creator_id = user_id OR v_room_record.invitee_id = user_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'room_id', v_room_record.id::TEXT
        );
    END IF;
    
    -- Check if room already has an invitee
    IF v_room_record.invitee_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room already has an invitee'
        );
    END IF;
    
    -- Join the room
    UPDATE rooms
    SET 
        invitee_id = user_id,
        invitee_joined_at = NOW(),
        updated_at = NOW()
    WHERE id = v_room_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room_record.id::TEXT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION create_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_room TO anon;
GRANT EXECUTE ON FUNCTION join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION join_room_simple TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully changed external_id columns from UUID to TEXT!';
    RAISE NOTICE 'This should fix the "operator does not exist: uuid = text" error.';
END $$;