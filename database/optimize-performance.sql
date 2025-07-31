-- Performance optimization for participant queries
-- This script adds indexes and optimizes the database for faster participant loading

-- =====================================================
-- STEP 1: ADD MISSING INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Create composite index for room participant queries
CREATE INDEX IF NOT EXISTS idx_rooms_participants 
ON public.rooms(creator_id, invitee_id);

-- Create index for external_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_rooms_external_id 
ON public.rooms(external_id);

-- Create index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON public.profiles(id);

-- Create covering index for room queries with all needed fields
CREATE INDEX IF NOT EXISTS idx_rooms_full_lookup 
ON public.rooms(external_id, creator_id, invitee_id, invitee_name, invitee_email, status);

-- =====================================================
-- STEP 2: CREATE MATERIALIZED VIEW FOR FASTER QUERIES
-- =====================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS room_participants_view;

-- Create materialized view for room participants
CREATE MATERIALIZED VIEW room_participants_view AS
SELECT 
  r.external_id as room_id,
  r.name as room_name,
  r.status as room_status,
  r.created_at as room_created_at,
  r.creator_id,
  cp.email as creator_email,
  cp.full_name as creator_name,
  r.invitee_id,
  r.invitee_email,
  r.invitee_name,
  r.invitee_joined_at
FROM rooms r
LEFT JOIN profiles cp ON r.creator_id = cp.id
WHERE r.creator_id IS NOT NULL;

-- Create index on materialized view
CREATE INDEX idx_room_participants_view_room_id 
ON room_participants_view(room_id);

-- Grant permissions
GRANT SELECT ON room_participants_view TO authenticated;

-- =====================================================
-- STEP 3: CREATE OPTIMIZED FUNCTION FOR ROOM LOADING
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_room_with_participants(UUID);

-- Create optimized function to get room with participants
CREATE OR REPLACE FUNCTION public.get_room_with_participants(room_external_id UUID)
RETURNS TABLE (
  room_data jsonb,
  participants jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH room_info AS (
    SELECT 
      r.*,
      cp.email as creator_email,
      cp.full_name as creator_full_name
    FROM rooms r
    LEFT JOIN profiles cp ON r.creator_id = cp.id
    WHERE r.external_id = room_external_id
  ),
  participants_list AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'userId', COALESCE(participant_id, ''),
        'email', COALESCE(participant_email, ''),
        'name', COALESCE(participant_name, ''),
        'role', participant_role,
        'hasJoined', true,
        'joinedAt', joined_at
      ) ORDER BY participant_role
    ) as participants
    FROM (
      -- Creator
      SELECT 
        ri.creator_id as participant_id,
        ri.creator_email as participant_email,
        COALESCE(ri.creator_full_name, ri.creator_email, 'Room Creator') as participant_name,
        'creator' as participant_role,
        ri.created_at as joined_at
      FROM room_info ri
      WHERE ri.creator_id IS NOT NULL
      
      UNION ALL
      
      -- Invitee
      SELECT 
        ri.invitee_id as participant_id,
        ri.invitee_email as participant_email,
        COALESCE(ri.invitee_name, ri.invitee_email, 'Invitee') as participant_name,
        'signer' as participant_role,
        ri.invitee_joined_at as joined_at
      FROM room_info ri
      WHERE ri.invitee_id IS NOT NULL
    ) p
  )
  SELECT 
    to_jsonb(ri.*) as room_data,
    pl.participants
  FROM room_info ri
  CROSS JOIN participants_list pl;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_room_with_participants(UUID) TO authenticated;

-- =====================================================
-- STEP 4: UPDATE STATISTICS FOR QUERY PLANNER
-- =====================================================

-- Analyze tables to update statistics
ANALYZE public.rooms;
ANALYZE public.profiles;

-- =====================================================
-- STEP 5: CREATE REFRESH FUNCTION FOR MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_room_participants_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY room_participants_view;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_room_participants_view() TO authenticated;

-- =====================================================
-- DONE
-- =====================================================

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Performance optimizations applied successfully!' as message;