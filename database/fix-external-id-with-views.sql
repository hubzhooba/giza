-- Fix external_id column type from UUID to TEXT
-- This version handles views that depend on the columns

-- Step 1: Find and drop all views that depend on external_id columns
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all views that might depend on our tables
    FOR r IN 
        SELECT viewname, schemaname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.viewname);
        RAISE NOTICE 'Dropped view: %.%', r.schemaname, r.viewname;
    END LOOP;
    
    -- Also drop any materialized views
    FOR r IN 
        SELECT matviewname, schemaname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.matviewname);
        RAISE NOTICE 'Dropped materialized view: %.%', r.schemaname, r.matviewname;
    END LOOP;
END $$;

-- Step 2: Now we can safely change the column types
ALTER TABLE rooms 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

ALTER TABLE documents 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

ALTER TABLE signatures 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

ALTER TABLE invoices 
ALTER COLUMN external_id TYPE TEXT USING external_id::TEXT;

-- Step 3: Recreate the documents_with_arweave_status view (if it existed)
CREATE OR REPLACE VIEW documents_with_arweave_status AS
SELECT 
    d.*,
    CASE 
        WHEN d.arweave_id IS NOT NULL THEN 'uploaded'
        ELSE 'pending'
    END as arweave_status
FROM documents d;

-- Step 4: Update/Create the RPC functions
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

-- Step 5: Update join_room_simple to work with TEXT external_id
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,
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

-- Step 6: Create unique constraints and indexes
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_external_id_key;
ALTER TABLE rooms ADD CONSTRAINT rooms_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_rooms_external_id_text ON rooms(external_id);

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_external_id_key;
ALTER TABLE documents ADD CONSTRAINT documents_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_documents_external_id_text ON documents(external_id);

ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_external_id_key;
ALTER TABLE signatures ADD CONSTRAINT signatures_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_signatures_external_id_text ON signatures(external_id);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_external_id_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_external_id_key UNIQUE (external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_external_id_text ON invoices(external_id);

-- Step 7: Grant permissions
GRANT ALL ON documents_with_arweave_status TO authenticated;
GRANT ALL ON documents_with_arweave_status TO anon;
GRANT EXECUTE ON FUNCTION create_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_room TO anon;
GRANT EXECUTE ON FUNCTION join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION join_room_simple TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully changed external_id columns from UUID to TEXT!';
    RAISE NOTICE 'Views have been dropped and recreated.';
    RAISE NOTICE 'This should fix the "operator does not exist: uuid = text" error.';
END $$;