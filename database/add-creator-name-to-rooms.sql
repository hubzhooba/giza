-- Add creator name to rooms table for better performance and access
-- This avoids RLS issues when loading room participants

-- =====================================================
-- STEP 1: ADD CREATOR NAME COLUMNS TO ROOMS TABLE
-- =====================================================

-- Add creator_name and creator_email columns if they don't exist
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS creator_email TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- =====================================================
-- STEP 2: POPULATE EXISTING ROOM CREATOR DATA
-- =====================================================

-- Update existing rooms with creator information
UPDATE public.rooms r
SET 
  creator_email = p.email,
  creator_name = COALESCE(p.full_name, p.email)
FROM public.profiles p
WHERE r.creator_id = p.id
  AND (r.creator_email IS NULL OR r.creator_name IS NULL);

-- =====================================================
-- STEP 3: UPDATE SAVE ROOM FUNCTION
-- =====================================================

-- Update the handle_new_room trigger to include creator info
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS trigger AS $$
BEGIN
  -- Populate creator info from profiles
  SELECT email, COALESCE(full_name, email)
  INTO NEW.creator_email, NEW.creator_name
  FROM profiles
  WHERE id = NEW.creator_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new rooms
DROP TRIGGER IF EXISTS populate_creator_info ON public.rooms;
CREATE TRIGGER populate_creator_info
  BEFORE INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_room();

-- =====================================================
-- STEP 4: CREATE OPTIMIZED ROOM LOADING FUNCTION
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_room_with_all_participants(UUID);

-- Create function that returns room with all participant info
CREATE OR REPLACE FUNCTION public.get_room_with_all_participants(
  room_external_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  room_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', external_id,
    'name', name,
    'creator_id', creator_id,
    'invitee_id', invitee_id,
    'encryption_key', encryption_key,
    'status', status,
    'created_at', created_at,
    'updated_at', updated_at,
    'participants', jsonb_build_array(
      -- Creator participant
      CASE WHEN creator_id IS NOT NULL THEN
        jsonb_build_object(
          'userId', creator_id,
          'email', COALESCE(creator_email, ''),
          'name', COALESCE(creator_name, creator_email, 'Room Creator'),
          'role', 'creator',
          'hasJoined', true,
          'joinedAt', created_at
        )
      END,
      -- Invitee participant
      CASE WHEN invitee_id IS NOT NULL THEN
        jsonb_build_object(
          'userId', invitee_id,
          'email', COALESCE(invitee_email, ''),
          'name', COALESCE(invitee_name, invitee_email, 'Invitee'),
          'role', 'signer',
          'hasJoined', true,
          'joinedAt', invitee_joined_at
        )
      END
    ) - NULL -- Remove null entries
  ) INTO room_data
  FROM rooms
  WHERE external_id = room_external_id
    AND (creator_id = auth.uid() OR invitee_id = auth.uid());
  
  RETURN room_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_room_with_all_participants(UUID) TO authenticated;

-- =====================================================
-- DONE
-- =====================================================

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Creator name columns added to rooms table!' as message;