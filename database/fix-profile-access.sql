-- Fix profile access for room participants
-- This ensures that users can see profile information of other participants in their rooms

-- =====================================================
-- STEP 1: UPDATE PROFILE POLICIES
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows viewing profiles of room participants
CREATE POLICY "Users can view profiles of room participants"
  ON public.profiles FOR SELECT
  USING (
    -- Users can always see their own profile
    auth.uid() = id
    OR
    -- Users can see profiles of people they share rooms with
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE (
        -- User is creator and viewing invitee profile
        (rooms.creator_id = auth.uid() AND rooms.invitee_id = profiles.id)
        OR
        -- User is invitee and viewing creator profile
        (rooms.invitee_id = auth.uid() AND rooms.creator_id = profiles.id)
      )
    )
  );

-- =====================================================
-- STEP 2: CREATE HELPER FUNCTION FOR PROFILE ACCESS
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS can_view_profile(UUID, UUID);

-- Create function to check if user can view another user's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(
  viewer_id UUID,
  profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- User can always view their own profile
  IF viewer_id = profile_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if users share a room
  RETURN EXISTS (
    SELECT 1 FROM public.rooms
    WHERE (
      (creator_id = viewer_id AND invitee_id = profile_id)
      OR
      (invitee_id = viewer_id AND creator_id = profile_id)
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.can_view_profile(UUID, UUID) TO authenticated;

-- =====================================================
-- STEP 3: CREATE OPTIMIZED VIEW FOR ROOM MEMBERS
-- =====================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS room_member_profiles;

-- Create view that shows accessible profiles for room members
CREATE VIEW room_member_profiles AS
SELECT DISTINCT
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  p.updated_at
FROM profiles p
WHERE 
  -- Include own profile
  p.id = auth.uid()
  OR
  -- Include profiles from shared rooms
  EXISTS (
    SELECT 1 FROM rooms r
    WHERE (
      (r.creator_id = auth.uid() AND r.invitee_id = p.id)
      OR
      (r.invitee_id = auth.uid() AND r.creator_id = p.id)
    )
  );

-- Grant permissions
GRANT SELECT ON room_member_profiles TO authenticated;

-- =====================================================
-- STEP 4: UPDATE EXISTING PROFILE DATA
-- =====================================================

-- Ensure all users have profile entries
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  )
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO UPDATE
SET 
  full_name = COALESCE(
    profiles.full_name,
    EXCLUDED.full_name,
    profiles.email
  );

-- =====================================================
-- STEP 5: CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Create index for profile lookups in room context
CREATE INDEX IF NOT EXISTS idx_rooms_participant_lookup 
ON public.rooms(creator_id, invitee_id);

-- =====================================================
-- DONE
-- =====================================================

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Profile access policies updated successfully!' as message;