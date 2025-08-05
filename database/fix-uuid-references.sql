-- Fix UUID references between tables
-- This migration handles the mismatch between UUID primary keys and TEXT foreign keys

-- 1. First, check if we need to recreate the foreign key for documents
DO $$
BEGIN
    -- Check if documents.room_id references rooms.id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'documents' 
            AND kcu.column_name = 'room_id'
    ) THEN
        -- Add the foreign key constraint back
        ALTER TABLE documents 
        ADD CONSTRAINT documents_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id);
        
        RAISE NOTICE 'Added foreign key constraint: documents_room_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 2. Create indexes for better performance on wallet lookups
CREATE INDEX IF NOT EXISTS idx_rooms_creator_wallet ON rooms(creator_wallet) WHERE creator_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_creator_id_text ON rooms(creator_id) WHERE creator_id IS NOT NULL;

-- 3. Create a function to handle UUID/TEXT comparisons safely
CREATE OR REPLACE FUNCTION safe_uuid_compare(text_val TEXT, uuid_val UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to cast text to UUID for comparison
    BEGIN
        RETURN text_val::UUID = uuid_val;
    EXCEPTION WHEN invalid_text_representation THEN
        -- If text is not a valid UUID, return false
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Update the RPC function for joining rooms to handle wallet addresses
CREATE OR REPLACE FUNCTION join_room_simple(
    room_external_id TEXT,
    user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    v_room_record RECORD;
BEGIN
    -- Find the room
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

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION join_room_simple TO authenticated;
GRANT EXECUTE ON FUNCTION join_room_simple TO anon;
GRANT EXECUTE ON FUNCTION safe_uuid_compare TO authenticated;
GRANT EXECUTE ON FUNCTION safe_uuid_compare TO anon;

-- 6. Success message
DO $$
BEGIN
    RAISE NOTICE 'UUID reference fixes completed successfully!';
    RAISE NOTICE 'Foreign key relationships restored.';
    RAISE NOTICE 'Wallet address indexes created.';
END $$;